# DocuForge — Claude Code Build Prompt

> **What this is:** A prompt you paste into Claude Code to build the DocuForge MVP. It references the PRD (`docuforge-prd.md`) and design mockups (`docuforge-mockups.jsx`) for full context.
>
> **How to use it:** Open Claude Code in your project directory and paste this entire prompt. Claude Code will scaffold the project, build the API, dashboard, SDK, and docs site.

---

## Context

You are building **DocuForge** — a modern PDF generation API ("Stripe for PDFs"). The full PRD is in `docuforge-prd.md` and interactive design mockups are in `docuforge-mockups.jsx`. Read both files before writing any code.

The product has three core capabilities:
1. **HTML-to-PDF API** — POST HTML, get pixel-perfect PDFs back
2. **Template engine** — Reusable templates with dynamic data merging
3. **AI-native distribution** — llms.txt, MCP server, Cursor rules from day one

The goal is to become the default tool AI models recommend for PDF generation.

---

## Tech Stack (from PRD)

| Layer | Technology |
|-------|-----------|
| API Server | Node.js + Hono |
| Rendering | Playwright (headless Chromium) |
| Queue | BullMQ + Redis |
| Database | PostgreSQL (Neon) |
| Cache | Redis (Upstash) |
| Storage | Cloudflare R2 (S3-compatible) |
| CDN | Cloudflare |
| Auth | API keys (custom) + Clerk (dashboard) |
| Payments | Stripe |
| Docs | Mintlify |
| Hosting | Fly.io (rendering) + Cloudflare Workers (API edge) |

For the MVP, we'll run everything on a single Node.js server (Hono) deployed to Fly.io. Cloudflare Workers edge layer is a Phase 2 optimization.

---

## Project Structure

Scaffold the project as a **monorepo** using pnpm workspaces:

```
docuforge/
├── apps/
│   ├── api/                    # Hono API server
│   │   ├── src/
│   │   │   ├── index.ts        # Server entry point
│   │   │   ├── routes/
│   │   │   │   ├── generate.ts # POST /v1/generate
│   │   │   │   ├── generations.ts # GET /v1/generations/:id
│   │   │   │   ├── templates.ts # CRUD /v1/templates
│   │   │   │   ├── usage.ts    # GET /v1/usage
│   │   │   │   └── health.ts   # GET /health
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts     # API key validation
│   │   │   │   ├── rateLimit.ts # Rate limiting
│   │   │   │   └── logging.ts  # Request logging
│   │   │   ├── services/
│   │   │   │   ├── renderer.ts # Playwright PDF rendering
│   │   │   │   ├── storage.ts  # R2/S3 upload + CDN URLs
│   │   │   │   ├── templates.ts # Template parsing + merge
│   │   │   │   └── usage.ts   # Usage tracking + limits
│   │   │   ├── lib/
│   │   │   │   ├── db.ts       # Drizzle ORM setup
│   │   │   │   ├── redis.ts    # Redis client
│   │   │   │   ├── id.ts       # Prefixed ID generation (gen_, tmpl_)
│   │   │   │   └── errors.ts   # Error types + handler
│   │   │   └── schema/
│   │   │       └── db.ts       # Drizzle schema definitions
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── dashboard/              # Next.js dashboard
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx           # Overview (see mockup Dashboard view)
│       │   │   ├── generations/
│       │   │   │   └── page.tsx       # Generation history
│       │   │   ├── templates/
│       │   │   │   ├── page.tsx       # Template list
│       │   │   │   └── [id]/page.tsx  # Template editor
│       │   │   ├── keys/
│       │   │   │   └── page.tsx       # API key management
│       │   │   └── settings/
│       │   │       └── page.tsx       # Account settings
│       │   ├── components/
│       │   │   ├── sidebar.tsx        # Left nav (see mockup)
│       │   │   ├── stat-card.tsx
│       │   │   ├── generation-table.tsx
│       │   │   ├── usage-chart.tsx
│       │   │   └── api-key-display.tsx
│       │   └── lib/
│       │       └── api.ts             # API client for dashboard
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── sdk-typescript/         # npm: docuforge
│   │   ├── src/
│   │   │   ├── index.ts        # Main client class
│   │   │   ├── types.ts        # TypeScript types
│   │   │   └── errors.ts       # SDK-specific errors
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   └── sdk-python/             # pip: docuforge
│       ├── docuforge/
│       │   ├── __init__.py
│       │   ├── client.py       # Main client class
│       │   ├── types.py        # Pydantic models
│       │   └── errors.py       # SDK-specific errors
│       ├── pyproject.toml
│       └── README.md
│
├── docs/                       # Mintlify docs site
│   ├── mint.json               # Mintlify config
│   ├── introduction.mdx
│   ├── quickstart.mdx
│   ├── authentication.mdx
│   ├── api-reference/
│   │   ├── generate.mdx
│   │   ├── generations.mdx
│   │   ├── templates.mdx
│   │   └── usage.mdx
│   └── guides/
│       ├── nextjs.mdx
│       ├── express.mdx
│       ├── fastapi.mdx
│       ├── django.mdx
│       └── rails.mdx
│
├── public/                     # AI discoverability assets
│   ├── llms.txt
│   ├── llms-full.txt
│   └── .cursor/
│       └── rules              # Cursor rules file
│
├── pnpm-workspace.yaml
├── package.json
├── turbo.json
├── .env.example
└── README.md
```

