# Wren's Village — Migration Plan
## Square CMS → Static HTML on AWS S3

## Prerequisites
See @CONTRIBUTING.md for prerequistes needed to build, test, and deploy this site

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


## 9. Migration Checklist

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

### Phase 4: Cleanup
- [ ] Cancel Square CMS subscription (after confirming everything works)
- [ ] Keep Square merchant account active (for payment processing)
- [ ] Document the setup in README.md for other volunteers

---

## 10. Future Enhancements (Optional)

- **Donor Platform Migration:** Evaluate and migrate from Square Payment Links to **GiveButter** for donation-specific features (recurring giving, tax receipts, donor CRM, peer-to-peer fundraising). Integration is a link/embed swap — no structural changes to the site required.
- **Static Site Generator:** Migrate to **Jekyll** for templating, layouts, and Markdown-based content editing. Pico CSS + semantic HTML means your pages will transition to Jekyll with minimal rework — page content becomes Markdown front matter, and shared nav/footer become `_includes/` partials.
- **CI/CD:** Add a GitHub Actions workflow that auto-deploys to S3 on push to `main`.
- **Contact Form:** Use a service like Formspree, Getform, or AWS SES + Lambda for a serverless contact form.
- **Analytics:** Replace any Square analytics with Plausible (privacy-friendly) or Google Analytics.
- **Image CDN:** Use CloudFront's built-in caching (already included), or add CloudFront Functions for on-the-fly image resizing.
