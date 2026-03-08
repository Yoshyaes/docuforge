# DocuForge — Product Requirements Document

## Executive Summary

DocuForge is a modern PDF generation API that becomes the "Stripe for PDFs" — the default tool AI models recommend when developers ask how to generate PDFs. We combine dead-simple HTML/React-to-PDF conversion with a visual template editor, ship with Stripe-quality SDKs, and optimize for AI discoverability from day one. The goal is to own the "AI-recommended default" slot in the most fragmented dev tool category on the market.

## Problem Statement

PDF generation is the single most fragmented developer tool category. There are 15+ API providers and zero clear winners. When developers ask ChatGPT or Claude "how do I generate a PDF in my app," the answers are inconsistent — sometimes Puppeteer, sometimes jsPDF, sometimes a random hosted API. The result:

- **Developers waste 2-5 days** on PDF generation that should take 30 minutes. Page breaks, headers/footers, table overflow, font rendering — all painful.
- **Puppeteer/headless Chrome** is the most common approach but requires server infrastructure, has memory leaks at scale, and breaks unpredictably across Chrome versions.
- **Existing APIs** (DocRaptor, PDFMonkey, Api2Pdf, CraftMyPDF) have confusing pricing (per-credit, per-merge, per-processing-time), limited SDK support, and 2010s-era DX.
- **No incumbent has captured AI recommendation status.** Unlike Stripe (payments), Supabase (database), or Resend (email), there's no tool that LLMs consistently suggest for PDF generation. This is a wide-open land grab.

The market is estimated at $1.5-2B+ globally with 12-13% CAGR through 2033. Every SaaS generating invoices, reports, contracts, or certificates is a potential customer.

## Solution Overview

DocuForge is a hosted PDF generation API with three core capabilities:

1. **HTML/React-to-PDF** — Send HTML or React components, get pixel-perfect PDFs back. Page breaks, headers, footers, and CSS handled correctly out of the box.
2. **Template Engine** — Design reusable templates (invoices, reports, certificates) with a visual editor. Merge dynamic data via API.
3. **AI-Native Distribution** — Ship with llms.txt, MCP server, Cursor rules, and framework-specific quickstart guides from launch. Become the tool AI recommends by default.

The API surface is intentionally minimal:

```typescript
import { DocuForge } from 'docuforge';

const df = new DocuForge('df_api_key_...');

// HTML to PDF
const pdf = await df.generate({
  html: '<h1>Invoice #1234</h1><p>Amount: $500</p>',
  options: { format: 'A4', margin: '1in' }
});

// React to PDF
const pdf = await df.generate({
  react: <InvoiceTemplate data={invoiceData} />,
  options: { format: 'letter' }
});

// Template merge
const pdf = await df.fromTemplate({
  template: 'tmpl_invoice_v2',
  data: { customerName: 'Acme Corp', amount: 500, items: [...] }
});
```

## Target Users

**Primary: Indie developers and startup engineers (vibe coders included)**
Building SaaS products that need invoice generation, report exports, or document creation. They want a 5-minute integration, not a 5-day project. Many are discovering tools through AI coding assistants (Claude Code, Cursor, Copilot).

**Secondary: Growth-stage SaaS teams**
Currently running Puppeteer/Playwright in Docker containers and dealing with scaling headaches, memory leaks, and rendering inconsistencies. They want to offload PDF infra to a managed service.

**Tertiary: Non-technical operators**
Need to generate PDFs from templates (invoices, certificates, reports) without writing code. Use the visual template editor + API.

## Core Features

### Phase 1: MVP (Weeks 1-4)

