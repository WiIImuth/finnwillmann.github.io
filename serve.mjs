#!/usr/bin/env node
/**
 * Vorschau-Server mit automatischem Neubau.
 *
 *   node serve.mjs        ->  http://localhost:4321
 *
 * Sobald du eine Datei in content/, assets/ oder site.config.json
 * speicherst, wird die Seite neu gebaut. Im Browser einfach neu laden.
 */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { watch } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, "dist");
const PORT = Number(process.env.PORT) || 4321;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

let building = false;
let queued = false;

function rebuild() {
  if (building) { queued = true; return; }
  building = true;
  const child = spawn(process.execPath, [path.join(ROOT, "build.mjs")], { stdio: "inherit" });
  child.on("exit", () => {
    building = false;
    if (queued) { queued = false; rebuild(); }
  });
}

async function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const safe = path.normalize(clean).replace(/^(\.\.[/\\])+/, "");
  const candidates = [
    path.join(DIST, safe),
    path.join(DIST, safe, "index.html"),
    path.join(DIST, safe + ".html"),
  ];
  for (const candidate of candidates) {
    if (!candidate.startsWith(DIST)) continue;
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch { /* weiter */ }
  }
  return null;
}

createServer(async (req, res) => {
  const file = await resolveFile(req.url || "/");

  if (!file) {
    const notFound = path.join(DIST, "404.html");
    try {
      const body = await readFile(notFound);
      res.writeHead(404, { "content-type": MIME[".html"] });
      return res.end(body);
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      return res.end("404 — nicht gefunden");
    }
  }

  const body = await readFile(file);
  res.writeHead(200, {
    "content-type": MIME[path.extname(file)] || "application/octet-stream",
    "cache-control": "no-store",
  });
  res.end(body);
}).listen(PORT, () => {
  rebuild();
  console.log(`\n  Vorschau läuft auf  http://localhost:${PORT}\n  Beenden mit Strg+C\n`);
});

for (const dir of ["content", "assets"]) {
  try {
    watch(path.join(ROOT, dir), { recursive: true }, () => rebuild());
  } catch { /* recursive wird nicht überall unterstützt */ }
}
try {
  watch(path.join(ROOT, "site.config.json"), () => rebuild());
} catch { /* egal */ }
