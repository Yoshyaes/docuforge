# DocuForge

**PDF generation API for developers. HTML in, pixel-perfect PDF out.**

Generate pixel-perfect PDFs from HTML or reusable templates. Full CSS support, smart page breaks, headers/footers with page numbers â€” all in under 3 seconds.

## Quick Start

```typescript
import { DocuForge } from 'docuforge';

const df = new DocuForge('df_live_...');

const pdf = await df.generate({
  html: '<h1>Invoice #1234</h1><p>Amount: $500</p>',
  options: { format: 'A4', margin: '1in' }
});

console.log(pdf.url);
// â†’ https://cdn.getdocuforge.dev/gen_abc123.pdf
```

## Features

- **HTML â†’ PDF** â€” Send any HTML, get a perfect PDF. CSS Grid, Flexbox, custom fonts all work.
- **Templates** â€” Design once, merge data forever. Handlebars syntax for variables, loops, conditionals.
- **Headers & Footers** â€” With `{{pageNumber}}` and `{{totalPages}}` interpolation.
- **Smart Page Breaks** â€” No orphaned headings or split table rows.
- **TypeScript & Python SDKs** â€” Install and generate in 4 lines of code.
- **AI-Native** â€” llms.txt, Cursor rules, and framework guides from day one.

## Project Structure

```
docuforge/
â”œâ”€â”€ apps/
â”‚   â”œâ”€â”€ api/          # Hono API server (Playwright rendering)
â”‚   â””â”€â”€ dashboard/    # Next.js dashboard (Clerk auth)
â”œâ”€â”€ packages/
â”‚   â”œâ”€â”€ sdk-typescript/   # npm: docuforge
â”‚   â””â”€â”€ sdk-python/       # pip: docuforge
â”œâ”€â”€ docs/             # Mintlify documentation
â””â”€â”€ public/           # llms.txt, Cursor rules
```

## Development

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (or Neon)
- Redis (or Upstash)

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Install Playwright browsers
cd apps/api && npx playwright install chromium

# Start development servers
pnpm dev
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your values. At minimum, you need:
- `DATABASE_URL` â€” PostgreSQL connection string
- `REDIS_URL` â€” Redis connection string

For local development, the API server falls back to local filesystem storage when R2 is not configured.

## SDKs

### TypeScript

```bash
npm install docuforge
```

### Python

```bash
pip install docuforge
```

See the [SDK documentation](https://getdocuforge.dev/docs/quickstart) for full usage details.

## Deployment

### Fly.io

```bash
fly launch
fly secrets set DATABASE_URL=... REDIS_URL=... R2_ACCOUNT_ID=...
fly deploy
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/generate` | Generate a PDF from HTML or template |
| GET | `/v1/generations/:id` | Get generation details |
| GET | `/v1/generations` | List generations |
| POST | `/v1/templates` | Create a template |
| GET | `/v1/templates` | List templates |
| GET | `/v1/templates/:id` | Get a template |
| PUT | `/v1/templates/:id` | Update a template |
| DELETE | `/v1/templates/:id` | Delete a template |
| GET | `/v1/usage` | Get usage stats |
| GET | `/health` | Health check |

## License

MIT