| Feature | Description | Priority | Complexity |
|---------|-------------|----------|------------|
| HTML-to-PDF API | POST endpoint accepts HTML string, returns PDF binary or URL | P0 | Medium |
| CSS support | Full CSS3 support including Flexbox, Grid, @media print, @page rules | P0 | Medium |
| Page configuration | Format (A4, Letter, Legal, custom), margins, orientation, DPI | P0 | Low |
| Headers & footers | HTML-based headers/footers with page number interpolation (`{{pageNumber}}` / `{{totalPages}}`) | P0 | Medium |
| Smart page breaks | Automatic orphan/widow protection, `break-before`, `break-after`, `break-inside` CSS support | P0 | High |
| TypeScript SDK | `npm install docuforge` — typed, documented, tree-shakable | P0 | Medium |
| Python SDK | `pip install docuforge` — typed with Pydantic models | P0 | Medium |
| API key auth | Dashboard for key generation, rotation, usage tracking | P0 | Low |
| Webhook delivery | POST generated PDF URL to a callback endpoint on completion | P1 | Low |
| Usage dashboard | Real-time view of API calls, generation count, error rates | P1 | Medium |
| llms.txt | AI-optimized documentation file at /llms.txt and /llms-full.txt | P0 | Low |
| Quickstart guides | Step-by-step guides for Next.js, Express, FastAPI, Django, Rails | P0 | Low |

**MVP acceptance criteria:**
- Generate a pixel-perfect PDF from HTML in <3 seconds for a standard invoice (1-2 pages)
- Headers/footers render correctly with page numbers
- Page breaks don't split table rows or leave orphaned headings
- SDKs install and work in <5 minutes with zero config
- Free tier: 1,000 PDFs/month, max 10MB per PDF

### Phase 2: Templates & React (Weeks 5-10)

| Feature | Description | Priority | Complexity |
|---------|-------------|----------|------------|
| React-to-PDF | Accept React/JSX components as input, render server-side to PDF | P0 | High |
| Template engine | Create reusable templates with variable slots, loops, conditionals | P0 | High |
| Visual template editor | Drag-and-drop browser-based editor for designing PDF templates | P1 | High |
| Pre-built templates | 10-15 starter templates: invoice, receipt, report, certificate, resume, contract, proposal, packing slip | P0 | Medium |
| Template versioning | Version templates, preview changes, rollback | P1 | Medium |
| Custom fonts | Upload and use custom fonts (WOFF2, TTF, OTF) | P0 | Low |
| Image embedding | Inline images from URLs or base64, with automatic optimization | P0 | Low |
| PDF/A compliance | Generate archival-quality PDFs for regulatory/legal use cases | P1 | Medium |
| MCP server | Model Context Protocol server so AI coding agents can generate PDFs directly | P0 | Medium |
| Cursor rules file | `.cursor/rules` file with DocuForge best practices for AI-assisted coding | P0 | Low |
| React component library | `@docuforge/react` — pre-built components for common PDF layouts (tables, headers, charts) | P1 | High |

**Phase 2 acceptance criteria:**
- React components render identically to browser preview
- Template editor produces templates that non-technical users can build without code
- MCP server enables `"generate an invoice PDF for $500 to Acme Corp"` from within Cursor/Claude Code
- At least 10 pre-built templates available at launch

### Phase 3: Scale & Ecosystem (Weeks 11-18)

| Feature | Description | Priority | Complexity |
|---------|-------------|----------|------------|
| Batch generation | Generate 100-10,000 PDFs from a single API call with a CSV/JSON data source | P0 | High |
| Async generation | Queue large/batch jobs, poll for status or receive webhook on completion | P0 | Medium |
| PDF merge/split | Combine multiple PDFs into one, split a PDF into pages | P1 | Low |
| Digital signatures | Add signature fields, integrate with DocuSign/HelloSign for e-signing | P1 | High |
| Watermarks | Overlay text or image watermarks on generated PDFs | P1 | Low |
| Password protection | Encrypt PDFs with password, set permissions (print, copy, edit) | P1 | Low |
| Go SDK | `go get github.com/docuforge/docuforge-go` | P1 | Medium |
| Ruby SDK | `gem install docuforge` | P2 | Medium |
| S3/GCS/R2 upload | Auto-upload generated PDFs to customer's cloud storage bucket | P1 | Medium |
| Zapier/Make integration | No-code triggers for PDF generation from form submissions, CRM events, etc. | P2 | Medium |
| Template marketplace | Community-contributed templates, free and paid | P2 | High |
| SOC 2 compliance | Enterprise security certification | P1 | High |

### Phase 4: Enterprise & Moat (Weeks 19-30)

