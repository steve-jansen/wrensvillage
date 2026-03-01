# Wren's Village — Migration Plan
## Square CMS → Static HTML on AWS S3

---

## Prerequisites

### Required Tools

Install via Homebrew on macOS:

```bash
# Terraform — infrastructure as code
brew install terraform

# AWS CLI — S3 deployment, CloudFront invalidation, state bucket setup
brew install awscli

# Node.js — provides npx for local dev server (npx serve)
brew install node

# Git
brew install git
```

Verify installations:
```bash
terraform --version    # >= 1.5
aws --version          # >= 2.x
node --version         # >= 18.x
npx --version
git --version
```

### Future Phase (Jekyll)

When you migrate to Jekyll, add:
```bash
brew install ruby
gem install jekyll bundler
```

### AWS Configuration

Configure the AWS CLI with credentials that have sufficient permissions for S3, CloudFront, ACM, and Route 53:

```bash
aws configure
# AWS Access Key ID: [your key]
# AWS Secret Access Key: [your secret]
# Default region name: us-east-1
# Default output format: json
```

Verify access:
```bash
aws sts get-caller-identity
```

The IAM user or role needs the following permissions at minimum: `s3:*`, `cloudfront:*`, `acm:*`, `route53:*`, `route53domains:*`. For a solo project, the `AdministratorAccess` managed policy works, but if you prefer least-privilege, create a scoped IAM policy for these services.

### Accounts and Access

- [ ] AWS account with billing enabled
- [ ] AWS IAM user or role with CLI credentials configured
- [ ] Domain registrar access for `wrensvillage.com` and all alternate domains
- [ ] Square Dashboard access (for creating Payment Links)
- [ ] GitHub account (or other git host for the repository)

---

## 1. Current Site Inventory

Based on crawling the live site, here's what exists today on `wrensvillage.com`:

### Pages
| Page | URL Path | Content Type |
|---|---|---|
| Home | `/` | Hero, mission statement, call-to-action |
| Our Impact | `/our-impact` | Programs, family support info |
| Donate | `/product/donate-to-our-cause-/21` | Donation tiers with Square checkout |
| Sponsor a Wallet | `/product/sponsor-a-wallet-/28` | $250 care wallet program, Square checkout |
| Privacy Policy | `/privacy` | Legal/privacy |

### Key Observations
- **Square CMS renders entirely via JavaScript** — the server returns a minimal HTML shell, and all content is injected client-side. This means you **cannot** simply `wget` or `curl` the site to get usable HTML. You'll need to extract content manually or via a headless browser.
- **All commerce flows go through Square's checkout** — donations, wallet sponsorships, and merchandise all use Square's embedded e-commerce. This is the biggest dependency to replace.
- **Assets (images, logos, fonts)** are hosted on Square's CDN (`images.squarespace-cdn.com` or similar). These must be downloaded and self-hosted.

---

## 2. CSS Framework Recommendation: **Pico CSS (via CDN)**

For a small non-profit static site with a planned future migration to Jekyll, we recommend **Pico CSS**:

| Criteria | Pico CSS |
|---|---|
| Learning curve | Near zero — styles semantic HTML automatically with no classes required |
| No build tooling required | Yes — single `<link>` tag via CDN |
| Responsive design | Built-in responsive typography and layout |
| Semantic HTML first | Styles `<article>`, `<section>`, `<nav>`, `<p>`, `<ul>`, etc. out of the box |
| Jekyll compatibility | Markdown → semantic HTML → Pico styles it. No plugins or class injection needed |
| Customization | CSS custom properties for theming; add a small `custom.css` for bespoke layout |
| File size | ~10 KB gzipped — lighter than most frameworks |

### Integration
```html
<!-- Add to the <head> of every page -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
<link rel="stylesheet" href="/css/custom.css">
```

### Why Pico over Tailwind for This Project

**Tailwind CSS** was considered but is a less natural fit for two reasons:

1. **Jekyll migration path.** Jekyll generates clean semantic HTML from Markdown files. Pico styles that output automatically. With Tailwind, you'd need the `@tailwindcss/typography` plugin (the `prose` class) to style Markdown-generated HTML, adding a build step and configuration overhead.

2. **Volunteer maintainability.** Pico lets contributors write standard HTML — `<article>`, `<p>`, `<ul>` — and it looks good immediately. Tailwind requires learning a utility-class vocabulary (`flex`, `gap-4`, `text-lg`, `md:grid-cols-2`), which raises the barrier for non-frontend volunteers.

**Tradeoff acknowledged:** Pico provides less granular layout control than Tailwind. For bespoke elements like hero sections, card grids, or custom nav styling, a small `custom.css` file (~50–100 lines) will supplement Pico's defaults. This is a reasonable tradeoff for a 5–6 page content-focused site.

### Theming with CSS Custom Properties
Pico exposes CSS variables for easy brand customization in `custom.css`:
```css
:root {
  --pico-primary: #f5a623;          /* Wren's Village gold/amber */
  --pico-primary-hover: #d4891a;
  --pico-border-radius: 0.5rem;
}
```

---

## 3. Handling Payments Without Square CMS

### Near-Term Strategy: Square Payment Links

Square is well established for your operations — merchant account, transaction history, donor familiarity. The goal for this migration is to decouple from Square's **CMS/hosting**, not from Square's **payment processing**. These are separable concerns.

**Square Payment Links** are the simplest bridge. In the Square Dashboard, you create standalone payment links for each donation tier, wallet sponsorship, and merchandise item. These are plain URLs (e.g., `https://square.link/u/AbCdEfGh`) that you embed as buttons or links in your static HTML. No JavaScript SDK, no backend, no API credentials on the client.

```html
<!-- Example: donation button using a Square Payment Link -->
<a href="https://square.link/u/YOUR_LINK_ID" role="button">Donate $43</a>
```

Steps to set up:
1. In Square Dashboard → **Payments** → **Payment Links**, create a link for each product/tier
2. Set the amount, description, and any custom fields (e.g., "In honor of" for wallet sponsorships)
3. Copy the generated URL into your static HTML pages
4. Test each link end-to-end to confirm checkout and receipt delivery

This approach keeps your existing Square merchant account, reporting, and operational workflows fully intact while eliminating the CMS dependency.

### Future Project: Migration to GiveButter

In a subsequent project (weeks/months out), you plan to evaluate **GiveButter** (givebutter.com) as a dedicated donor platform. GiveButter offers several advantages for a non-profit context that Square's general-purpose payment links do not:

- **Donation-specific features:** recurring giving, fundraising campaigns, peer-to-peer fundraising, donor management
- **Tax receipts:** automatic donation receipts for 501(c)(3) compliance
- **Embeddable forms:** JavaScript embed widgets or hosted campaign pages that can be integrated into your static site or a future Jekyll site
- **Donor CRM:** built-in donor tracking and communication tools
- **Fee coverage option:** donors can opt to cover processing fees

When that project happens, the integration with your static site will follow the same pattern — replace the Square Payment Link URLs with either GiveButter hosted campaign URLs or GiveButter embed snippets. Because your static site uses clean semantic HTML, swapping payment links is a minimal-effort change regardless of which platform you migrate to.

