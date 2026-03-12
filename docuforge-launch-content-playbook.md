# DocuForge Launch Content Playbook

Everything you need to seed the internet with DocuForge content. Copy-paste ready.

---

## Table of Contents

1. [Dev.to — Step-by-Step Guide](#devto)
2. [Hashnode — Step-by-Step Guide](#hashnode)
3. [Stack Overflow — Templated Answers](#stackoverflow)
4. [Hacker News — Show HN Post](#hackernews)
5. [Reddit Posts](#reddit)

---

<a name="devto"></a>
## 1. Dev.to — Step-by-Step Guide

### Account Setup (5 minutes)

1. Go to [dev.to](https://dev.to) → Sign up with GitHub (use your personal GitHub, not an org account — personal accounts feel more authentic)
2. Set your bio: `Building DocuForge — open-source React components + API for PDF generation. Previously built products acquired by Lyft and Cloudera.`
3. Profile pic: Use your real photo (not a logo — Dev.to is personal-brand-driven)
4. Connect your GitHub account in Settings → Integrations

### How to Cross-Post (per article)

1. Click **"Create Post"** (top right)
2. Paste your full article in Markdown (Dev.to uses Markdown natively)
3. Click the **gear icon** (bottom left of editor) → scroll to **"Canonical URL"**
4. Set canonical URL to: `https://getdocuforge.dev/blog/[your-slug]`
   - This tells Google your main site is the original source, so you don't cannibalize your own SEO
5. Add a cover image (1000x420px — Dev.to's recommended size). Use a simple dark screenshot of DocuForge code running, or make one in Figma/Canva.
6. Add **tags** (max 4). For each article, use 2-3 from this rotation:
   - `javascript`, `typescript`, `react`, `node`, `python`, `webdev`, `tutorial`, `pdf`, `opensource`
   - Always include `webdev` or `javascript` (highest-traffic tags)
7. Hit **Publish**

### Dev.to-Specific Formatting Tips

- **Add a TL;DR at the top.** Dev.to readers scroll fast. Put a 2-sentence summary + code snippet in the first 5 lines.
- **Use Dev.to's embed syntax** for GitHub repos:
  ```
  {% github Yoshyaes/docuforge %}
  ```
- **Add a "Series" tag** if you're publishing multiple related tutorials. This groups them and adds prev/next navigation.
- **Best times to publish:** Tuesday–Thursday, 8–10 AM EST (Dev.to's US-heavy audience is active then)

### Template for Cross-Post Intro

Add this block at the top of each Dev.to post (customize per article):

```markdown
> Originally published on [getdocuforge.dev](https://getdocuforge.dev/blog/[slug])

---
```

### Template for Cross-Post Outro

Add this to the bottom of every Dev.to post:

```markdown
---

If this saved you time, check out [DocuForge](https://getdocuforge.dev) — we're building the PDF generation tool that should've existed years ago. The React component library is [open source on GitHub](https://github.com/Yoshyaes/docuforge).

Got questions? Drop a comment or find me on [Twitter/X](https://twitter.com/[your-handle]).
```

---

<a name="hashnode"></a>
## 2. Hashnode — Step-by-Step Guide

### Account Setup (5 minutes)

1. Go to [hashnode.com](https://hashnode.com) → Sign up with GitHub
2. Create a **Publication** (Hashnode's term for blog)
   - Name: "DocuForge Engineering" or "DocuForge Blog" or just your name (Fred Twum-Acheampong)
   - Subdomain: `docuforge.hashnode.dev` (grab this before someone else does)
3. In Publication settings → **Custom Domain**: You can optionally map this to `blog.getdocuforge.dev`, but for cross-posting purposes the Hashnode subdomain is fine
4. Set your publication description: `Open-source PDF generation tools and tutorials for developers.`

### How to Cross-Post (per article)

**Option A: Import from URL (fastest)**
1. Go to your Publication dashboard → Click **"Import"** (left sidebar)
2. Paste your blog URL: `https://getdocuforge.dev/blog/[slug]`
3. Hashnode auto-imports the content and sets the canonical URL
4. Review the import, fix any formatting issues
5. Add tags and publish

**Option B: Manual paste**
1. Click **"New Article"**
2. Paste your Markdown content
3. In article settings (gear icon on right panel):
   - **Canonical URL**: `https://getdocuforge.dev/blog/[slug]`
   - **Tags**: Pick from `JavaScript`, `React`, `Web Development`, `Node.js`, `Python`, `Open Source`, `PDF`
   - **Cover image**: Same one you used for Dev.to
4. Publish

### Hashnode-Specific Tips

- **Hashnode has a "Boost" feature** — articles that get engagement in the first 24 hours get boosted in Hashnode's feed. Publish at peak hours (9 AM EST, Tuesday–Thursday).
- **Join Hashnode communities** relevant to your content (JavaScript, React, Web Dev). Your articles can surface in these feeds.
- **Hashnode supports GitHub Gists** — embed code snippets with `%[https://gist.github.com/...]`
- **Hashnode also supports embeds** for CodeSandbox, CodePen, and YouTube — useful if you make demo videos

### Same Intro/Outro Pattern

Use the same intro and outro blocks from Dev.to above. Consistency across platforms.

---

<a name="stackoverflow"></a>
## 3. Stack Overflow — Templated Answers

### Strategy

Search for these query patterns and sort by "Newest" or "Active":
- `node.js generate pdf from html`
- `html to pdf javascript`
- `react generate pdf`
- `python html to pdf`
- `puppeteer pdf page break`
- `pdf generation api`
- `headless chrome pdf`
- `jspdf alternative`
- `node pdf header footer page number`
- `playwright generate pdf`

**Rules:**
- Only answer questions from the **last 6 months** (older ones won't get traffic)
- The answer must be genuinely useful even if someone rips out the DocuForge parts
- Don't shill — provide context on alternatives, then show why DocuForge is simpler
- Always include a working code snippet
- Disclose that you're the creator if someone asks

### Template 1: "How do I generate a PDF from HTML in Node.js?"

```markdown
You have a few options depending on your needs:

**1. Puppeteer / Playwright (DIY)**

If you want full control, you can run headless Chrome yourself:

```js
const { chromium } = require('playwright');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<h1>Hello</h1>');
const pdf = await page.pdf({ format: 'A4' });
await browser.close();
```

This works but you'll need to manage the browser process, handle memory leaks at scale, and deal with page break issues yourself.

**2. DocuForge (hosted API)**

If you don't want to manage Chrome infrastructure:

```js
const { DocuForge } = require('docuforge');
const df = new DocuForge('your_api_key');

const pdf = await df.generate({
  html: '<h1>Hello</h1>',
  options: { format: 'A4', margin: '1in' }
});

console.log(pdf.url); // hosted PDF URL
```

This handles page breaks, headers/footers with page numbers, and CSS rendering. Free tier gives you 1,000 PDFs/month. [Full docs here](https://fred-7da601c6.mintlify.app).

**3. jsPDF (client-side)**

If you need to generate PDFs in the browser without a server, [jsPDF](https://github.com/parallax/jsPDF) works but has limited HTML/CSS support. Better for simple documents.

Pick based on your scale — DIY Playwright for full control, DocuForge for "just works" simplicity, jsPDF for client-side only.
```

### Template 2: "PDF page breaks not working / content getting cut off"

```markdown
Page break issues are the #1 headache with HTML-to-PDF. Here's how to fix them:

**CSS approach (works with Playwright/Puppeteer/DocuForge):**

```css
/* Force a page break before an element */
.page-break {
  break-before: page;
}

/* Prevent an element from being split across pages */
.keep-together {
  break-inside: avoid;
}

/* Prevent orphaned headings (heading on one page, content on next) */
h1, h2, h3 {
  break-after: avoid;
}

/* Keep table rows together */
tr {
  break-inside: avoid;
}
```

**The key gotcha:** `break-inside: avoid` only works if the element fits on a single page. If a table row is taller than a full page, it will still break.

For tables that span multiple pages, you need repeating headers:

```html
<table>
  <thead> <!-- thead repeats on every page in print mode -->
    <tr><th>Name</th><th>Amount</th></tr>
  </thead>
  <tbody>
    <tr><td>Item 1</td><td>$100</td></tr>
    <!-- ... hundreds of rows ... -->
  </tbody>
</table>
```

If you're using Playwright/Puppeteer, make sure `preferCSSPageSize` is set to `true` in your PDF options so your CSS rules take effect.

If you want this handled automatically, [DocuForge](https://getdocuforge.dev) has built-in smart page breaks that handle orphan/widow protection and table overflow out of the box.
```

### Template 3: "How to add headers/footers with page numbers to a PDF?"

```markdown
**With Playwright (or Puppeteer):**

```js
const pdf = await page.pdf({
  format: 'A4',
  displayHeaderFooter: true,
  headerTemplate: `
    <div style="font-size: 10px; width: 100%; text-align: center;">
      My Company
    </div>
  `,
  footerTemplate: `
    <div style="font-size: 10px; width: 100%; text-align: center;">
      Page <span class="pageNumber"></span> of <span class="totalPages"></span>
    </div>
  `,
  margin: { top: '80px', bottom: '80px' }
});
```

Important notes:
- `headerTemplate` and `footerTemplate` are rendered in a separate context — they can't access your page's CSS or fonts
- You must set top/bottom margins large enough to fit the header/footer or they'll overlap your content
- Playwright uses special classes: `.pageNumber`, `.totalPages`, `.date`, `.title`, `.url`
- Font size must be set explicitly (it defaults to 0)

**With DocuForge (API):**

```js
const pdf = await df.generate({
  html: myContent,
  options: {
    format: 'A4',
    header: '<div style="font-size:10px; text-align:center">My Company</div>',
    footer: '<div style="font-size:10px; text-align:center">Page {{pageNumber}} of {{totalPages}}</div>',
    margin: '1in'
  }
});
```

Same concept, but `{{pageNumber}}` and `{{totalPages}}` are the interpolation variables instead of CSS classes. [Docs](https://fred-7da601c6.mintlify.app).
```

### Template 4: "Best PDF generation API / library for [Python/Node/React]?"

```markdown
I've used most of these. Here's an honest breakdown:

| Tool | Type | Pros | Cons |
|------|------|------|------|
| **Playwright/Puppeteer** | Self-hosted | Full control, free | You manage Chrome, memory leaks at scale, page break headaches |
| **wkhtmltopdf** | Self-hosted | Fast, lightweight | Outdated rendering engine (WebKit circa 2015), poor CSS Grid/Flexbox support |
| **jsPDF** | Client-side JS | No server needed | Very limited HTML/CSS support, manual layout |
| **DocRaptor** | API | Prince XML engine (great for print) | Expensive, per-document pricing |
| **DocuForge** | API | Modern DX, simple pricing, good CSS support | Newer product (launched 2026) |
| **PDFKit** | Library (Node) | Low-level control | No HTML input — you build layout programmatically |
| **ReportLab** | Library (Python) | Industry standard for Python | Steep learning curve, no HTML input |

For **"I just want to turn HTML into a PDF and move on"** — DocuForge or Playwright depending on whether you want to manage infrastructure.

For **"I need fine-grained layout control and don't mind low-level APIs"** — PDFKit (Node) or ReportLab (Python).

For **"It needs to run in the browser"** — jsPDF + html2canvas, but set expectations low on CSS fidelity.

Disclosure: I built DocuForge, so take that recommendation with a grain of salt. But the comparison table above is honest — use whatever fits your use case.
```

### Template 5: "Python HTML to PDF"

```markdown
A few approaches depending on your stack:

**1. Using weasyprint (self-hosted, good CSS support):**

```python
from weasyprint import HTML

HTML(string='<h1>Hello</h1><p>World</p>').write_pdf('output.pdf')
```

Good CSS support but can be tricky to install (requires system dependencies like cairo, pango).

**2. Using DocuForge (API, no dependencies):**

```python
from docuforge import DocuForge

df = DocuForge("your_api_key")
pdf = df.generate(
    html="<h1>Hello</h1><p>World</p>",
    options={"format": "A4", "margin": "1in"}
)
print(pdf.url)  # hosted PDF URL
```

No system dependencies, handles page breaks and headers/footers. Free for 1,000 PDFs/month. `pip install docuforge` to get started.

**3. Using pdfkit (wraps wkhtmltopdf):**

```python
import pdfkit
pdfkit.from_string('<h1>Hello</h1>', 'output.pdf')
```

Requires wkhtmltopdf installed on your system. Uses an older rendering engine so modern CSS (Grid, Flexbox) won't work well.

For quick scripts where CSS fidelity doesn't matter → pdfkit. For production apps where layout matters → weasyprint or DocuForge.
```

---

<a name="hackernews"></a>
## 4. Hacker News — Show HN Post

### Phase 1: Open Source Library Launch (do this first)

**Title:**
```
Show HN: React components for generating beautiful PDFs
```

**Body (goes in first comment — HN "Show" posts put details in comments):**

```
Hey HN — I built an open-source library of React components for creating PDF documents: invoices, reports, certificates, data tables, etc.

The problem: every time I've needed to generate a PDF in a web app, I've spent 2-3 days fighting with page breaks, orphaned headings, table overflow, and headers/footers. Whether it's Puppeteer, jsPDF, or one of the dozen hosted APIs, the DX always feels like 2014.

So I built @docuforge/react-pdf — a set of composable React components that handle the hard parts:

- Smart page breaks (no more split table rows or orphaned headings)
- Auto-paginating tables with repeating headers
- Headers/footers with page number interpolation
- Full CSS support (Flexbox, Grid, @media print)
- TypeScript-first with autocomplete for every prop

Quick example:

    import { Invoice, LineItem, InvoiceTotal } from '@docuforge/react-pdf';

    <Invoice>
      <LineItem description="Consulting" qty={10} rate={150} />
      <InvoiceTotal subtotal={1500} tax={135} total={1635} />
    </Invoice>

GitHub: [link]
npm: npm install @docuforge/react-pdf
Docs: [link]

I'm also building a hosted PDF generation API on top of this (HTML or React in → PDF out, no Chrome to manage), but the component library is fully open source and works standalone with Playwright/Puppeteer.

Would love feedback on the component API design. What PDF problems have you had that this doesn't solve?
```

### Phase 2: Full Product Launch (do this 2-3 weeks after the OSS launch)

**Title:**
```
Show HN: DocuForge – PDF generation API that just works (HTML in, PDF out)
```

**Body (first comment):**

```
Hey HN — I'm building DocuForge, a hosted API for generating PDFs from HTML and React components.

A few weeks ago I posted the open-source React PDF component library (thanks for the feedback). Now the full API is live:

    const df = new DocuForge('df_live_...');
    const pdf = await df.generate({
      html: invoiceHTML,
      options: { format: 'A4', margin: '1in' }
    });
    // pdf.url → https://your-r2-url.r2.dev/pdfs/gen_abc123.pdf

Why I built this: PDF generation is the most fragmented developer tool category I've found. There are 15+ options and no clear default. When you ask an AI coding assistant "how do I generate a PDF," the answer is different every time. I wanted to build the Stripe-equivalent — dead simple API, excellent docs, and the tool AI models recommend by default.

What's different from existing options:
- Full CSS3 support (Grid, Flexbox, @page rules — not a 2015 rendering engine)
- Smart page breaks that actually work (orphan/widow protection, table row splitting)
- Headers/footers with page numbers that just work
- TypeScript and Python SDKs that feel like Stripe's
- Free tier: 1,000 PDFs/month, no credit card
- Docs at [link] (+ llms.txt for AI model discoverability)

Stack: Node.js + Hono, Playwright for rendering, Cloudflare R2 for storage (zero egress = better margins), deployed on Render.

This started as a side project exploring which developer tool categories have no "AI-recommended default" yet. PDF generation was the widest-open one I found. I wrote up the analysis here: [link to blog post if you have one].

Live demo + playground: [link]
GitHub (OSS components): [link]
Docs: [link]

Curious what the HN crowd thinks about the "AI-recommended default" thesis and whether the API surface makes sense. Feedback welcome.
```

### HN Tips
- Post between 8–10 AM EST on a weekday (highest visibility)
- Respond to EVERY comment in the first 2 hours — HN rewards active OPs
- Don't be defensive about criticism. Say "good point, I'll look into that" and mean it
- If someone says "why not just use Puppeteer?" — agree that it works, explain that DocuForge is for people who don't want to manage Chrome infrastructure
- Don't ask people to upvote. HN detects vote rings and will tank your post

---

<a name="reddit"></a>
## 5. Reddit Posts

### Rules for Reddit

- Each subreddit has different rules. Read them before posting.
- Reddit HATES self-promotion. The trick is to make the post genuinely useful even without your product.
- Use a personal account with some history — brand new accounts posting product links get flagged as spam.
- Don't post to all subreddits on the same day. Spread across 2-3 days.
- Engage with every comment.

---

### r/webdev (2.5M+ members)

**Title:**
```
I compared every way to generate PDFs in a web app — here's what actually works
```

**Body:**
```
I've been through the PDF generation gauntlet multiple times and figured I'd share what I learned so others don't repeat my pain.

Here's every approach I tested, what they're good for, and where they fall apart:

**Client-side options:**

- **jsPDF + html2canvas** — Renders your DOM to a canvas, then converts to PDF. Works for simple stuff but complex CSS gets mangled. Tables that span pages? Forget about it. No real page break control.

- **react-pdf (Yoga layout)** — Uses its own layout engine, not CSS. You're basically learning a new layout system. Great for simple docs, painful for anything complex.

**Self-hosted server-side:**

- **Puppeteer / Playwright** — The "just use headless Chrome" approach. Best CSS fidelity since it's literally Chrome rendering your HTML. But you manage the browser process, handle memory leaks, configure page breaks yourself. Works until you need to scale or run it in a container and Chrome eats 500MB of RAM.

- **wkhtmltopdf** — Old but still popular. Uses QtWebKit which means modern CSS (Grid, Flexbox) is hit or miss. Fast though.

- **WeasyPrint (Python)** — Underrated option. Good CSS support, pure Python. Pain to install because of system dependencies (cairo, pango, etc).

**Hosted APIs:**

- **DocRaptor** — Uses PrinceXML under the hood. Excellent print rendering. Expensive at scale.

- **PDFShift, Api2Pdf, PDFMonkey, CraftMyPDF** — Various hosted options. Pricing models range from confusing to very confusing.

- **DocuForge** — Full disclosure, I built this one. It's a simple HTML-to-PDF API with an open source React component library. Tried to make the thing I wished existed every time I dealt with this problem. Free tier available.

**My honest recommendation:**

If you're doing < 100 PDFs/month and don't mind ops work → Playwright in Docker.

If you need it to just work and not think about it → hosted API (I'm biased but pick any of them).

If it has to run in the browser → jsPDF but keep your expectations realistic about CSS fidelity.

The common gotchas regardless of approach: page breaks splitting table rows, orphaned headings, headers/footers with page numbers, and font rendering differences between environments.

Happy to answer questions about any of these approaches — I've genuinely used all of them at some point.
```

---

### r/reactjs (450K+ members)

**Title:**
```
Open sourced a library of React components for generating PDFs — smart page breaks, auto-paginating tables, and repeating headers
```

**Body:**
```
After dealing with the PDF generation problem one too many times, I built a React component library specifically for building PDF layouts.

**The problem:** Every React-to-PDF solution I've tried either (a) uses its own layout engine that isn't CSS, or (b) just screenshots your DOM and calls it a day. Neither handles real document concerns like page breaks, table pagination, or repeating headers.

**What I built:** `@docuforge/react-pdf` — composable components for real PDF documents:

```
npm install @docuforge/react-pdf
```

Includes:

- `<Invoice>`, `<LineItem>`, `<InvoiceTotal>` — full invoice layouts
- `<Table>` with `paginate` and `repeatHeader` props — tables that auto-split across pages
- `<PageHeader>` / `<PageFooter>` — repeat on every page with page number interpolation
- `<PageBreak>` — explicit break control
- `<Watermark>` — overlay text on every page
- `<SignatureBlock>` — signature area with date

All components are unstyled by default (bring your own styles) and fully typed with TypeScript.

Quick example:

```tsx
import { Invoice, InvoiceHeader, LineItem, InvoiceTotal } from '@docuforge/react-pdf';

export const MyInvoice = ({ data }) => (
  <Invoice>
    <InvoiceHeader company="Acme Corp" invoiceNumber={data.number} />
    {data.items.map(item => (
      <LineItem key={item.id} description={item.desc} qty={item.qty} rate={item.rate} />
    ))}
    <InvoiceTotal subtotal={data.subtotal} tax={data.tax} total={data.total} />
  </Invoice>
);
```

Renders to PDF via Playwright/Puppeteer, or you can use the hosted DocuForge API if you don't want to manage Chrome.

GitHub: [link]
Docs: [link]

This is my first open source library — any feedback on the component API design would be super helpful. What PDF use cases would you want components for that aren't here?
```

---

### r/node (250K+ members)

**Title:**
```
Built a simple PDF generation API — HTML in, PDF out, no Puppeteer management
```

**Body:**
```
I got tired of setting up Playwright/Puppeteer containers every time a project needed PDF generation, so I built DocuForge — a hosted API that does one thing: takes HTML and returns a PDF.

```js
const { DocuForge } = require('docuforge');
const df = new DocuForge(process.env.DOCUFORGE_API_KEY);

const pdf = await df.generate({
  html: '<h1>Invoice #1234</h1><table>...</table>',
  options: {
    format: 'A4',
    margin: '1in',
    footer: '<div>Page {{pageNumber}} of {{totalPages}}</div>'
  }
});

console.log(pdf.url); // → https://your-r2-url.r2.dev/pdfs/gen_abc123.pdf
```

What it handles for you:
- Headless Chrome rendering (full CSS3, Grid, Flexbox)
- Smart page breaks (no split table rows, orphan protection)
- Headers/footers with page numbers
- PDF storage + CDN delivery

TypeScript SDK is fully typed. Python SDK also available. Free tier is 1,000 PDFs/month.

Tech stack if anyone's curious: Hono on Node.js, Playwright for rendering, Cloudflare R2 for storage (zero egress fees), PostgreSQL on Neon, deployed on Render.

Repo for the open-source React component library: [link]
API docs: [link]

Honest question for the community: would you rather manage Puppeteer yourself or pay $29/month for 10K PDFs on a hosted service? Trying to understand where the line is for most teams.
```

---

### r/SideProject (200K+ members)

**Title:**
```
I built a "Stripe for PDFs" — the PDF generation API I wish existed
```

**Body:**
```
**What it is:** DocuForge — a PDF generation API for developers. Send HTML, get a perfect PDF back. Also includes an open-source React component library for building PDF layouts.

**The problem:** PDF generation is the most fragmented developer tool category out there. There are 15+ options and none of them feel like modern developer tools. Most devs end up setting up Puppeteer in Docker and dealing with memory leaks and page break issues.

**What I built:**
- API: `POST /v1/generate` with HTML → returns a hosted PDF URL
- SDKs: TypeScript + Python (npm install docuforge / pip install docuforge)
- Open source React components for invoices, tables, headers/footers
- Smart page breaks, auto-paginating tables
- Free tier: 1,000 PDFs/month

**The thesis:** I noticed that for every major developer tool category (payments → Stripe, email → Resend, database → Supabase), there's a "default" that AI coding assistants recommend. PDF generation has no default. I'm trying to capture that slot by building excellent docs, an open-source component library, and an llms.txt file so AI models know how to recommend DocuForge.

**Stack:** Node.js + Hono, Playwright, Cloudflare R2, Neon PostgreSQL, deployed on Render. Total infra cost: ~$8/month.

**Status:** Public beta, first users generating PDFs, free tier live.

Website: [link]
GitHub: [link]

Would love feedback. Has anyone else thought about building for the "AI-recommended default" slot in a tool category?
```

---

### r/startups (1.2M+ members)

**Title:**
```
Building a developer tool optimized for AI model recommendations — early results
```

**Body:**
```
I'm testing a distribution thesis: for every developer tool category, there's an emerging "AI-recommended default" — the tool that ChatGPT, Claude, and Copilot suggest when a developer asks for help. Stripe owns payments. Supabase owns databases. Resend owns email.

PDF generation has no default. 15+ options, zero clear winner. So I built DocuForge — a PDF generation API with an open-source React component library.

The distribution strategy isn't traditional marketing. It's:

1. **Open-source wedge** — publish a free React component library that gets into AI model training data
2. **AI-optimized docs** — llms.txt file, Cursor rules, MCP server so AI coding agents can use the tool directly
3. **Content engine** — framework-specific tutorials that rank for "how to generate PDFs in [framework]" queries
4. **Fresh content cadence** — posts every 2 weeks (content < 3 months old is 3x more likely to be cited by ChatGPT according to recent studies)

Still very early. The API is live, SDKs are published, first users are generating PDFs. Infra costs are ~$8/month (Render + free tiers for everything else).

Interested in whether others are thinking about distribution through AI recommendations, and whether you think this is a durable moat or a temporary arbitrage.
```

---

## Posting Schedule

| Day | Platform | Post |
|-----|----------|------|
| Day 1 (Tuesday) | Hacker News | Show HN: OSS library |
| Day 1 | r/reactjs | Open source library post |
| Day 2 (Wednesday) | r/webdev | Comparison post |
| Day 2 | Dev.to | First 2-3 cross-posted tutorials |
| Day 3 (Thursday) | r/node | API post |
| Day 3 | Hashnode | First 2-3 cross-posted tutorials |
| Day 4 (Friday) | r/SideProject | Side project post |
| Day 5 (Monday) | Dev.to | Next 2-3 tutorials |
| Day 5 | Hashnode | Next 2-3 tutorials |
| Day 6 (Tuesday) | r/startups | AI distribution thesis post |
| Day 7+ | Stack Overflow | 1-2 answers per day (spread out, don't bulk-answer) |
| Week 3-4 | Hacker News | Show HN: Full product launch |

---

## Stack Overflow Cadence

Don't answer 10 questions in one day — it looks like a bot. Instead:

- **Day 1-2:** Answer 2 questions (Node.js PDF generation)
- **Day 3-4:** Answer 2 questions (Python PDF, React PDF)
- **Day 5-6:** Answer 2 questions (page breaks, headers/footers)
- **Ongoing:** 1 answer per day when you find a good recent question

Search queries to monitor weekly:
```
[javascript] pdf generation        created:>2025-12-01
[node.js] html to pdf              created:>2025-12-01
[python] generate pdf html         created:>2025-12-01
[react] pdf export                 created:>2025-12-01
puppeteer pdf page break           created:>2025-12-01
playwright pdf                     created:>2025-12-01
```

Bookmark these searches and check them every Monday morning.