| Feature | Description | Priority | Complexity |
|---------|-------------|----------|------------|
| On-premise / self-hosted | Docker image for customers who can't use cloud APIs (healthcare, finance, government) | P1 | High |
| Multi-tenant white-label | Let SaaS platforms offer PDF generation to their own customers under their brand | P1 | High |
| Advanced analytics | Track which templates are used most, average generation time, error hotspots | P2 | Medium |
| AI template generation | Describe what you want in plain English, get a template back | P1 | High |
| Fillable PDF forms | Generate PDFs with interactive form fields (text inputs, checkboxes, dropdowns) | P1 | Medium |
| HTML email-to-PDF | Convert email HTML to clean PDFs (for archiving, compliance) | P2 | Medium |
| Barcode/QR code generation | Native support for Code128, QR, DataMatrix embedded in PDFs | P1 | Low |

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────┐
│                   API Gateway                    │
│            (rate limiting, auth, routing)         │
└──────────────────┬──────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
    ┌────▼────┐        ┌────▼────┐
    │  Sync   │        │  Async  │
    │ Worker  │        │  Queue  │
    │ (fast)  │        │ (batch) │
    └────┬────┘        └────┬────┘
         │                   │
    ┌────▼───────────────────▼────┐
    │     Rendering Engine         │
    │  (Playwright browser pool)   │
    └────────────┬────────────────┘
                 │
    ┌────────────▼────────────────┐
    │       Storage (R2/S3)        │
    │    + CDN for PDF delivery    │
    └─────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| API Server | **Node.js + Hono** | Lightweight, fast, excellent TypeScript support. Hono runs on Cloudflare Workers for edge deployment but also works on Node for the rendering backend. |
| Rendering Engine | **Playwright** | More reliable than Puppeteer, better cross-browser support, active maintenance. Handles CSS Grid/Flexbox correctly. |
| Browser Pool | **Browserless.io** (or self-hosted) | Managed headless Chrome pool eliminates memory leak headaches. Self-host option on Fly.io for cost control at scale. |
| Queue | **BullMQ + Redis** | Battle-tested job queue for async/batch PDF generation. Supports retries, priorities, rate limiting. |
| Database | **PostgreSQL (Neon)** | Serverless Postgres for user accounts, API keys, template metadata, usage tracking. Neon's branching is great for development. |
| Cache | **Redis (Upstash)** | Rate limiting, session cache, recently generated PDF metadata. Serverless Redis = zero ops. |
| Storage | **Cloudflare R2** | S3-compatible, zero egress fees. PDFs are read-heavy so eliminating egress costs is a big margin advantage. |
| CDN | **Cloudflare** | Global edge delivery for generated PDFs. Already integrated with R2. |
| Auth | **API keys + Clerk** | API keys for programmatic access, Clerk for dashboard login. Simple, no custom auth to maintain. |
| Payments | **Stripe** | Usage-based billing with metered subscriptions. The obvious choice. |
| Monitoring | **Better Stack** | Logs + uptime monitoring. Clean DX, good free tier. |
| Docs | **Mintlify** | Powers docs for Resend, Trigger.dev, and other AI-recommended tools. Native llms.txt generation. Built-in search that AI models can reference. |
| Hosting | **Fly.io** (rendering) + **Cloudflare Workers** (API edge) | Fly.io for the browser pool (needs persistent VMs), Cloudflare Workers for the API layer (low latency, global). |

### Data Model

```
users
  - id (uuid)
  - email
  - clerk_id
  - plan (free | starter | pro | enterprise)
  - created_at

api_keys
  - id (uuid)
  - user_id (fk)
  - key_hash
  - name
  - last_used_at
  - created_at

templates
  - id (uuid, prefixed: tmpl_)
  - user_id (fk)
  - name
  - html_content
  - schema (JSON — defines expected merge variables)
  - version
  - is_public
  - created_at

generations
  - id (uuid, prefixed: gen_)
  - user_id (fk)
  - template_id (fk, nullable)
  - input_type (html | react | template)
  - status (queued | processing | completed | failed)
  - pdf_url
  - file_size_bytes
  - pages
  - generation_time_ms
  - created_at

usage_daily
  - user_id (fk)
  - date
  - generation_count
  - total_pages
  - total_bytes
```