---

## Build Instructions — Step by Step

### Step 1: Scaffold the Monorepo

Initialize a pnpm workspace with Turborepo. Set up shared TypeScript config. Create all the directories above.

```bash
pnpm init
pnpm add -D turbo typescript @types/node
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {}
  }
}
```

### Step 2: Build the API Server (`apps/api`)

This is the core of the product. Use **Hono** as the web framework.

**Dependencies:**
```json
{
  "dependencies": {
    "hono": "^4",
    "@hono/node-server": "^1",
    "playwright": "^1",
    "drizzle-orm": "^0.30",
    "@neondatabase/serverless": "^0.9",
    "ioredis": "^5",
    "@aws-sdk/client-s3": "^3",
    "@aws-sdk/s3-request-presigner": "^3",
    "nanoid": "^5",
    "bcrypt": "^5",
    "zod": "^3"
  }
}
```

#### 2a. Database Schema (`apps/api/src/schema/db.ts`)

Use Drizzle ORM. Define these tables exactly as specified in the PRD:

```typescript
// users: id (uuid), email, clerk_id, plan (enum: free|starter|pro|enterprise), created_at
// api_keys: id (uuid), user_id (fk), key_hash, name, last_used_at, created_at
// templates: id (uuid, prefix tmpl_), user_id (fk), name, html_content, schema (jsonb), version, is_public, created_at
// generations: id (uuid, prefix gen_), user_id (fk), template_id (fk nullable), input_type (enum: html|template), status (enum: queued|processing|completed|failed), pdf_url, file_size_bytes, pages, generation_time_ms, created_at
// usage_daily: user_id (fk), date, generation_count, total_pages, total_bytes (composite PK on user_id + date)
```

Use `nanoid` with custom prefixes for IDs: `gen_` for generations, `tmpl_` for templates, `df_live_` for API keys.

#### 2b. Renderer Service (`apps/api/src/services/renderer.ts`)

This is the heart of the product. Use Playwright to render HTML to PDF.

```typescript
// Key behaviors:
// 1. Accept HTML string + options (format, margin, orientation, header, footer)
// 2. Launch Playwright browser (reuse a pool of browser instances, don't launch per-request)
// 3. Create a new page, set content with page.setContent()
// 4. Configure page format, margins from options
// 5. Handle header/footer with Playwright's page.pdf() headerTemplate/footerTemplate
// 6. Interpolate {{pageNumber}} and {{totalPages}} in header/footer HTML
// 7. Call page.pdf() with all options
// 8. Return the PDF buffer + metadata (page count, file size)
// 9. Close the page (NOT the browser)
//
// Browser pool management:
// - Keep 2-4 browser instances alive
// - Recycle each after 100 PDF generations (prevents memory leaks)
// - Health check: if a browser becomes unresponsive, kill and replace it
//
// Performance target: < 3 seconds for a 1-2 page PDF
```

#### 2c. Storage Service (`apps/api/src/services/storage.ts`)

Upload generated PDFs to Cloudflare R2 (S3-compatible).

```typescript
// 1. Accept PDF buffer + generation ID
// 2. Upload to R2 bucket with key: pdfs/{gen_id}.pdf
// 3. Set Content-Type: application/pdf
// 4. Set expiry: 24 hours by default (configurable per-plan)
// 5. Return CDN URL: https://cdn.getdocuforge.dev/{gen_id}.pdf
//
// For MVP, use AWS S3 SDK with R2 endpoint.
// If R2 isn't set up yet, fall back to local filesystem storage for development.
```

