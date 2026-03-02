import { readFile, writeFile } from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";
import { URL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.join(__dirname, "_site");

const pages = ["privacy-policy", "our-story", "support", "contact-us"];
const existing = new Set(
  JSON.parse(await readFile(path.join(SITE_DIR, "content", "image-urls.json"), "utf8"))
);
const newUrls = new Set();

for (const slug of pages) {
  const data = JSON.parse(
    await readFile(path.join(SITE_DIR, "content", `${slug}.json`), "utf8")
  );
  (data.images || []).forEach((img) => {
    if (img.src && img.src.startsWith("http")) newUrls.add(img.src);
  });
}

const toDownload = [...newUrls].filter((u) => !existing.has(u));
console.log(`New images to download: ${toDownload.length}`);

function urlToFilename(rawUrl, index) {
  try {
    const u = new URL(rawUrl);
    let basename = path.basename(u.pathname).split("?")[0];
    if (!basename || basename === "/") basename = `image-extra-${index}`;
    if (!path.extname(basename)) basename += ".jpg";
    return basename;
  } catch {
    return `image-extra-${index}.jpg`;
  }
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const protocol = parsed.protocol === "https:" ? https : http;
    const file = createWriteStream(dest);
    const req = protocol.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        download(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    });
    req.on("error", (err) => { file.close(); reject(err); });
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

for (let i = 0; i < toDownload.length; i++) {
  const url = toDownload[i];
  const filename = urlToFilename(url, i);
  const dest = path.join(SITE_DIR, "assets", "images", filename);
  process.stdout.write(`[${i + 1}/${toDownload.length}] ${filename} ... `);
  try {
    await download(url, dest);
    console.log("✓");
  } catch (err) {
    console.log(`✗ (${err.message})`);
  }
}

// Write updated combined URL list
const allUrls = [...new Set([...existing, ...newUrls])];
await writeFile(
  path.join(SITE_DIR, "content", "image-urls.json"),
  JSON.stringify(allUrls, null, 2)
);
console.log(`\nUpdated image-urls.json with ${allUrls.length} total URLs`);