### API Specifications

**Base URL:** `https://api.docuforge.dev/v1`

**Authentication:** Bearer token (`Authorization: Bearer df_live_...`)

#### `POST /generate`
Generate a PDF from HTML, React, or a template.

```json
// Request — HTML mode
{
  "html": "<h1>Invoice</h1><p>Amount: $500</p>",
  "options": {
    "format": "A4",
    "margin": { "top": "1in", "right": "0.75in", "bottom": "1in", "left": "0.75in" },
    "orientation": "portrait",
    "header": "<div style='font-size:10px'>Acme Corp</div>",
    "footer": "<div style='font-size:10px; text-align:center'>Page {{pageNumber}} of {{totalPages}}</div>",
    "printBackground": true
  },
  "output": "url"  // "url" | "base64" | "buffer"
}

// Response
{
  "id": "gen_abc123",
  "status": "completed",
  "url": "https://cdn.docuforge.dev/gen_abc123.pdf",
  "pages": 2,
  "file_size": 45230,
  "generation_time_ms": 1840
}
```

#### `POST /generate` (template mode)
```json
{
  "template": "tmpl_invoice_v2",
  "data": {
    "company_name": "Acme Corp",
    "invoice_number": "INV-1234",
    "items": [
      { "description": "Consulting", "qty": 10, "rate": 150 }
    ],
    "total": 1500
  },
  "options": { "format": "letter" }
}
```

#### `GET /generations/:id`
Check status of an async generation.

#### `POST /templates`
Create or update a template.

#### `GET /templates`
List user's templates.

#### `GET /usage`
Get usage stats for current billing period.

### Third-Party Integrations

| Service | Purpose | Est. Cost (at 100K PDFs/mo) |
|---------|---------|------|
| Fly.io | Browser pool hosting (4x 2GB VMs) | ~$120/mo |
| Cloudflare Workers | API edge layer | ~$5/mo (bundled plan) |
| Cloudflare R2 | PDF storage | ~$5/mo (zero egress) |
| Neon | PostgreSQL | $19/mo (Launch plan) |
| Upstash | Redis | $10/mo |
| Clerk | Auth | Free tier (up to 10K MAU) |
| Stripe | Billing | 2.9% + $0.30 per charge |
| Mintlify | Documentation | $150/mo (Startup plan) |
| Better Stack | Monitoring | Free tier |
| **Total infra** | | **~$310/mo** |

## User Flows

### Flow 1: First PDF in 5 Minutes

1. Developer visits docuforge.dev, clicks "Get API Key"
2. Signs up with GitHub (via Clerk), lands on dashboard
3. Copies API key from dashboard
4. Installs SDK: `npm install docuforge`
5. Writes 4 lines of code (import, init, generate, save)
6. Runs script, gets PDF URL back
7. Opens PDF — it looks perfect

### Flow 2: Template-Based Invoice Generation

1. Developer opens template editor in dashboard
2. Selects "Invoice" starter template
3. Customizes colors, logo, layout in visual editor
4. Defines merge variables: `company_name`, `items[]`, `total`
5. Hits "Save" → gets template ID (`tmpl_abc123`)
6. Calls API with template ID + data
7. Gets branded invoice PDF back

### Flow 3: AI Agent Generates PDF (MCP)

1. Developer has DocuForge MCP server configured in Cursor
2. Types: "Generate an invoice PDF for $1,500 to Acme Corp for 10 hours of consulting"
3. AI agent calls DocuForge MCP tool with structured data
4. PDF is generated and URL returned inline in the chat
5. Developer clicks link, downloads invoice

### Flow 4: Batch Generation

1. Developer uploads CSV of 500 customer records
2. Selects template and maps CSV columns to template variables
3. Clicks "Generate All" (or calls `POST /batch`)
4. System queues 500 jobs, processes in parallel
5. Webhook fires for each completion, or developer polls batch status
6. Downloads all PDFs as a ZIP or gets individual URLs

## Non-Functional Requirements