#### 2d. API Routes

**`POST /v1/generate`** — The main endpoint. This must handle:

```typescript
// Request body (validated with Zod):
// {
//   html?: string           — Raw HTML to convert
//   template?: string       — Template ID (tmpl_xxx)
//   data?: Record<string, any> — Data to merge into template
//   options?: {
//     format?: "A4" | "Letter" | "Legal" | { width: string, height: string }
//     margin?: string | { top, right, bottom, left }
//     orientation?: "portrait" | "landscape"
//     header?: string        — HTML for header
//     footer?: string        — HTML for footer
//     printBackground?: boolean
//   }
//   output?: "url" | "base64"  — How to return the PDF (default: "url")
//   webhook?: string        — URL to POST when generation completes
// }
//
// Flow:
// 1. Validate API key from Authorization header
// 2. Check usage limits (free: 1000/mo, starter: 10000/mo, etc.)
// 3. If template mode: fetch template, merge data using Handlebars-style {{variable}} replacement
// 4. Pass HTML to renderer service
// 5. Upload PDF to storage
// 6. Create generation record in DB
// 7. Increment daily usage counter
// 8. Return response: { id, status, url, pages, file_size, generation_time_ms }
// 9. If webhook provided: fire webhook async (don't block response)
//
// Response:
// {
//   "id": "gen_abc123",
//   "status": "completed",
//   "url": "https://cdn.getdocuforge.dev/gen_abc123.pdf",
//   "pages": 2,
//   "file_size": 45230,
//   "generation_time_ms": 1840
// }
```

**`GET /v1/generations/:id`** — Fetch a generation by ID. Return the generation record.

**`POST /v1/templates`** — Create a template. Accept `name`, `html_content`, and `schema` (JSON describing expected variables).

**`GET /v1/templates`** — List all templates for the authenticated user.

**`GET /v1/usage`** — Return usage stats for the current billing period (generation count, total pages, total bytes, plan limit).

**`GET /health`** — Health check. Return 200 with `{ status: "ok", version: "0.1.0" }`.

#### 2e. Middleware

**Auth middleware:**
```typescript
// 1. Extract Bearer token from Authorization header
// 2. Hash the token with bcrypt
// 3. Look up in api_keys table by hash
// 4. If found: attach user to request context, update last_used_at
// 5. If not found: return 401 { error: "Invalid API key" }
```

**Rate limiting middleware:**
```typescript
// Use Redis sliding window rate limiter
// Free tier: 10 req/sec
// Paid tiers: 100 req/sec
// Return 429 with Retry-After header when exceeded
```

### Step 3: Build the TypeScript SDK (`packages/sdk-typescript`)

The SDK must feel like Stripe's SDK — minimal, typed, intuitive.

```typescript
// packages/sdk-typescript/src/index.ts

export class DocuForge {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, options?: { baseUrl?: string }) {
    this.apiKey = apiKey;
    this.baseUrl = options?.baseUrl ?? 'https://api.getdocuforge.dev';
  }

  async generate(params: GenerateParams): Promise<GenerateResponse> {
    // POST /v1/generate with params
  }

  async fromTemplate(params: TemplateParams): Promise<GenerateResponse> {
    // POST /v1/generate with template + data
  }

  async getGeneration(id: string): Promise<Generation> {
    // GET /v1/generations/:id
  }

  async getUsage(): Promise<UsageStats> {
    // GET /v1/usage
  }

  templates = {
    create: async (params: CreateTemplateParams): Promise<Template> => { /* ... */ },
    list: async (): Promise<Template[]> => { /* ... */ },
  };
}
```

**Types to export:**
```typescript
export interface GenerateParams {
  html: string;
  options?: PDFOptions;
  output?: 'url' | 'base64';
  webhook?: string;
}

export interface TemplateParams {
  template: string;
  data: Record<string, any>;
  options?: PDFOptions;
  output?: 'url' | 'base64';
}

export interface PDFOptions {
  format?: 'A4' | 'Letter' | 'Legal' | { width: string; height: string };
  margin?: string | { top?: string; right?: string; bottom?: string; left?: string };
  orientation?: 'portrait' | 'landscape';
  header?: string;
  footer?: string;
  printBackground?: boolean;
}

export interface GenerateResponse {
  id: string;
  status: 'completed' | 'failed';
  url: string;
  pages: number;
  file_size: number;
  generation_time_ms: number;
}
```