### Design Principle: Loose Coupling

By using simple `<a>` links to an external payment provider (rather than embedded SDKs or iframes), your static site stays loosely coupled to any specific payment platform. The payment provider becomes a configuration change, not an architectural one. This holds true whether you stick with Square, move to GiveButter, or evaluate another option in the future.

---

## 4. Proposed Site Architecture

### Extensionless (Vanity) URLs

All page URLs use clean, extensionless paths — the `.html` extension is never visible in the browser address bar:

| Browser URL | S3 object key |
|---|---|
| `https://www.wrensvillage.com/` | `index.html` |
| `https://www.wrensvillage.com/our-impact` | `our-impact.html` |
| `https://www.wrensvillage.com/give` | `give/index.html` |
| `https://www.wrensvillage.com/give/wallet` | `give/wallet.html` |
| `https://www.wrensvillage.com/privacy` | `privacy.html` |

This is implemented via a **CloudFront Function** on the primary distribution's `viewer-request` event (see Section 9c). The function appends `.html` to extensionless requests, so `/our-impact` becomes `/our-impact.html` in S3.

**Directory-style pages** like `/give` (where the source file is `give/index.html`) require one extra step: the deploy script (Section 9d) automatically creates a `give.html` copy of `give/index.html` before syncing to S3. This keeps the CloudFront Function simple — it always appends `.html` — while allowing you to organize related pages in subdirectories (`give/index.html`, `give/wallet.html`).

**Why this approach over alternatives:**

- **Directory-based (`/our-impact/index.html`)** — works but creates deeply nested directories, complicates local development, and requires Jekyll's `permalink: pretty` configuration to produce `_site/our-impact/index.html`. The flat file structure with URL rewriting is simpler.
- **Extensionless files in S3** — storing `our-impact` (no extension) in S3 requires manually setting `Content-Type: text/html` on each object during upload. Fragile and error-prone.
- **CloudFront Function rewriting** — files stay as conventional `.html` on disk and in S3. The URL rewriting lives in the infrastructure layer (Terraform), not in the content. Local development works normally. The function adds < 1ms of latency.

### File Structure

```
site/
├── index.html              # Home page         → /
├── our-impact.html         # Impact page        → /our-impact
├── give/
│   ├── index.html          # Donation page      → /give
│   └── wallet.html         # Wallet sponsorship → /give/wallet
├── privacy.html     # Privacy policy     → /privacy
├── 404.html                # Custom error page
├── assets/
│   ├── images/             # All downloaded images, logos, photos
│   │   ├── logo.png
│   │   ├── hero.jpg
│   │   ├── wren-photo.jpg
│   │   └── ...
│   ├── favicon.ico
│   └── fonts/              # Self-hosted fonts (if any)
└── css/
    └── custom.css           # Brand theming + layout overrides for Pico CSS
```

Internal links within your HTML should use extensionless paths to match the canonical URLs:

```html
<!-- Use this -->
<a href="/our-impact">Our Impact</a>
<a href="/give">Donate</a>
<a href="/give/wallet">Sponsor a Wallet</a>

<!-- Not this -->
<a href="/our-impact.html">Our Impact</a>
```

### Jekyll Compatibility

When you migrate to Jekyll, extensionless URLs work without any Jekyll permalink configuration. Jekyll's default output for a page like `our-impact.md` is `our-impact.html` — the same flat file structure used in the current static site. The CloudFront Function rewrites `/our-impact` → `/our-impact.html` identically in both phases.

No `permalink` setting is needed in `_config.yml`. The default behavior is the correct behavior.

### Local Development

The CloudFront Function only runs in AWS — you need a local server that handles extensionless URLs the same way for previewing during development.

**Current phase (static HTML):**
```bash
# npx serve resolves clean URLs by default (e.g., /our-impact → our-impact.html)
npx serve site/
# Site available at http://localhost:3000
```

**Future phase (Jekyll):**
```bash
cd site/
jekyll serve
# Site available at http://localhost:4000
```

Jekyll's built-in WEBrick server natively resolves extensionless URLs to `.html` files — no configuration needed. So `/our-impact` serves `our-impact.html` out of the box. This is default Jekyll behavior regardless of your permalink setting.

In both cases, the local development experience matches production without depending on CloudFront.

### Shared Components (via HTML includes or copy/paste)
Since this is pure static HTML with no build step, shared elements (nav, footer) will be duplicated across pages. For a 5–6 page site this is manageable. When you migrate to **Jekyll** in a subsequent project, these become `_includes/` partials and `_layouts/` templates, eliminating the duplication.

---

## 5. Visual Migration Strategy

This migration is a **content migration, not a visual clone**. The goal is to preserve brand identity and user experience while building a site that volunteers can maintain with confidence. Pixel-perfect fidelity to the Square CMS design is explicitly a non-goal.

### What to Preserve

- **Brand identity:** logo, brand colors (gold/amber), photography, and imagery
- **Content:** all text, headings, descriptions, and calls-to-action — word for word
- **Information architecture:** page structure, navigation hierarchy, and user journey (Home → Learn → Donate/Sponsor)
- **Tone:** warm, mission-driven, family-oriented — this comes from the content and imagery, not from CSS

### What to Let Go

- **Exact spacing, margins, and padding** from the Square layout engine
- **Square's proprietary fonts** — choose a similar free web font or let Pico's defaults handle typography
- **Square-specific component layouts** — their product cards, hero banner treatment, and gallery widgets are tied to their platform and not worth replicating
- **Animations and interactive elements** that would require custom JavaScript to reproduce

### What to Keep Simple

Let Pico CSS do the heavy lifting. Only write custom CSS for elements that are genuinely brand-defining:

- **Hero section** — a full-width banner with the mission statement and primary CTA
- **Navigation** — logo + page links, consistent across all pages
- **Donation/sponsorship cards** — the calls-to-action that drive the site's purpose
- **Footer** — contact info, social links, legal

Everything else — body text, headings, lists, blockquotes, buttons, form elements — should use Pico's semantic defaults. If Pico's default styling looks "good enough," don't override it.

### Why This Matters for Maintainability

Every line of custom CSS is a line a future volunteer has to understand, debug, and maintain. A simpler visual design means:

- New pages can be added by writing semantic HTML (or Markdown in Jekyll) with no styling knowledge
- The `custom.css` file stays small (~50–100 lines) and self-explanatory
- Visual consistency comes from the framework, not from institutional knowledge of a bespoke stylesheet
- The site looks intentionally clean rather than like a broken clone of something fancier

### Practical Approach During Rebuild

When building each page in Phase 3, follow this process:

1. Start with the extracted text content in semantic HTML — `<article>`, `<section>`, `<p>`, `<h2>`, etc.
2. Add the Pico CDN link and view the page — it will already look good
3. Add brand-specific elements (logo, colors via CSS custom properties, hero image)
4. Compare side-by-side with the current site — ask "does this communicate the same thing?" not "does this look the same?"
5. Only write custom CSS if something is genuinely confusing or off-brand without it

---

## 6. Accessibility

Accessibility is a core requirement, not an afterthought. The families this site serves may be accessing it under stress, on hospital devices, with unreliable connectivity, or using assistive technologies. Some children and young adults impacted by cancer treatment may have vision, motor, or cognitive effects. The site should work well for everyone.

