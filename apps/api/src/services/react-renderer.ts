/**
 * React-to-HTML renderer (isolated-vm sandbox).
 *
 * User-supplied JSX/TSX is transpiled on the host, then evaluated
 * inside a real V8 isolate via `isolated-vm`. Unlike Node's `vm`
 * module — which is explicitly NOT a security boundary — an isolate
 * has its own V8 heap and no reference to the host process: user
 * code cannot reach `process`, `require`, the filesystem, the
 * network, or any other host object.
 *
 * Pipeline per render:
 *   1. Transpile JSX/TSX with esbuild (host, trusted)
 *   2. Build wrapper script: polyfills + React/ReactDOMServer bundle
 *      (cached) + user module IIFE + render call
 *   3. Create isolate (128MB cap), inject `__props` via ExternalCopy,
 *      compile + run with a 5s timeout, return the HTML string
 *   4. Dispose the isolate
 *
 * Kill switch: `DECKLE_DISABLE_REACT_RENDERER=true` returns a
 * `ValidationError` before any isolate work happens.
 */
import { buildSync, transformSync } from 'esbuild';
import ivm from 'isolated-vm';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ValidationError } from '../lib/errors.js';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));

const MAX_SOURCE_BYTES = 1_048_576;
const RENDER_TIMEOUT_MS = 5_000;
const ISOLATE_MEMORY_MB = 128;

function rendererDisabled(): boolean {
  return process.env.DECKLE_DISABLE_REACT_RENDERER === 'true';
}

// Minimal globals React 18's renderer touches but that aren't part of
// a bare V8 isolate. `TextEncoder` is required by react-dom/server.browser;
// the rest are stubbed because React calls them defensively.
const POLYFILL_SCRIPT = `
class TextEncoder {
  encode(input) {
    const str = String(input == null ? '' : input);
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 0x80) bytes.push(c);
      else if (c < 0x800) bytes.push(0xC0|(c>>6), 0x80|(c&0x3F));
      else if (c >= 0xD800 && c < 0xDC00 && i + 1 < str.length) {
        const c2 = str.charCodeAt(++i);
        c = 0x10000 + ((c & 0x3FF) << 10) + (c2 & 0x3FF);
        bytes.push(0xF0|(c>>18), 0x80|((c>>12)&0x3F), 0x80|((c>>6)&0x3F), 0x80|(c&0x3F));
      } else bytes.push(0xE0|(c>>12), 0x80|((c>>6)&0x3F), 0x80|(c&0x3F));
    }
    return new Uint8Array(bytes);
  }
}
globalThis.TextEncoder = TextEncoder;
globalThis.console = { log(){}, warn(){}, error(){}, info(){}, debug(){}, trace(){} };
globalThis.queueMicrotask = function(fn) { Promise.resolve().then(fn); };
`;

let cachedReactBundle: string | null = null;

function getReactBundle(): string {
  if (cachedReactBundle) return cachedReactBundle;
  const result = buildSync({
    stdin: {
      contents:
        "const React = require('react');" +
        "const { renderToStaticMarkup } = require('react-dom/server.browser');" +
        'globalThis.__DF_REACT__ = React;' +
        'globalThis.__DF_RENDER__ = renderToStaticMarkup;',
      loader: 'js',
      resolveDir: MODULE_DIR,
    },
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: 'es2020',
    write: false,
    minify: true,
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  cachedReactBundle = result.outputFiles[0].text;
  return cachedReactBundle;
}

function transpileUserSource(source: string): string {
  return transformSync(source, {
    loader: 'tsx',
    format: 'cjs',
    jsx: 'transform',
    jsxFactory: '__DF_REACT__.createElement',
    jsxFragment: '__DF_REACT__.Fragment',
    target: 'es2020',
  }).code;
}

export function renderReactToHtml(
  componentSource: string,
  props: Record<string, unknown> = {},
  styles?: string,
): string {
  if (rendererDisabled()) {
    throw new ValidationError(
      'React rendering is currently disabled by configuration. Use the `html` or `template` input mode instead.',
    );
  }
  if (componentSource.length > MAX_SOURCE_BYTES) {
    throw new ValidationError(
      'React component source exceeds 1MB. Move large data into the `data` field instead of embedding it in the JSX.',
    );
  }

  let isolate: ivm.Isolate | null = null;
  try {
    const transpiled = transpileUserSource(componentSource);
    const reactBundle = getReactBundle();

    const wrapper =
      POLYFILL_SCRIPT +
      ';\n' +
      reactBundle +
      ';\n' +
      '(function () {\n' +
      '  var __mod = { exports: {} };\n' +
      '  (function (module, exports, require) {\n' +
      transpiled +
      '\n  })(__mod, __mod.exports, function (id) {\n' +
      '    if (id === "react" || id === "react/jsx-runtime" || id === "react/jsx-dev-runtime") return __DF_REACT__;\n' +
      '    throw new Error("Cannot require " + JSON.stringify(id) + " in React component sandbox. Only react is available.");\n' +
      '  });\n' +
      '  var Component = __mod.exports.default || __mod.exports;\n' +
      '  if (typeof Component !== "function") {\n' +
      '    throw new Error("React component must export a default function. Example: export default function MyDoc(props) { return <div>...</div>; }");\n' +
      '  }\n' +
      '  return __DF_RENDER__(__DF_REACT__.createElement(Component, __props));\n' +
      '})()';

    isolate = new ivm.Isolate({ memoryLimit: ISOLATE_MEMORY_MB });
    const context = isolate.createContextSync();
    const jail = context.global;
    jail.setSync('global', jail.derefInto());
    jail.setSync('__props', new ivm.ExternalCopy(props).copyInto({ release: true }));

    const script = isolate.compileScriptSync(wrapper);
    const bodyHtml = script.runSync(context, { timeout: RENDER_TIMEOUT_MS });
    if (typeof bodyHtml !== 'string') {
      throw new ValidationError('React component did not return renderable HTML.');
    }

    return wrapHtmlDocument(bodyHtml, styles);
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    const safeMsg =
      process.env.NODE_ENV === 'production'
        ? 'Failed to render the React component. Check for syntax errors or unsupported APIs (no useState/useEffect — render output must be static).'
        : `Failed to render React component: ${msg}`;
    throw new ValidationError(safeMsg);
  } finally {
    if (isolate) {
      try {
        isolate.dispose();
      } catch {
        // already disposed (e.g., on memory-limit kill)
      }
    }
  }
}

function wrapHtmlDocument(body: string, styles?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; }
  ${styles || ''}
</style>
</head>
<body>${body}</body>
</html>`;
}