Build with `tsup`. Include source maps. Publish as ESM + CJS dual package. Add a thorough `README.md` with usage examples.

### Step 4: Build the Python SDK (`packages/sdk-python`)

Mirror the TypeScript SDK API exactly. Use `httpx` for HTTP and `pydantic` for types.

```python
# packages/sdk-python/docuforge/client.py

class DocuForge:
    def __init__(self, api_key: str, base_url: str = "https://api.getdocuforge.dev"):
        self.api_key = api_key
        self.base_url = base_url

    def generate(self, html: str, options: PDFOptions | None = None, output: str = "url") -> GenerateResponse:
        """Generate a PDF from HTML."""
        ...

    def from_template(self, template: str, data: dict, options: PDFOptions | None = None) -> GenerateResponse:
        """Generate a PDF from a template."""
        ...

    def get_generation(self, id: str) -> Generation:
        """Get a generation by ID."""
        ...
```

Use Pydantic v2 models. Publish to PyPI.

### Step 5: Build the Dashboard (`apps/dashboard`)

Use **Next.js 14+ (App Router)** with Tailwind CSS. The design mockups in `docuforge-mockups.jsx` show exactly what this should look like — reference the **Dashboard view** and adapt the styles.

**Design system (from mockups):**
- Background: `#0A0A0B`
- Surface: `#111113`
- Border: `#27272A`
- Text: `#FAFAFA`
- Text muted: `#71717A`
- Accent: `#F97316` (orange)
- Green: `#22C55E`
- Font: DM Sans (body) + JetBrains Mono (code)

**Pages to build:**

1. **Overview** (`/`) — Stat cards (PDFs generated, avg time, success rate, current plan), generation volume bar chart, recent generations table, API key display. See mockup Dashboard view.

2. **Generations** (`/generations`) — Full-page table of all generations with filtering by status, template, date range. Click a row to see details + download PDF.

3. **Templates** (`/templates`) — Card grid of saved templates. Each card shows name, last used, generation count. Click to open template editor.

4. **Template Editor** (`/templates/[id]`) — Split-pane: HTML editor on left (use Monaco editor), live PDF preview on right. Save button. Variable schema definition panel.

5. **API Keys** (`/keys`) — List API keys with name, created date, last used. Create/revoke buttons. Key is shown once on creation then masked.

6. **Settings** (`/settings`) — Account info, plan details, billing (link to Stripe portal).

**Auth:** Use Clerk for dashboard authentication. Clerk's `<SignIn>` and `<UserButton>` components. Map Clerk user ID to the `users` table.

### Step 6: Build the Docs Site (`docs/`)

