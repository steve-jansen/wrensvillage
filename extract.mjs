/**
 * Phase 1 content extraction script for wrensvillage.com
 * Uses puppeteer to handle the JavaScript-rendered Square CMS.
 *
 * Output:
 *   _site/screenshots/       — full-page PNGs
 *   _site/content/           — extracted text per page (JSON + plain text)
 *   _site/assets/images/     — downloaded images
 *   _site/assets/fonts/      — font information
 */

import puppeteer from "puppeteer";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.join(__dirname, "_site");

const PAGES = [
  { slug: "home", url: "https://www.wrensvillage.com/" },
  { slug: "our-impact", url: "https://www.wrensvillage.com/our-impact" },
  {
    slug: "donate",
    url: "https://www.wrensvillage.com/product/donate-to-our-cause-/21",
  },
  {
    slug: "sponsor-a-wallet",
    url: "https://www.wrensvillage.com/product/sponsor-a-wallet-/28",
  },
  { slug: "privacy", url: "https://www.wrensvillage.com/privacy" },
];

/** Wait for the page to settle after JS rendering */
async function waitForContent(page) {
  // Wait for network to be idle and at least some body text to appear
  await page.waitForNetworkIdle({ idleTime: 1500, timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));
}

/** Extract structured text content from the rendered DOM */
async function extractContent(page, url) {
  return page.evaluate((pageUrl) => {
    const text = (el) => el?.textContent?.trim() ?? "";
    const attr = (el, a) => el?.getAttribute(a)?.trim() ?? "";

    // Title
    const title = document.title;

    // Meta description
    const metaDesc =
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content") ?? "";

    // All headings in order
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(
      (h) => ({ level: h.tagName, text: text(h) })
    );

    // All paragraphs
    const paragraphs = [...document.querySelectorAll("p")]
      .map((p) => text(p))
      .filter((t) => t.length > 10);

    // All links (nav + CTAs)
    const links = [...document.querySelectorAll("a[href]")]
      .map((a) => ({
        text: text(a),
        href: attr(a, "href"),
        ariaLabel: attr(a, "aria-label"),
      }))
      .filter((l) => l.text || l.ariaLabel);

    // All buttons
    const buttons = [...document.querySelectorAll("button,[role='button']")]
      .map((b) => ({ text: text(b), ariaLabel: attr(b, "aria-label") }))
      .filter((b) => b.text || b.ariaLabel);

    // Images
    const images = [...document.querySelectorAll("img")].map((img) => ({
      src: img.src,
      srcset: attr(img, "srcset"),
      alt: attr(img, "alt"),
      width: img.naturalWidth,
      height: img.naturalHeight,
    }));

    // Background images from computed styles
    const bgImages = [];
    document.querySelectorAll("*").forEach((el) => {
      const bg = getComputedStyle(el).backgroundImage;
      if (bg && bg !== "none" && bg.includes("url(")) {
        const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
        if (match) bgImages.push(match[1]);
      }
    });

    // Fonts in use
    const fontFamilies = new Set();
    document.querySelectorAll("*").forEach((el) => {
      const ff = getComputedStyle(el).fontFamily;
      if (ff) fontFamilies.add(ff);
    });

    // Font-face declarations from stylesheets
    const fontFaceUrls = [];
    try {
      [...document.styleSheets].forEach((ss) => {
        try {
          [...ss.cssRules].forEach((rule) => {
            if (rule.type === CSSRule.FONT_FACE_RULE) {
              const src = rule.style.getPropertyValue("src");
              const urlMatch = src.match(/url\(["']?([^"')]+)["']?\)/g);
              if (urlMatch) fontFaceUrls.push(...urlMatch);
              fontFamilies.add(rule.style.getPropertyValue("font-family"));
            }
          });
        } catch {
          // Cross-origin stylesheet — skip
        }
      });
    } catch {
      // ignore
    }

    // Full visible text (for a plain-text dump)
    const bodyText = document.body?.innerText ?? "";

    return {
      url: pageUrl,
      title,
      metaDesc,
      headings,
      paragraphs,
      links,
      buttons,
      images,
      bgImages: [...new Set(bgImages)],
      fontFamilies: [...fontFamilies],
      fontFaceUrls,
      bodyText,
    };
  }, url);
}