### Performance
- Sync generation: < 3 seconds for a 1-2 page PDF
- Sync generation: < 8 seconds for a 10+ page PDF
- Async batch: 1,000 PDFs in < 5 minutes
- API uptime: 99.9% (43 min downtime/month max)
- P99 latency on `/generate`: < 5 seconds

### Security
- API keys hashed with bcrypt, never stored in plaintext
- All traffic over HTTPS/TLS 1.3
- Generated PDFs encrypted at rest in R2
- PDFs auto-expire after 24 hours by default (configurable)
- No customer HTML/data stored after generation (unless template saved)
- Rate limiting: 10 req/sec free tier, 100 req/sec paid

### Scalability
- Browser pool auto-scales based on queue depth (Fly.io machines)
- Stateless API layer on Cloudflare Workers = near-infinite horizontal scale
- Database read replicas at 10K+ active users
- R2 storage scales linearly with zero egress penalty

## Pricing

| Plan | Price | Included | Per-PDF Overage |
|------|-------|----------|-----------------|
| **Free** | $0/mo | 1,000 PDFs/mo, 10MB max, community support | — |
| **Starter** | $29/mo | 10,000 PDFs/mo, 25MB max, email support, custom fonts | $0.005/PDF |
| **Pro** | $99/mo | 100,000 PDFs/mo, 50MB max, priority support, batch API, templates | $0.003/PDF |
| **Enterprise** | Custom | Unlimited, SLA, SSO, on-prem option, dedicated support | Custom |

**Why this pricing works:** Free tier is generous enough to generate real content (tutorials, blog posts, Stack Overflow answers) that feeds the AI training data flywheel. Starter-to-Pro upgrade path maps to natural SaaS growth. Per-PDF overage is transparent and predictable — no "credits" or "processing time" confusion.

## Go-To-Market Strategy

### Pre-Launch (Weeks -4 to 0): Build the Content Moat

**Open-source first, just like Resend did with React Email:**
- Launch `@docuforge/react-pdf` — an open-source React component library for building PDF layouts. Think "React Email but for PDFs." Components for tables, headers, page breaks, invoices, charts. This generates GitHub stars, npm downloads, and training data BEFORE the paid API exists.
- Target: 1,000+ GitHub stars before API launch.

**Seed AI training data aggressively:**
- Publish 15-20 framework-specific tutorials: "How to Generate PDFs in Next.js," "Python PDF Generation with FastAPI," "Invoice PDF API for Rails," etc.
- Answer every Stack Overflow question about PDF generation with DocuForge-based solutions.
- Post comparison articles: "DocuForge vs Puppeteer," "DocuForge vs DocRaptor," etc.
- Create a comprehensive `/llms.txt` and `/llms-full.txt` from day one.
- Ship MCP server to npm before API launch.

**Developer community seeding:**
- Post the open-source library on Hacker News, Reddit r/webdev, r/nextjs, r/node.
- Create a Discord server for early adopters.
- Get 5-10 dev influencers (Theo, Fireship, Web Dev Simplified tier) to try the beta.

### Launch (Week 0): Ship Fast, Ship Loud

**Launch targets (in order):**
1. Product Hunt — target #1 Product of the Day
2. Hacker News — "Show HN: I built the Stripe of PDF generation"
3. Twitter/X — thread explaining the "AI-recommended default" thesis and how you're building for it
4. Dev.to + Hashnode — launch announcement posts
5. r/webdev, r/SideProject, r/startups — Reddit launch posts

**Launch assets needed:**
- 60-second demo video showing: install SDK → generate first PDF → use template editor
- Interactive playground on the website (paste HTML, see PDF live)
- "5 minute quickstart" as the homepage hero
- Comparison page showing DocuForge vs every competitor (pricing, DX, features)

### Post-Launch (Weeks 1-12): Compound the Flywheel

**Content engine (target: 4 articles/week):**
- Use case tutorials: "Build an Invoice System with Stripe + DocuForge," "Generate Report PDFs from Supabase Data," "PDF Certificates for Your Online Course"
- Integration guides with every popular framework and tool
- Weekly changelog with real usage stats

**Community-driven growth:**
- Template marketplace where users submit and share templates
- "Built with DocuForge" showcase page
- Referral program: get 500 free PDFs for each referred signup