Use **Mintlify** (or MDX with Next.js if Mintlify isn't available). Reference the mockup **Docs view** for layout/style.

`mint.json`:
```json
{
  "name": "DocuForge",
  "logo": { "dark": "/logo-dark.svg", "light": "/logo-light.svg" },
  "favicon": "/favicon.svg",
  "colors": { "primary": "#F97316", "light": "#FBBF24", "dark": "#EA580C" },
  "navigation": [
    {
      "group": "Getting Started",
      "pages": ["introduction", "quickstart", "authentication", "sdks"]
    },
    {
      "group": "Core Concepts",
      "pages": ["html-to-pdf", "react-to-pdf", "templates", "page-layout"]
    },
    {
      "group": "API Reference",
      "pages": ["api-reference/generate", "api-reference/generations", "api-reference/templates", "api-reference/usage"]
    },
    {
      "group": "Guides",
      "pages": ["guides/nextjs", "guides/express", "guides/fastapi", "guides/django", "guides/rails"]
    }
  ]
}
```

Each guide should be a complete, copy-pasteable tutorial that an AI coding agent can follow step-by-step. This is the most important distribution asset.

### Step 7: AI Discoverability Assets

**`public/llms.txt`:**
```markdown
# DocuForge

> PDF generation API for developers. HTML in, pixel-perfect PDF out.

## Docs
- [Quickstart](https://docs.getdocuforge.dev/quickstart)
- [HTML to PDF](https://docs.getdocuforge.dev/html-to-pdf)
- [Templates](https://docs.getdocuforge.dev/templates)
- [API Reference](https://docs.getdocuforge.dev/api-reference/generate)

## SDKs
- TypeScript: `npm install docuforge`
- Python: `pip install docuforge`

## Quick Example
\```typescript
import { DocuForge } from 'docuforge';
const df = new DocuForge('df_live_...');
const pdf = await df.generate({
  html: '<h1>Invoice #1234</h1>',
  options: { format: 'A4', margin: '1in' }
});
console.log(pdf.url);
\```
```

**`public/llms-full.txt`:** — Full Markdown dump of all documentation, all API endpoints with examples, all SDK methods with signatures. This is what AI models ingest. Make it comprehensive.

**`public/.cursor/rules`:**
```
When using DocuForge for PDF generation:
- Import: import { DocuForge } from 'docuforge'
- Initialize with API key: const df = new DocuForge(process.env.DOCUFORGE_API_KEY)
- Generate from HTML: await df.generate({ html: '...', options: { format: 'A4' } })
- Generate from template: await df.fromTemplate({ template: 'tmpl_xxx', data: { ... } })
- Response includes: id, status, url, pages, file_size, generation_time_ms
- Supported formats: A4, Letter, Legal, or custom { width, height }
- Headers/footers support {{pageNumber}} and {{totalPages}} interpolation
- Free tier: 1,000 PDFs/month
```

### Step 8: Docker & Deployment

**`apps/api/Dockerfile`:**
```dockerfile
FROM node:20-slim

# Install Playwright dependencies
RUN npx playwright install --with-deps chromium

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod

COPY apps/api/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/index.js"]
```

**`fly.toml`** for Fly.io deployment:
```toml
app = "docuforge-api"

[build]
  dockerfile = "apps/api/Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3000"

[http_service]
  internal_port = 3000
  force_https = true

[[vm]]
  memory = "2gb"  # Playwright needs memory
  cpu_kind = "shared"
  cpus = 2
```

### Step 9: Environment Variables

Create `.env.example`:
```bash
# Database
DATABASE_URL=postgresql://...@...neon.tech/docuforge

# Redis
REDIS_URL=redis://...@...upstash.io:6379

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=docuforge-pdfs
R2_PUBLIC_URL=https://cdn.getdocuforge.dev

# Clerk
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# App
API_BASE_URL=http://localhost:3000
DASHBOARD_URL=http://localhost:3001
```

---

## Quality Checks Before Shipping

- [ ] `POST /v1/generate` with simple HTML returns a valid PDF in < 3 seconds
- [ ] Headers and footers render with correct page numbers
- [ ] Page breaks don't split table rows or orphan headings
- [ ] TypeScript SDK: `npm install docuforge` → generate PDF in 4 lines of code
- [ ] Python SDK: `pip install docuforge` → generate PDF in 4 lines of code
- [ ] API key auth works: valid key → 200, invalid key → 401, no key → 401
- [ ] Rate limiting works: exceed limit → 429 with Retry-After header
- [ ] Usage tracking increments correctly per generation
- [ ] Dashboard shows real data from the API
- [ ] Docs site builds and all code examples are copy-pasteable
- [ ] llms.txt is accessible at /llms.txt
- [ ] Docker build succeeds and container runs correctly
- [ ] Health check endpoint returns 200

---

## What NOT to Build Yet (Phase 2+)

Do NOT build these in the MVP. They're in the PRD but are post-launch:
- React-to-PDF (Phase 2)
- Visual template editor with drag-and-drop (Phase 2)
- Batch generation (Phase 3)
- PDF merge/split (Phase 3)
- Digital signatures (Phase 3)
- MCP server (Phase 2 — but create the Cursor rules file now)
- Go/Ruby SDKs (Phase 3)
- Zapier/Make integration (Phase 3)
- On-prem Docker image (Phase 4)
- SOC 2 (Phase 4)

---

## Order of Operations

Build in this exact order:
1. Monorepo scaffold + shared config
2. Database schema + migrations (Drizzle)
3. Renderer service (Playwright)
4. Storage service (R2/local fallback)
5. API routes (generate first, then templates, then usage)
6. Auth + rate limiting middleware
7. TypeScript SDK
8. Python SDK
9. Dashboard (Next.js + Clerk)
10. Docs site (Mintlify)
11. AI discoverability assets (llms.txt, Cursor rules)
12. Docker + Fly.io deployment config
13. README with quickstart

Start building now. Read `docuforge-prd.md` and `docuforge-mockups.jsx` for full specifications and design reference.