/** Collect all image URLs to download */
function collectImageUrls(content) {
  const urls = new Set();
  content.images.forEach((img) => {
    if (img.src && img.src.startsWith("http")) urls.add(img.src);
    // srcset can contain multiple URLs
    if (img.srcset) {
      img.srcset.split(",").forEach((entry) => {
        const u = entry.trim().split(/\s+/)[0];
        if (u && u.startsWith("http")) urls.add(u);
      });
    }
  });
  content.bgImages.forEach((u) => {
    if (u.startsWith("http")) urls.add(u);
  });
  return [...urls];
}

/** Slugify a URL into a safe filename */
function urlToFilename(url) {
  try {
    const u = new URL(url);
    const pathname = u.pathname.replace(/\//g, "_").replace(/^_/, "");
    const ext = path.extname(pathname) || ".jpg";
    const base = pathname.replace(ext, "").slice(0, 80);
    return (base || "image") + ext;
  } catch {
    return "image_" + Math.random().toString(36).slice(2) + ".jpg";
  }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const allContent = [];
  const allImageUrls = new Set();

  console.log("=== Phase 1: Content & Asset Extraction ===\n");

  for (const { slug, url } of PAGES) {
    console.log(`→ Visiting: ${url}`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    try {
      await page.goto(url, { waitUntil: "networkidle0", timeout: 45000 });
    } catch (e) {
      console.warn(`  ⚠ Navigation timeout for ${url}, continuing anyway`);
    }

    await waitForContent(page);

    // Screenshot
    const screenshotPath = path.join(SITE_DIR, "screenshots", `${slug}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`  ✓ Screenshot → _site/screenshots/${slug}.png`);

    // Extract content
    const content = await extractContent(page, url);
    allContent.push({ slug, ...content });

    // Save JSON content
    const jsonPath = path.join(SITE_DIR, "content", `${slug}.json`);
    await writeFile(jsonPath, JSON.stringify(content, null, 2), "utf8");

    // Save plain text dump
    const txtPath = path.join(SITE_DIR, "content", `${slug}.txt`);
    const txtContent = [
      `=== ${content.title} ===`,
      `URL: ${url}`,
      ``,
      `--- HEADINGS ---`,
      content.headings.map((h) => `${h.level}: ${h.text}`).join("\n"),
      ``,
      `--- PARAGRAPHS ---`,
      content.paragraphs.join("\n\n"),
      ``,
      `--- LINKS & CTAs ---`,
      content.links.map((l) => `[${l.text}] → ${l.href}`).join("\n"),
      ``,
      `--- BUTTONS ---`,
      content.buttons.map((b) => `[BTN] ${b.text}`).join("\n"),
      ``,
      `--- FONTS ---`,
      content.fontFamilies.join("\n"),
      ``,
      `--- FULL BODY TEXT ---`,
      content.bodyText,
    ].join("\n");
    await writeFile(txtPath, txtContent, "utf8");

    // Collect image URLs
    const imgUrls = collectImageUrls(content);
    imgUrls.forEach((u) => allImageUrls.add(u));

    console.log(`  ✓ Content → _site/content/${slug}.json + .txt`);
    console.log(
      `  ✓ Found ${content.images.length} images, ${content.headings.length} headings, ${content.links.length} links`
    );
    console.log(`  ✓ Fonts: ${content.fontFamilies.slice(0, 3).join(", ")}...`);

    await page.close();
  }

  await browser.close();

  // Save image URL manifest
  const imageManifest = path.join(SITE_DIR, "content", "image-urls.json");
  await writeFile(
    imageManifest,
    JSON.stringify([...allImageUrls], null, 2),
    "utf8"
  );
  console.log(`\n✓ Image URL manifest (${allImageUrls.size} unique) → _site/content/image-urls.json`);

  // Save combined summary
  const summary = {
    extractedAt: new Date().toISOString(),
    pages: allContent.map(({ slug, url, title, headings, images, fontFamilies }) => ({
      slug,
      url,
      title,
      headingCount: headings.length,
      imageCount: images.length,
      fontFamilies: fontFamilies.slice(0, 5),
    })),
    totalImages: allImageUrls.size,
  };
  await writeFile(
    path.join(SITE_DIR, "content", "summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8"
  );

  console.log("\n=== Extraction complete. Next: run download-images.mjs ===");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