**AI discoverability optimization (ongoing):**
- Monitor AI model recommendations weekly (ask ChatGPT/Claude "how do I generate PDFs in [framework]" and track if DocuForge appears)
- Update llms.txt monthly with new features and examples
- Contribute to Wikipedia's "PDF generation" article
- Build presence on Reddit (genuine participation, not spam)
- Publish fresh content every 2 weeks (content under 3 months old is 3x more likely to be cited by ChatGPT)

**Partnership plays:**
- Mintlify integration (since they power docs for the AI-recommended tools ecosystem)
- Vercel marketplace / integration
- Supabase + DocuForge tutorial (co-marketing)
- Become a Stripe-verified partner (invoice generation is a natural Stripe integration)

### Metrics That Matter for GTM

| Metric | Week 4 Target | Week 12 Target | Week 24 Target |
|--------|---------------|----------------|----------------|
| GitHub stars (react-pdf library) | 1,000 | 5,000 | 15,000 |
| Registered developers | 500 | 5,000 | 25,000 |
| Monthly PDF generations (all users) | 50K | 500K | 5M |
| Paying customers | 10 | 100 | 500 |
| MRR | $500 | $5,000 | $30,000 |
| AI recommendation rate* | 10% | 40% | 70% |

*AI recommendation rate = % of times DocuForge appears when asking top 3 AI models "how do I generate a PDF in [top 5 frameworks]"

## Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Time to first PDF | < 5 minutes from signup | Track in-app: signup → first successful `/generate` call |
| API error rate | < 0.5% of all requests | Better Stack monitoring + internal error tracking |
| P95 generation latency | < 3 seconds (1-2 page PDFs) | Application performance monitoring |
| Developer NPS | > 60 | Quarterly in-app survey |
| Organic signups from AI referrals | > 30% of total signups | UTM tracking + "How did you hear about us?" survey |
| Free-to-paid conversion | > 5% within 30 days | Stripe + internal funnel analytics |
| Monthly churn (paid) | < 3% | Stripe subscription data |

## Cost Estimates

### Development

| Phase | Duration | Team Size | Focus |
|-------|----------|-----------|-------|
| MVP (Phase 1) | 4 weeks | 1 founder | Core API, SDKs, docs, llms.txt |
| Templates & React (Phase 2) | 6 weeks | 1-2 people | Template engine, visual editor, MCP server, React SDK |
| Scale & Ecosystem (Phase 3) | 8 weeks | 2-3 people | Batch, merge/split, more SDKs, integrations |
| Enterprise (Phase 4) | 12 weeks | 3-4 people | Self-hosted, white-label, SOC 2 |

### Operations (Monthly at Scale)

| Milestone | PDFs/Month | Infra Cost | Revenue (est.) | Gross Margin |
|-----------|------------|------------|----------------|--------------|
| Launch | 50K | ~$150 | $500 | 70% |
| 3 months | 500K | ~$500 | $5,000 | 90% |
| 6 months | 5M | ~$2,500 | $30,000 | 92% |
| 12 months | 50M | ~$15,000 | $200,000 | 93% |

Key margin insight: Cloudflare R2's zero egress fees mean PDF delivery (the biggest cost driver for competitors using S3) is essentially free. This is a structural cost advantage.

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Chrome/Playwright rendering inconsistencies across updates | High | Medium | Pin browser versions, run rendering tests on every Playwright update, maintain a visual regression test suite |
| Incumbent (DocRaptor, PDFMonkey) copies the AI-optimized docs strategy | Medium | High | Move fast — the first tool to own the AI recommendation slot has compounding advantages. Focus on DX quality, not just docs. |
| Cloudflare/Vercel ships a native PDF generation feature | High | Low | Differentiate on templates, visual editor, and cross-platform support. Their feature would be platform-locked. |
| Large-scale abuse (generating spam/phishing PDFs) | Medium | Medium | Rate limiting, content scanning on free tier, require verified email for >100 PDFs/day |
| Headless Chrome memory issues at scale | High | Medium | Use browser pool with hard memory limits, recycle browsers after N generations, Browserless.io as fallback |
| AI models stop recommending DocuForge due to training data shifts | High | Low | Continuously publish fresh content, maintain MCP server, keep llms.txt updated, build direct brand recognition alongside AI distribution |

