import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { renderReactToHtml } from '../services/react-renderer.js';
import { ValidationError } from '../lib/errors.js';

describe('React renderer (kill switch)', () => {
  it('throws ValidationError when DECKLE_DISABLE_REACT_RENDERER=true', () => {
    const prev = process.env.DECKLE_DISABLE_REACT_RENDERER;
    process.env.DECKLE_DISABLE_REACT_RENDERER = 'true';
    try {
      const source = `export default function Hello() { return <div>hi</div>; }`;
      expect(() => renderReactToHtml(source)).toThrow(ValidationError);
      expect(() => renderReactToHtml(source)).toThrow(/disabled by configuration/);
    } finally {
      if (prev === undefined) delete process.env.DECKLE_DISABLE_REACT_RENDERER;
      else process.env.DECKLE_DISABLE_REACT_RENDERER = prev;
    }
  });
});

describe('React renderer (isolated-vm sandbox)', () => {
  beforeAll(() => {
    // Ensure kill switch is off so the sandbox runs.
    delete process.env.DECKLE_DISABLE_REACT_RENDERER;
  });
  afterAll(() => {
    delete process.env.DECKLE_DISABLE_REACT_RENDERER;
  });

  it('renders a valid component to HTML', () => {
    const source = `
      export default function Hello() {
        return <div><h1>Hello World</h1></div>;
      }
    `;
    const html = renderReactToHtml(source);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<h1>Hello World</h1>');
  });

  it('passes props to the component', () => {
    const source = `
      export default function Greet({ name }) {
        return <p>Hello, {name}!</p>;
      }
    `;
    const html = renderReactToHtml(source, { name: 'Alice' });
    expect(html).toContain('Hello, Alice!');
  });

  it('renders nested components', () => {
    const source = `
      function Item({ text }) {
        return <li>{text}</li>;
      }
      export default function List() {
        return <ul><Item text="A" /><Item text="B" /></ul>;
      }
    `;
    const html = renderReactToHtml(source);
    expect(html).toContain('<li>A</li>');
    expect(html).toContain('<li>B</li>');
  });

  it('includes custom styles when provided', () => {
    const source = `
      export default function Doc() {
        return <div>Content</div>;
      }
    `;
    const html = renderReactToHtml(source, {}, '.custom { color: red; }');
    expect(html).toContain('.custom { color: red; }');
  });

  it('throws ValidationError when source exceeds 1MB', () => {
    const source = 'x'.repeat(1_048_577);
    expect(() => renderReactToHtml(source)).toThrow(ValidationError);
    expect(() => renderReactToHtml(source)).toThrow(/exceeds 1MB/);
  });

  it('throws ValidationError when default export is not a function', () => {
    const source = `module.exports.default = "not a function";`;
    expect(() => renderReactToHtml(source)).toThrow(ValidationError);
  });

  it('throws ValidationError when nothing is exported', () => {
    const source = `const x = 42; /* no export */`;
    expect(() => renderReactToHtml(source)).toThrow(ValidationError);
  });

  it('renders component with array map', () => {
    const source = `
      export default function Items({ items }) {
        return (
          <ul>
            {items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        );
      }
    `;
    const html = renderReactToHtml(source, { items: ['one', 'two', 'three'] });
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('<li>two</li>');
    expect(html).toContain('<li>three</li>');
  });

  it('wraps output in a full HTML document', () => {
    const source = `
      export default function Doc() {
        return <p>content</p>;
      }
    `;
    const html = renderReactToHtml(source);
    expect(html).toContain('<html>');
    expect(html).toContain('<head>');
    expect(html).toContain('<body>');
    expect(html).toContain('</html>');
  });
});

describe('React renderer sandbox isolation', () => {
  beforeAll(() => {
    delete process.env.DECKLE_DISABLE_REACT_RENDERER;
  });

  it('process is undefined inside the isolate', () => {
    const source = `
      export default function Test() {
        return <div>{typeof process}</div>;
      }
    `;
    const html = renderReactToHtml(source);
    expect(html).toContain('<div>undefined</div>');
  });

  it('require is undefined at the global level (only the require shim, injected by the wrapper, is visible)', () => {
    const source = `
      // Outside the module IIFE, the global "require" is absent.
      // The component-scope "require" is the shim, which only allows react.
      export default function Test() {
        return <div>{typeof globalThis.require}</div>;
      }
    `;
    const html = renderReactToHtml(source);
    expect(html).toContain('<div>undefined</div>');
  });

  it('Buffer is undefined', () => {
    const source = `
      export default function Test() {
        return <div>{typeof Buffer}</div>;
      }
    `;
    const html = renderReactToHtml(source);
    expect(html).toContain('<div>undefined</div>');
  });

  it('setTimeout / setInterval / setImmediate are undefined', () => {
    const source = `
      export default function Test() {
        return <div>{typeof setTimeout}/{typeof setInterval}/{typeof setImmediate}</div>;
      }
    `;
    const html = renderReactToHtml(source);
    expect(html).toContain('undefined/undefined/undefined');
  });

  it("require('fs') throws", () => {
    const source = `
      const fs = require('fs');
      export default function Test() {
        return <div>test</div>;
      }
    `;
    expect(() => renderReactToHtml(source)).toThrow();
  });

  it("require('child_process') throws", () => {
    const source = `
      const cp = require('child_process');
      export default function Test() {
        return <div>test</div>;
      }
    `;
    expect(() => renderReactToHtml(source)).toThrow();
  });

  it("require('react') still works inside the sandbox", () => {
    const source = `
      const React = require('react');
      export default function Test() {
        return React.createElement('span', null, 'works');
      }
    `;
    const html = renderReactToHtml(source);
    expect(html).toContain('<span>works</span>');
  });

  it('constructor.constructor escape attempt is blocked', () => {
    // Classic vm-sandbox escape: reach the outer Function constructor via
    // an inner object's prototype chain. In a real isolate `process`
    // does not exist anywhere, so even if the constructor returns,
    // there's nothing to reach.
    const source = `
      export default function Test() {
        let stolen = 'none';
        try {
          stolen = String(({}).constructor.constructor('return typeof process')());
        } catch (e) {
          stolen = 'threw: ' + (e && e.message ? e.message : 'unknown');
        }
        return <div>{stolen}</div>;
      }
    `;
    const html = renderReactToHtml(source);
    // Either the eval threw ReferenceError, or it returned 'undefined'.
    // Both prove `process` is not reachable.
    expect(html).toMatch(/undefined|threw:/);
  });

  it('infinite loop is killed by the render timeout', () => {
    const source = `
      export default function Test() {
        while (true) {}
        return <div>never</div>;
      }
    `;
    // isolated-vm raises an Error("Script execution timed out.") which
    // we surface as a ValidationError.
    expect(() => renderReactToHtml(source)).toThrow(ValidationError);
  }, 10_000);
});