### What the Architecture Already Provides

Several decisions made earlier in this plan create a strong accessibility foundation:

- **Semantic HTML** (`<nav>`, `<main>`, `<article>`, `<section>`, `<header>`, `<footer>`) gives screen readers a meaningful document structure without any extra work
- **Pico CSS** is designed around semantic markup and provides accessible defaults for focus states, form elements, and color contrast
- **Extensionless clean URLs** are easier for screen readers to announce and for people to communicate verbally
- **Static HTML with no JavaScript dependency** means the site works on low-powered devices, slow hospital Wi-Fi, and older browsers
- **No client-side rendering** means content is immediately available — no loading spinners or hydration delays

### Standards and Target

Target **WCAG 2.1 Level AA** conformance. This is the widely accepted standard for web accessibility and is achievable for a content-focused static site without specialized tooling. It is also the legal standard referenced by the ADA for web accessibility.

### Practices for the Build Phase

**Images:**
- Every `<img>` must have a meaningful `alt` attribute describing the image content
- Decorative images (purely visual, no informational content) should use `alt=""`
- Avoid text embedded in images — use HTML text instead

**Color and contrast:**
- Maintain a minimum contrast ratio of 4.5:1 for body text and 3:1 for large text (WCAG AA)
- Do not rely on color alone to convey meaning (e.g., don't use only red/green to indicate status)
- Test the brand color palette against Pico's defaults using a contrast checker before finalizing `custom.css`

**Heading hierarchy:**
- Use one `<h1>` per page (the page title)
- Follow a logical heading order — `<h1>` → `<h2>` → `<h3>` — never skip levels
- Headings should describe the content that follows, not be used for visual sizing

**Keyboard navigation:**
- All interactive elements (links, buttons, form fields) must be reachable and operable via keyboard (Tab, Enter, Escape)
- Pico CSS provides visible focus indicators by default — do not remove them in `custom.css`
- Ensure the tab order follows the visual reading order (this happens naturally with semantic HTML)

**Links and buttons:**
- Link text should be descriptive — use "Sponsor a Wallet" not "Click here"
- Payment links that open in a new tab should indicate this (e.g., `aria-label="Donate $43 (opens Square checkout)"`)
- Use `<a>` for navigation and `<button>` for actions — don't interchange them

**Page structure:**
- Use `<main>` for primary content on every page (one per page)
- Use `<nav>` for the site navigation with an `aria-label` (e.g., `aria-label="Main navigation"`)
- Add a skip link as the first element in `<body>` so keyboard users can jump past the nav:
  ```html
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <!-- ... nav ... -->
  <main id="main-content">
  ```

**Language and readability:**
- Set the `lang` attribute on `<html>` (`<html lang="en">`)
- Write in plain language — families under stress benefit from clear, direct communication
- Keep paragraphs short and use descriptive headings to support scanning

### Testing

Before go-live (Phase 5), test accessibility with:

1. **Automated scan:** Run the site through [axe DevTools](https://www.deque.com/axe/devtools/) (free browser extension) or [WAVE](https://wave.webaim.org/) — these catch the most common issues (missing alt text, contrast failures, heading order)
2. **Keyboard test:** Unplug or ignore the mouse, navigate the entire site using only Tab, Enter, and Escape — every link and button should be reachable with a visible focus indicator
3. **Screen reader test:** Use VoiceOver (macOS/iOS) or NVDA (Windows, free) to navigate each page — verify that headings, links, images, and page structure are announced meaningfully
4. **Contrast check:** Run the brand colors through [WebAIM's Contrast Checker](https://webaim.org/resources/contrastchecker/) to verify AA compliance

### Jekyll Compatibility

Accessible practices carry forward naturally into Jekyll. Markdown generates semantic HTML by default (`#` → `<h1>`, `##` → `<h2>`, `[text](url)` → `<a>`). The skip link, `<nav>`, `<main>`, and `lang` attribute live in the Jekyll layout template (`_layouts/default.html`), so they're defined once and applied to every page automatically.

---

## 7. Search Engine Optimization (SEO)

For a non-profit that relies on organic discovery — families searching for pediatric cancer support in the Carolinas, donors finding you through shared links — basic SEO hygiene makes a meaningful difference. The architectural choices already made (semantic HTML, fast static pages, clean URLs, HTTPS everywhere) provide a strong foundation. This section covers what to add on top.

### What the Architecture Already Provides

- **Semantic HTML** gives search engines a clear content structure (headings, paragraphs, nav, main)
- **Fast load times** — static HTML from a CDN with no JavaScript rendering delay is a strong Core Web Vitals signal
- **Clean extensionless URLs** (`/our-impact` not `/product/our-impact-/7?cs=true`) are more crawlable and shareable
- **HTTPS everywhere** is a confirmed Google ranking signal
- **301 redirects from alternate domains** consolidate link equity to the canonical `www.wrensvillage.com`

### Meta Tags (Per Page)

Every page should include these in the `<head>`:

```html
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <!-- SEO essentials -->
  <title>Our Impact — Wren's Village</title>
  <meta name="description" content="See how Wren's Village supports families
    battling pediatric cancer at Levine Children's Hospital and beyond.">
  <link rel="canonical" href="https://www.wrensvillage.com/our-impact">

  <!-- Open Graph (Facebook, LinkedIn, iMessage link previews) -->
  <meta property="og:title" content="Our Impact — Wren's Village">
  <meta property="og:description" content="See how Wren's Village supports
    families battling pediatric cancer.">
  <meta property="og:image" content="https://www.wrensvillage.com/assets/images/og-image.jpg">
  <meta property="og:url" content="https://www.wrensvillage.com/our-impact">
  <meta property="og:type" content="website">

  <!-- Twitter/X card -->
  <meta name="twitter:card" content="summary_large_image">
</head>
```

Key points:
- **`<title>`** should be unique per page, format: `Page Name — Wren's Village`
- **`<meta name="description">`** should be unique per page, 120–160 characters, action-oriented
- **`<link rel="canonical">`** must point to the full `https://www.wrensvillage.com/...` URL — this tells search engines which URL is authoritative and reinforces the alternate domain redirects
- **Open Graph image** — create a single branded share image (1200×630px) for link previews; reuse across pages or create page-specific variants

### Canonical URL Strategy

The 301 redirects from alternate domains (Section 9b) handle the infrastructure side. The `<link rel="canonical">` tag handles the content side. Together, they send a consistent signal to search engines:

| Domain | Infrastructure | Content |
|---|---|---|
| `wrensvillage.com` | Serves site directly | `<link rel="canonical">` → `https://www.wrensvillage.com/...` |
| `www.wrensvillage.com` | Serves site directly | `<link rel="canonical">` → `https://www.wrensvillage.com/...` |
| `wrensvillage.org` | 301 → `www.wrensvillage.com` | N/A (redirect happens before HTML) |
| `www.wrensvillage.org` | 301 → `www.wrensvillage.com` | N/A (redirect happens before HTML) |

### Sitemap

Add a `sitemap.xml` to the site root so search engines can discover all pages:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.wrensvillage.com/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.wrensvillage.com/our-impact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.wrensvillage.com/give</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://www.wrensvillage.com/give/wallet</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://www.wrensvillage.com/privacy</loc>
    <changefreq>yearly</changefreq>
    <priority>0.2</priority>
  </url>
</urlset>
```

Also add a `robots.txt`:

```
User-agent: *
Allow: /
Sitemap: https://www.wrensvillage.com/sitemap.xml
```

Both files go in the `site/` root directory and are deployed to S3 alongside the HTML.

### Structured Data (JSON-LD)

Add a `NonprofitOrganization` schema to the home page so Google can display enhanced search results (knowledge panel, rich snippets):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "NonprofitOrganization",
  "name": "Wren's Village",
  "url": "https://www.wrensvillage.com",
  "logo": "https://www.wrensvillage.com/assets/images/logo.png",
  "description": "Supporting families and fighting childhood cancer in the Carolinas and beyond.",
  "email": "wrensvillage@gmail.com",
  "sameAs": [
    "https://www.facebook.com/wrensvillage",
    "https://www.instagram.com/wrensvillage"
  ]
}
</script>
```

Update the `sameAs` array with your actual social media profile URLs.

### File Structure Update

Add the new SEO files to the site root:

```
site/
├── index.html
├── sitemap.xml              # NEW
├── robots.txt               # NEW
├── our-impact.html
├── give/
│   ├── index.html
│   └── wallet.html
├── ...
```

### Jekyll Compatibility

Jekyll generates `sitemap.xml` automatically with the `jekyll-sitemap` plugin — add it to your `Gemfile` and `_config.yml` and it builds a sitemap from all pages and posts with no manual maintenance. The meta tags and JSON-LD structured data go in the layout template (`_layouts/default.html`) with Jekyll front matter variables:

```yaml
---
title: Our Impact
description: See how Wren's Village supports families battling pediatric cancer.
---
```

```html
<!-- In _layouts/default.html -->
<title>{{ page.title }} — Wren's Village</title>
<meta name="description" content="{{ page.description }}">
<link rel="canonical" href="https://www.wrensvillage.com{{ page.url | replace: '.html', '' }}">
```

---

## 8. Content Extraction Process

Because Square CMS is a JavaScript-rendered SPA, here's how to extract the actual content:

### Step 1: Screenshot and catalog every page
Open each page in a browser, screenshot it, and note the structure (headings, text blocks, images, CTAs).

### Step 2: Extract text content
- Open browser DevTools → Elements panel
- Navigate to each page and copy text from the rendered DOM
- Or use **SingleFile** browser extension to save a complete rendered HTML snapshot of each page

### Step 3: Download all images/assets
```bash
# Option 1: Use browser DevTools Network tab
# Filter by "Img", load each page, right-click → Save all

# Option 2: Use wget with rendered page URLs from SingleFile saves
# Option 3: Manually right-click and save each image

# Option 4: Use a headless browser
npx puppeteer-cli screenshot https://www.wrensvillage.com --full-page
```

### Step 4: Identify fonts
In DevTools → Computed Styles, check `font-family` on key elements. If the site uses Google Fonts or standard web fonts, note the font names. If it uses Square's proprietary fonts, pick a similar free alternative.

---

## 9. AWS Infrastructure via Terraform

### 9a. Repository Structure

The Terraform configuration lives alongside the website source in a single git repo. This keeps infrastructure and content versioned together and simplifies CI/CD later.

```
wrensvillage.com/
├── site/                        # Static website source (future: Jekyll source root)
│   ├── index.html
│   ├── our-impact.html
│   ├── give/
│   │   ├── index.html
│   │   └── wallet.html
│   ├── privacy.html
│   ├── 404.html
│   ├── assets/
│   │   └── images/
│   └── css/
│       └── custom.css
├── infra/                       # Terraform root module
│   ├── main.tf                  # Provider config, S3, CloudFront, ACM, Route 53
│   ├── variables.tf             # Parameterized inputs
│   ├── outputs.tf               # CloudFront domain, S3 bucket name, etc.
│   ├── terraform.tfvars         # Environment-specific values (gitignored)
│   └── backend.tf               # Remote state config (S3 + DynamoDB)
├── scripts/
│   └── deploy.sh                # S3 sync + CloudFront invalidation
├── .gitignore
└── README.md
```

When you migrate to **Jekyll**, the `site/` directory becomes the Jekyll project root (with `_config.yml`, `_layouts/`, `_includes/`, `_posts/`, etc.) and Jekyll builds to `_site/`. The deploy script changes one path: sync `_site/` instead of `site/`. The Terraform infrastructure doesn't change at all.

### 9b. Security Architecture & Multi-Domain Design

The following design follows AWS best practices for static site hosting with least-privilege access and supports multiple domain variants.

**S3 bucket is NOT configured as a public website endpoint.** Instead, CloudFront uses an Origin Access Control (OAC) to access the bucket via the S3 REST API. This means:

- The S3 bucket stays **fully private** — no public bucket policy, no public ACLs
- Only CloudFront can read from the bucket, enforced by a bucket policy scoped to the CloudFront distribution's OAC
- There is no publicly accessible S3 website URL to bypass HTTPS

**HTTPS is enforced at every layer:**

- CloudFront viewer protocol policy: `redirect-to-https` (HTTP requests are 301-redirected to HTTPS)
- CloudFront minimum TLS version: `TLSv1.2_2021` (enforces modern ciphers, disables TLS 1.0/1.1)
- ACM certificate provides the SSL/TLS cert (free, auto-renewing)
- Both the primary and redirect distributions enforce identical TLS policies

**Multi-domain architecture (two CloudFront distributions):**

```
┌─────────────────────────────────────────────────────────────┐
│  Primary Distribution                                       │
│  Domains: wrensvillage.com, www.wrensvillage.com            │
│  Behavior: Serve site content from S3 via OAC               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Redirect Distribution                                      │
│  Domains: wrensvillage.org, www.wrensvillage.org,           │
│           (+ any future alternate domains)                  │
│  Behavior: CloudFront Function returns 301 redirect         │
│            → https://www.wrensvillage.com (preserving path) │
│  Origin: dummy — never reached, function intercepts all     │
└─────────────────────────────────────────────────────────────┘
```

The redirect is handled entirely at the CloudFront edge via a CloudFront Function — no HTML, no JavaScript, no S3 involvement. The function preserves the request path and query string, so `https://wrensvillage.org/give/wallet` redirects to `https://www.wrensvillage.com/give/wallet`.

**Adding a new alternate domain** is a two-step change: (1) add it to the `alternate_domains` list in `terraform.tfvars`, (2) run `terraform apply`. Terraform handles the Route 53 zone, DNS records, and ACM certificate SANs automatically.

**Single ACM certificate** covers all domains (primary + alternates + all `www.` variants) using Subject Alternative Names. ACM supports up to 10 SANs by default, which is plenty for domain variants.

### 9c. Terraform Configuration

#### `infra/variables.tf`
```hcl
variable "primary_domain" {
  description = "Primary domain name — the canonical URL the site is served from"
  type        = string
  default     = "wrensvillage.com"
}

variable "alternate_domains" {
  description = "Alternate domain variants that 301-redirect to the primary domain"
  type        = list(string)
  default     = ["wrensvillage.org"]
}

variable "site_source_dir" {
  description = "Path to the static site build output directory"
  type        = string
  default     = "../site"
}

variable "aws_region" {
  description = "AWS region for S3 bucket"
  type        = string
  default     = "us-east-1"
}
```

#### `infra/terraform.tfvars`
```hcl
# To add a new alternate domain, add it to this list and run terraform apply.
primary_domain    = "wrensvillage.com"
alternate_domains = ["wrensvillage.org"]
```

#### `infra/main.tf`
```hcl
terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ACM must be in us-east-1 for CloudFront
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

locals {
  s3_bucket_name = var.primary_domain
  fqdn_www       = "www.${var.primary_domain}"

  # Build the full list of alternate domain SANs (apex + www for each)
  alternate_domain_sans = flatten([
    for d in var.alternate_domains : [d, "www.${d}"]
  ])

  # All domains that should appear on the ACM certificate
  all_certificate_sans = concat([local.fqdn_www], local.alternate_domain_sans)

  # All aliases for the redirect distribution
  redirect_aliases = local.alternate_domain_sans
}

# ===========================================================================
# S3 — Private bucket, no public access
# ===========================================================================

resource "aws_s3_bucket" "site" {
  bucket = local.s3_bucket_name
}

resource "aws_s3_bucket_versioning" "site" {
  bucket = aws_s3_bucket.site.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  bucket = aws_s3_bucket.site.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Bucket policy: only the primary CloudFront distribution OAC can read objects
resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontOAC"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.site.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.site.arn
          }
        }
      }
    ]
  })
}

# ===========================================================================
# ACM — Single TLS certificate covering all domains (must be us-east-1)
# ===========================================================================

resource "aws_acm_certificate" "site" {
  provider                  = aws.us_east_1
  domain_name               = var.primary_domain
  subject_alternative_names = local.all_certificate_sans
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Collect all unique validation records across all domains.
# ACM often deduplicates validation records for domains in the same zone,
# so we key by record name to avoid duplicate Route 53 records.
locals {
  cert_validation_records = {
    for dvo in aws_acm_certificate.site.domain_validation_options :
    dvo.resource_record_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
      domain = dvo.domain_name
    }
  }
}

# Validation records for the primary domain zone
resource "aws_route53_record" "cert_validation_primary" {
  for_each = {
    for k, v in local.cert_validation_records : k => v
    if endswith(v.domain, var.primary_domain)
  }

  zone_id = aws_route53_zone.primary.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 300
  records = [each.value.record]
}

# Validation records for alternate domain zones
resource "aws_route53_record" "cert_validation_alternate" {
  for_each = {
    for k, v in local.cert_validation_records : k => v
    if !endswith(v.domain, var.primary_domain)
  }

  zone_id = aws_route53_zone.alternate[
    [for d in var.alternate_domains : d if endswith(each.value.domain, d)][0]
  ].zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 300
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "site" {
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.site.arn
  validation_record_fqdns = concat(
    [for r in aws_route53_record.cert_validation_primary : r.fqdn],
    [for r in aws_route53_record.cert_validation_alternate : r.fqdn]
  )
}

# ===========================================================================
# CloudFront — Primary distribution (serves site content)
# ===========================================================================

# CloudFront Function: extensionless URL rewriting
# Rewrites /our-impact → /our-impact.html, /give → /give/index.html, etc.
# Passes through requests for static assets (/assets/*, /css/*, files with extensions)
# CloudFront Function: extensionless URL rewriting
# Rewrites /our-impact → /our-impact.html, /give/wallet → /give/wallet.html, etc.
# For directory-style paths like /give (where the file is give/index.html),
# the deploy script creates a give.html copy so this simple rule works universally.
# Also handles trailing-slash requests (/give/ → /give/index.html).
resource "aws_cloudfront_function" "url_rewrite" {
  name    = "url-rewrite-html-extension"
  runtime = "cloudfront-js-2.0"
  comment = "Rewrite extensionless page requests to .html for vanity URLs"
  publish = true
  code    = <<-EOF
    function handler(event) {
      var request = event.request;
      var uri = request.uri;

      // Root path — CloudFront default_root_object handles /
      if (uri === "/") {
        return request;
      }

      // Has a file extension — static asset, pass through
      if (uri.includes(".")) {
        return request;
      }

      // Trailing slash — serve directory index
      if (uri.endsWith("/")) {
        request.uri = uri + "index.html";
        return request;
      }

      // Extensionless path — append .html
      request.uri = uri + ".html";
      return request;
    }
  EOF
}

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${var.primary_domain}-oac"
  description                       = "OAC for ${var.primary_domain} S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [var.primary_domain, local.fqdn_www]
  price_class         = "PriceClass_100"
  comment             = "${var.primary_domain} — primary site"

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3-${local.s3_bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  # -----------------------------------------------------------------------
  # Cache behavior: HTML pages (default)
  # Short CDN TTL + ETag revalidation. Browsers cache briefly, then
  # revalidate with If-None-Match → 304 Not Modified when content hasn't
  # changed. CloudFront invalidation on deploy forces CDN-level refresh.
  # -----------------------------------------------------------------------
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-${local.s3_bucket_name}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    # Extensionless URL rewriting: /our-impact → /our-impact.html
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.url_rewrite.arn
    }

    min_ttl     = 0
    default_ttl = 300      # 5 minutes — CDN refreshes frequently
    max_ttl     = 300
  }

  # -----------------------------------------------------------------------
  # Cache behavior: static assets (/assets/*)
  # Long CDN + browser TTL. Cache busting is handled by content-hashed
  # filenames (e.g., style.a1b2c3.css), so these can be cached aggressively.
  # -----------------------------------------------------------------------
  ordered_cache_behavior {
    path_pattern           = "/assets/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-${local.s3_bucket_name}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 31536000  # 1 year
    max_ttl     = 31536000
  }

  # Cache behavior: CSS files (/css/*)
  ordered_cache_behavior {
    path_pattern           = "/css/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-${local.s3_bucket_name}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 31536000  # 1 year
    max_ttl     = 31536000
  }

  # S3 returns 403 for missing objects via OAC — map to 404
  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

# ===========================================================================
# CloudFront — Redirect distribution (alternate domains → primary)
# ===========================================================================

# CloudFront Function: 301 redirect preserving path and query string
resource "aws_cloudfront_function" "redirect" {
  name    = "redirect-to-primary-domain"
  runtime = "cloudfront-js-2.0"
  comment = "301 redirect alternate domains to https://www.${var.primary_domain}"
  publish = true
  code    = <<-EOF
    function handler(event) {
      var request = event.request;
      var host = "www.${var.primary_domain}";
      var path = request.uri;
      var qs = Object.keys(request.querystring).length > 0
        ? "?" + Object.keys(request.querystring).map(function(k) {
            var v = request.querystring[k];
            return v.multiValue
              ? v.multiValue.map(function(mv) { return k + "=" + mv.value; }).join("&")
              : k + "=" + v.value;
          }).join("&")
        : "";
      return {
        statusCode: 301,
        statusDescription: "Moved Permanently",
        headers: {
          location: { value: "https://" + host + path + qs },
          "cache-control": { value: "max-age=86400" }
        }
      };
    }
  EOF
}

# The redirect distribution needs an origin even though the CloudFront Function
# intercepts all requests before they reach it. We use the S3 bucket as a
# dummy origin — it will never receive traffic.
resource "aws_cloudfront_distribution" "redirect" {
  count = length(var.alternate_domains) > 0 ? 1 : 0

  enabled         = true
  is_ipv6_enabled = true
  aliases         = local.redirect_aliases
  price_class     = "PriceClass_100"
  comment         = "${var.primary_domain} — alternate domain redirects"

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "dummy-origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "dummy-origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = false

    forwarded_values {
      query_string = true
      cookies {
        forward = "none"
      }
    }

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.redirect.arn
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 86400
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

# ===========================================================================
# Route 53 — Primary domain zone
# ===========================================================================

resource "aws_route53_zone" "primary" {
  name = var.primary_domain
}

# Apex → primary CloudFront
resource "aws_route53_record" "primary_apex" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = var.primary_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

# www → primary CloudFront
resource "aws_route53_record" "primary_www" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = local.fqdn_www
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

# ===========================================================================
# Route 53 — Alternate domain zones (one per alternate domain)
# ===========================================================================

resource "aws_route53_zone" "alternate" {
  for_each = toset(var.alternate_domains)
  name     = each.value
}

# Apex of each alternate domain → redirect CloudFront
resource "aws_route53_record" "alternate_apex" {
  for_each = toset(var.alternate_domains)

  zone_id = aws_route53_zone.alternate[each.key].zone_id
  name    = each.value
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.redirect[0].domain_name
    zone_id                = aws_cloudfront_distribution.redirect[0].hosted_zone_id
    evaluate_target_health = false
  }
}

# www of each alternate domain → redirect CloudFront
resource "aws_route53_record" "alternate_www" {
  for_each = toset(var.alternate_domains)

  zone_id = aws_route53_zone.alternate[each.key].zone_id
  name    = "www.${each.value}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.redirect[0].domain_name
    zone_id                = aws_cloudfront_distribution.redirect[0].hosted_zone_id
    evaluate_target_health = false
  }
}
```

#### `infra/outputs.tf`
```hcl
output "cloudfront_distribution_id" {
  description = "Primary CloudFront distribution ID (needed for cache invalidation)"
  value       = aws_cloudfront_distribution.site.id
}

output "cloudfront_domain_name" {
  description = "Primary CloudFront domain name for testing before DNS cutover"
  value       = aws_cloudfront_distribution.site.domain_name
}

output "redirect_distribution_id" {
  description = "Redirect CloudFront distribution ID"
  value       = length(var.alternate_domains) > 0 ? aws_cloudfront_distribution.redirect[0].id : null
}

output "s3_bucket_name" {
  description = "S3 bucket name for deployment"
  value       = aws_s3_bucket.site.id
}

output "primary_nameservers" {
  description = "Route 53 nameservers for the primary domain"
  value       = aws_route53_zone.primary.name_servers
}

output "alternate_nameservers" {
  description = "Route 53 nameservers for each alternate domain"
  value = {
    for d in var.alternate_domains : d => aws_route53_zone.alternate[d].name_servers
  }
}
```

#### `infra/backend.tf`
```hcl
terraform {
  backend "s3" {
    bucket  = "wrensvillage-terraform-state"
    key     = "website/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}
```

#### Terraform State Management

**State is stored in a dedicated S3 bucket, not in git.** Terraform state files should never be committed to a git repository for several reasons: state can inadvertently capture sensitive resource attributes, it changes on every `apply` (creating noisy diffs), and once committed, sensitive data lives in git history permanently.

**One-time setup — create the state bucket manually before `terraform init`:**

```bash
# Create the state bucket
aws s3api create-bucket \
  --bucket wrensvillage-terraform-state \
  --region us-east-1

# Enable versioning — this is your backup/rollback mechanism
aws s3api put-bucket-versioning \
  --bucket wrensvillage-terraform-state \
  --versioning-configuration Status=Enabled

# Enable server-side encryption by default
aws s3api put-bucket-encryption \
  --bucket wrensvillage-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'

# Block all public access
aws s3api put-public-access-block \
  --bucket wrensvillage-terraform-state \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

**DynamoDB locking is omitted.** State locking prevents concurrent `terraform apply` runs from corrupting state. Since you're the sole operator, this is unnecessary overhead. If you add collaborators in the future, add a `dynamodb_table` parameter to the backend config.

**S3 versioning provides backup across devices.** Every `terraform apply` writes a new state version to S3. You can work from any device with AWS CLI credentials configured. To recover a previous state, use S3 version history:

```bash
# List state file versions
aws s3api list-object-versions \
  --bucket wrensvillage-terraform-state \
  --prefix website/terraform.tfstate

# Restore a previous version (by version ID)
aws s3api get-object \
  --bucket wrensvillage-terraform-state \
  --key website/terraform.tfstate \
  --version-id YOUR_VERSION_ID \
  restored-state.tfstate
```

**Keeping secrets out of state.** None of the resources in this plan store credential-type secrets in state — S3 buckets, CloudFront distributions, Route 53 records, and ACM certificates only produce ARNs, IDs, and configuration values. To keep it this way:

- Never create IAM access keys or credential resources via Terraform for this project
- Authenticate to AWS using your CLI credentials (`aws configure` or environment variables), not via Terraform-managed resources
- The `encrypt = true` backend setting ensures state is encrypted at rest in S3 via AES-256
- The state bucket's public access block prevents accidental exposure

**Add to `.gitignore`:**
```
# Terraform
infra/.terraform/
infra/*.tfstate
infra/*.tfstate.backup
infra/.terraform.lock.hcl
infra/terraform.tfvars
```

Note: `terraform.tfvars` is gitignored because it may contain environment-specific values. The defaults in `variables.tf` serve as documentation. If your tfvars contains no secrets (just domain names), you may choose to commit it — use your judgment.

### 9d. Deployment Script

`scripts/deploy.sh` syncs the site content to S3 with differentiated cache headers and invalidates only HTML pages in CloudFront. This works identically for hand-authored HTML now and Jekyll `_site/` output later.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Source directory: override with SITE_DIR env var for Jekyll builds
SITE_DIR="${SITE_DIR:-../site}"

# Read Terraform outputs
cd "$(dirname "$0")/../infra"
BUCKET=$(terraform output -raw s3_bucket_name)
DIST_ID=$(terraform output -raw cloudfront_distribution_id)
cd - > /dev/null

# Create .html aliases for directory-style index.html pages.
# The CloudFront Function rewrites /give → /give.html, so we need
# a give.html object in S3 that serves the same content as give/index.html.
echo "Creating .html aliases for directory index pages..."
find "${SITE_DIR}" -name "index.html" -not -path "${SITE_DIR}/index.html" | while read -r f; do
  dir=$(dirname "$f")
  parent=$(dirname "$dir")
  base=$(basename "$dir")
  alias="${parent}/${base}.html"
  cp "$f" "$alias"
  echo "  ${f} → ${alias}"
done

# --- Sync static assets first (long cache, hashed filenames for busting) ---
echo "Syncing static assets → s3://${BUCKET}"
aws s3 sync "${SITE_DIR}/assets" "s3://${BUCKET}/assets" \
  --delete \
  --cache-control "public, max-age=31536000, immutable"

aws s3 sync "${SITE_DIR}/css" "s3://${BUCKET}/css" \
  --delete \
  --cache-control "public, max-age=31536000, immutable"

# --- Sync HTML, XML, and other root files (short cache, ETag revalidation) ---
echo "Syncing HTML content → s3://${BUCKET}"
aws s3 sync "${SITE_DIR}" "s3://${BUCKET}" \
  --delete \
  --cache-control "public, max-age=300, must-revalidate" \
  --exclude "assets/*" \
  --exclude "css/*" \
  --exclude ".git/*" \
  --exclude ".jekyll-cache/*" \
  --exclude "_config.yml"

# --- Invalidate only HTML pages in CloudFront ---
# Static assets use content-hashed filenames, so they don't need invalidation.
# HTML files have short TTLs (5 min) but we invalidate to ensure immediate
# propagation on deploy rather than waiting up to 5 minutes.
echo "Invalidating HTML content in CloudFront (${DIST_ID})"
aws cloudfront create-invalidation \
  --distribution-id "${DIST_ID}" \
  --paths "/" "/*.html" "/give/*" "/sitemap.xml" "/robots.txt" \
  --query 'Invalidation.Id' \
  --output text

echo "Deploy complete."
```

Usage:
```bash
# Deploy static HTML (current project)
./scripts/deploy.sh

# Deploy Jekyll build output (future project)
SITE_DIR=../site/_site ./scripts/deploy.sh
```

### 9e. Infrastructure Deployment Workflow

```bash
# First-time setup
cd infra
terraform init
terraform plan
terraform apply

# Note the primary_nameservers and alternate_nameservers outputs
# Verify each domain's registrar nameservers match the Route 53 zone outputs
# Wait for DNS propagation and ACM certificate validation

# Test via CloudFront URL before DNS cutover
curl -I https://$(terraform output -raw cloudfront_domain_name)

# Deploy site content
cd ../scripts
chmod +x deploy.sh
./deploy.sh
```

### 9f. Jekyll Compatibility

When you migrate to Jekyll, the infrastructure layer requires **zero changes**. The only difference is what gets synced to S3:

| Phase | Source dir | Deploy command |
|---|---|---|
| Now (static HTML) | `site/` | `./deploy.sh` |
| Future (Jekyll) | `site/_site/` | `SITE_DIR=../site/_site ./deploy.sh` |

Jekyll builds semantic HTML from Markdown. Pico CSS styles it. Terraform manages the hosting. The deploy script bridges them. Each layer is independent and replaceable.

### 9g. DNS Cutover Checklist

Since you already use Route 53, the cutover is straightforward. After `terraform apply` completes and the ACM certificate is validated:

**If Terraform is creating new Route 53 hosted zones** (i.e., the zones don't exist yet):
1. Note the `primary_nameservers` and `alternate_nameservers` outputs
2. At your domain registrar, verify each domain's nameservers match the Route 53 zone nameservers
3. Wait for propagation if any NS records changed (typically < 1 hour, up to 48 hours)

**If you have existing Route 53 hosted zones** you want Terraform to manage:
1. Import them into Terraform state before running `apply` to avoid creating duplicate zones:
   ```bash
   terraform import aws_route53_zone.primary Z0123456789ABCDEF
   terraform import 'aws_route53_zone.alternate["wrensvillage.org"]' Z9876543210FEDCBA
   ```
2. Run `terraform plan` to verify no destructive changes
3. Run `terraform apply`

**Verification for all domains:**
```bash
# Primary domain
curl -I https://wrensvillage.com          # Should serve site (200)
curl -I https://www.wrensvillage.com      # Should serve site (200)
curl -I http://wrensvillage.com           # Should 301 → https://

# Alternate domains — all should 301 redirect
curl -I https://wrensvillage.org          # Should 301 → https://www.wrensvillage.com
curl -I https://www.wrensvillage.org      # Should 301 → https://www.wrensvillage.com
curl -I http://wrensvillage.org           # Should 301 → https:// then 301 → primary
```

---

## 10. Caching Strategy

The caching design optimizes for two goals: fast page loads for returning visitors, and immediate content updates on deploy.

### How It Works

| Content type | CDN TTL | Browser behavior | Cache busting method |
|---|---|---|---|
| HTML pages (`.html`, `sitemap.xml`) | 5 minutes | Caches briefly, then revalidates via ETag (`If-None-Match` → 304) | CloudFront invalidation on deploy |
| Static assets (`/assets/*`, `/css/*`) | 1 year | Caches indefinitely | Content-hashed filenames (e.g., `style.a1b2c3.css`) |

### ETags (HTML Pages)

S3 automatically generates an `ETag` header on every object — it's the MD5 hash of the object content. CloudFront forwards this to browsers. The flow on a return visit:

1. Browser requests `/our-impact` (rewritten to `/our-impact.html`)
2. If the browser has a cached copy, it sends `If-None-Match: "abc123..."` (the ETag from the last response)
3. CloudFront (or S3 if CDN cache has expired) compares the ETag
4. If content hasn't changed: **304 Not Modified** — no body transferred, page loads instantly from browser cache
5. If content has changed: **200 OK** with the new content and a new ETag

The `Cache-Control: public, max-age=300, must-revalidate` header on HTML tells browsers to cache for up to 5 minutes before revalidating. After 5 minutes, the browser revalidates with an ETag conditional request rather than re-downloading. The `must-revalidate` directive ensures stale content is never served without checking.

On deploy, the deploy script invalidates HTML paths in CloudFront so the CDN fetches fresh content from S3 immediately — visitors don't wait the full 5 minutes for the CDN TTL to expire.

### Content-Hashed Filenames (Static Assets)

Static assets use `Cache-Control: public, max-age=31536000, immutable` — browsers and the CDN cache them for 1 year and never revalidate. The `immutable` directive tells browsers the content at this URL will never change.

Cache busting happens via the filename, not cache invalidation:

| Old filename | New filename (after edit) |
|---|---|
| `custom.css` | `custom.a1b2c3.css` |
| `hero.jpg` | `hero.d4e5f6.jpg` |

When the content changes, the filename changes, the HTML references the new filename, and browsers fetch it as a new resource. The old version remains cached harmlessly until it expires.

**Current phase (static HTML):** content-hashed filenames are a manual process — rename the file and update the `<link>` or `<img>` reference. For a small site with infrequent asset changes, this is manageable. Even without hashing, a full CloudFront invalidation (`/*`) will clear asset caches if needed.

**Future phase (Jekyll):** Jekyll's `jekyll-assets` plugin or a simple Liquid filter can automate content hashing at build time:

```liquid
<!-- In _layouts/default.html -->
<link rel="stylesheet" href="/css/custom.css?v={{ site.time | date: '%s' }}">
```

For a simple site, a build-timestamp query string (`?v=1709136000`) is sufficient and avoids the complexity of true content hashing. For more control, the `jekyll-assets` gem provides full fingerprinted filenames.

### Terraform Implementation

The CloudFront distribution uses separate cache behaviors (Section 9c):

- **Default behavior** (HTML): `default_ttl = 300` (5 min), `max_ttl = 300`
- **`/assets/*` behavior**: `default_ttl = 31536000` (1 year), `max_ttl = 31536000`
- **`/css/*` behavior**: `default_ttl = 31536000` (1 year), `max_ttl = 31536000`

S3 generates ETags automatically. CloudFront forwards them via the default origin response behavior — no additional configuration needed. The `forwarded_values` block doesn't need changes because ETags are origin response headers, not request headers.

### Deploy Script Implementation

The deploy script (Section 9d) syncs with per-directory `Cache-Control` headers:

```bash
# Assets: aggressive caching, immutable
aws s3 sync .../assets s3://bucket/assets --cache-control "public, max-age=31536000, immutable"

# HTML: short cache, ETag revalidation
aws s3 sync ... s3://bucket --cache-control "public, max-age=300, must-revalidate" --exclude "assets/*"
```

Invalidation is targeted to HTML paths only — assets don't need invalidation because their filenames change.

---

## 11. Estimated Monthly Costs

| Service | Est. Cost |
|---|---|
| S3 storage (< 100 MB) | ~$0.01 |
| S3 requests (low traffic non-profit) | ~$0.01 |
| CloudFront — primary distribution (low traffic) | ~$0.00 – $1.00 |
| CloudFront — redirect distribution (minimal) | ~$0.00 |
| Route 53 hosted zones ($0.50/zone × N zones) | ~$1.00 |
| ACM SSL certificate | Free |
| CloudFront Function invocations (redirect) | ~$0.00 |
| **Total** | **< $3/month** |

Compare this to a Square Online subscription at $12–$72/month.

---

## 12. Migration Checklist

### Phase 1: Content & Asset Extraction
- [ ] Screenshot every page of the current site
- [ ] Extract all text content (headings, paragraphs, CTAs)
- [ ] Download all images, logos, and media files
- [ ] Identify and document all fonts used
- [ ] Note all payment/donation flows and their Square product IDs
- [ ] Export any analytics data or subscriber lists from Square

### Phase 2: Payment Infrastructure (Square Payment Links)
- [ ] Create Square Payment Links for each donation tier in Square Dashboard
- [ ] Create Square Payment Link for Wallet Sponsorship ($250)
- [ ] Configure custom fields where needed (e.g., "In honor of" for wallet sponsorships)
- [ ] Test all payment links end-to-end (checkout flow, receipt delivery)
- [ ] Document all payment link URLs in a central reference for future maintenance

### Phase 3: Build Static Site
- [ ] Set up project directory structure
- [ ] Build `index.html` with Pico CSS CDN and semantic HTML
- [ ] Build shared nav/header and footer
- [ ] Add skip link (`<a href="#main-content">Skip to main content</a>`) to every page
- [ ] Set `<html lang="en">` on every page
- [ ] Use `<main id="main-content">` for primary content on every page
- [ ] Build each page: Our Impact, Give, Give/Wallet, Privacy Policy
- [ ] Add meaningful `alt` text to every image; use `alt=""` for decorative images
- [ ] Ensure heading hierarchy is logical (`<h1>` → `<h2>` → `<h3>`, no skipped levels)
- [ ] Use descriptive link text (not "click here")
- [ ] Optimize images (compress, convert to WebP with fallbacks)
- [ ] Add meta tags, Open Graph tags, and favicon
- [ ] Add `<link rel="canonical">` pointing to `https://www.wrensvillage.com/...` on every page
- [ ] Create branded Open Graph share image (1200×630px)
- [ ] Create `sitemap.xml` with all page URLs
- [ ] Create `robots.txt` with sitemap reference
- [ ] Add JSON-LD structured data (`NonprofitOrganization`) to the home page
- [ ] Test responsive design on mobile/tablet/desktop
- [ ] Validate HTML with W3C validator
- [ ] Test all payment links end-to-end

### Phase 4: AWS Infrastructure (Terraform)
- [ ] Create Terraform state S3 bucket with versioning and encryption (manual one-time setup)
- [ ] Import existing Route 53 hosted zones into Terraform state (if applicable)
- [ ] Inventory all domain variants to include in `alternate_domains`
- [ ] Run `terraform init` and `terraform plan` — review the resource plan
- [ ] Run `terraform apply` — provisions S3, CloudFront (primary + redirect), ACM, Route 53
- [ ] Wait for ACM certificate DNS validation to complete
- [ ] Note the `primary_nameservers` and `alternate_nameservers` outputs
- [ ] Deploy site files with `./scripts/deploy.sh`
- [ ] Test via CloudFront domain URL before DNS cutover

### Phase 5: DNS Cutover & Go-Live
- [ ] Verify domain registrar nameservers match Route 53 outputs for all domains
- [ ] Wait for DNS propagation (up to 48 hours, usually < 1 hour)
- [ ] Verify `https://www.wrensvillage.com` serves the site correctly
- [ ] Verify `https://wrensvillage.com` serves the site correctly
- [ ] Verify HTTP → HTTPS redirect works on all domains
- [ ] Verify alternate domains 301-redirect to `https://www.wrensvillage.com`
- [ ] Verify alternate domains preserve path on redirect (e.g., `/give/wallet`)
- [ ] Test all pages and payment flows on the live domain
- [ ] Run axe DevTools or WAVE accessibility scan on every page — fix any errors
- [ ] Keyboard-only navigation test (Tab through every page, verify focus indicators)
- [ ] Screen reader spot-check (VoiceOver or NVDA on at least the home and donate pages)
- [ ] Verify color contrast meets WCAG AA (4.5:1 body text, 3:1 large text)
- [ ] Set up basic monitoring (CloudWatch or UptimeRobot free tier)

### Phase 6: Cleanup
- [ ] Cancel Square CMS subscription (after confirming everything works)
- [ ] Keep Square merchant account active (for payment processing)
- [ ] Commit all Terraform config and deploy script to git
- [ ] Document the setup in README.md for other volunteers
- [ ] Verify `terraform plan` shows no drift

---

## 13. Future Enhancements (Optional)

- **Donor Platform Migration:** Evaluate and migrate from Square Payment Links to **GiveButter** for donation-specific features (recurring giving, tax receipts, donor CRM, peer-to-peer fundraising). Integration is a link/embed swap — no structural changes to the site required.
- **Static Site Generator:** Migrate to **Jekyll** for templating, layouts, and Markdown-based content editing. Pico CSS + semantic HTML means your pages will transition to Jekyll with minimal rework — page content becomes Markdown front matter, and shared nav/footer become `_includes/` partials.
- **CI/CD:** Add a GitHub Actions workflow that auto-deploys to S3 on push to `main`.
- **Contact Form:** Use a service like Formspree, Getform, or AWS SES + Lambda for a serverless contact form.
- **Analytics:** Replace any Square analytics with Plausible (privacy-friendly) or Google Analytics.
- **Image CDN:** Use CloudFront's built-in caching (already included), or add CloudFront Functions for on-the-fly image resizing.