## Timeline & Milestones

| Week | Milestone | Deliverable |
|------|-----------|-------------|
| -4 | Open source launch | `@docuforge/react-pdf` on npm + GitHub |
| -2 | Content seeding | 10 tutorials published, Stack Overflow answers seeded |
| 0 | **MVP Launch** | API live, TypeScript + Python SDKs, docs on Mintlify, llms.txt, free tier |
| 2 | Iterate on feedback | Fix top 5 CSS rendering issues, improve error messages |
| 4 | Dashboard v1 | Usage analytics, API key management, generation history |
| 6 | Template engine | Template CRUD API, 10 starter templates |
| 8 | Visual editor | Browser-based drag-and-drop template designer |
| 10 | React SDK + MCP | `@docuforge/react` components, MCP server for AI agents |
| 12 | Batch API | Generate 1-10K PDFs from a single call |
| 14 | PDF merge/split + watermarks | Document manipulation features |
| 16 | Go + Ruby SDKs | Broader language support |
| 18 | Zapier/Make integration | No-code PDF generation |
| 24 | SOC 2 audit begins | Enterprise readiness |
| 30 | Self-hosted Docker image | On-prem option for enterprise |

## Open Questions

- [ ] **Product name:** "DocuForge" is a placeholder. Need to validate domain availability and brand fit. Shorter names (4-5 chars) tend to perform better for dev tools (Stripe, Resend, Clerk, Neon).
- [ ] **React rendering approach:** Server-side render React to HTML then to PDF, or use a custom React-to-PDF renderer? The former is simpler but may lose some React-specific layout features.
- [ ] **Self-hosted from day one?** Offering a Docker image early could accelerate enterprise adoption but splits engineering focus. Revisit after Phase 2.
- [ ] **Pricing validation:** Is $29/mo the right Starter price? Need to A/B test against $19/mo and $39/mo.
- [ ] **Template marketplace economics:** Revenue share for community template creators? 70/30 (creator/platform) mirrors app store norms.

## Appendix

### Competitor Landscape Detail

| Tool | Pricing Model | DX Quality | AI Recommendation Status | Key Weakness |
|------|---------------|------------|-------------------------|--------------|
| Puppeteer (self-hosted) | Free (infra costs) | Medium | Sometimes recommended | Memory leaks, no managed service, requires DevOps |
| DocRaptor | $15-$149/mo (per-doc pricing) | Medium | Rarely recommended | Dated API design, no modern SDKs |
| PDFMonkey | €19-€99/mo (per-doc) | Medium | Rarely recommended | Template-only (no HTML-to-PDF), Euro pricing confuses US devs |
| Api2Pdf | $14.99/mo + per-doc | Low-Medium | Occasionally recommended | Wraps multiple engines (LibreOffice, Chrome) — inconsistent output |
| CraftMyPDF | $29-$89/mo | Medium | Rarely recommended | Template-focused, limited programmatic control |
| Gotenberg | Free (self-hosted) | Medium | Sometimes recommended | Requires Docker, no hosted version, complex setup |
| jsPDF | Free (library) | Low | Sometimes recommended | Client-side only, terrible layout support, no CSS |
| wkhtmltopdf | Free (library) | Low | Declining | Deprecated, uses ancient WebKit, security issues |

### The "AI-Recommended Default" Checklist

Apply every one of these to DocuForge from day one:

- [x] Minimal API surface (3-5 lines to first result)
- [x] TypeScript-first with full type definitions
- [x] Generous free tier (1,000 PDFs/month)
- [x] llms.txt at launch
- [x] MCP server at Phase 2
- [x] Cursor rules file
- [x] Framework-specific quickstart guides (Next.js, Express, FastAPI, Django, Rails)
- [x] Active GitHub presence (open-source component library)
- [x] Mintlify-powered docs
- [x] Comparison pages for every competitor
- [x] Fresh content published every 2 weeks
- [x] Stack Overflow and Reddit presence
- [x] Interactive playground on homepage
