/**
 * Phase 1 image downloader for wrensvillage.com
 * Reads _site/content/image-urls.json produced by extract.mjs
 * and downloads each image to _site/assets/images/
 */

import { readFile, writeFile } from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";
import { URL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.join(__dirname, "_site");
const IMAGES_DIR = path.join(SITE_DIR, "assets", "images");
const MANIFEST = path.join(SITE_DIR, "content", "image-urls.json");

/** Download a single URL to a local file path */
function download(url, dest) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === "https:" ? https : http;

    const file = createWriteStream(dest);
    const req = protocol.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        // Follow redirect
        download(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    });

    req.on("error", (err) => {
      file.close();
      reject(err);
    });
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Timeout downloading ${url}`));
    });
  });
}

/** Derive a safe local filename from a URL */
function urlToFilename(rawUrl, index) {
  try {
    const u = new URL(rawUrl);
    // Strip query params, get the path basename
    let basename = path.basename(u.pathname);
    // Remove any format parameters squarespace uses (e.g. ?format=1500w)
    basename = basename.split("?")[0];
    if (!basename || basename === "/") {
      basename = `image-${index}`;
    }
    // Ensure an extension
    if (!path.extname(basename)) {
      basename += ".jpg";
    }
    return basename;
  } catch {
    return `image-${index}.jpg`;
  }
}

async function main() {
  let urls;
  try {
    const raw = await readFile(MANIFEST, "utf8");
    urls = JSON.parse(raw);
  } catch (err) {
    console.error(`Cannot read ${MANIFEST} — run extract.mjs first`);
    process.exit(1);
  }

  console.log(`=== Downloading ${urls.length} images ===\n`);

  const results = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const filename = urlToFilename(url, i);
    const dest = path.join(IMAGES_DIR, filename);

    process.stdout.write(`[${i + 1}/${urls.length}] ${filename} ... `);
    try {
      await download(url, dest);
      console.log("✓");
      results.push({ url, filename, status: "ok" });
    } catch (err) {
      console.log(`✗ (${err.message})`);
      results.push({ url, filename, status: "error", error: err.message });
    }
  }

  // Write download report
  const reportPath = path.join(SITE_DIR, "content", "image-download-report.json");
  await writeFile(reportPath, JSON.stringify(results, null, 2), "utf8");

  const ok = results.filter((r) => r.status === "ok").length;
  const failed = results.filter((r) => r.status === "error").length;

  console.log(`\n=== Done: ${ok} downloaded, ${failed} failed ===`);
  console.log(`Report → _site/content/image-download-report.json`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
