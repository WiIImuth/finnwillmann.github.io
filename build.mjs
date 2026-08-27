#!/usr/bin/env node
/**
 * Portfolio-Build, ohne externe Abhängigkeiten.
 *
 *   node build.mjs        Baut die Seite nach dist/
 *
 * Was passiert:
 *   site.config.json      ->  Name, Links, Skills, Impressum
 *   content/home.md       ->  Kurztext auf der Startseite
 *   content/about.md      ->  Seite „Über mich"
 *   content/kontakt.md    ->  Seite „Kontakt"
 *   content/projects/     ->  eine .md-Datei pro Projekt
 *   assets/               ->  wird 1:1 nach dist/assets kopiert
 *
 * Erzeugte Seiten:
 *   /                     Startseite mit ausgewählten Projekten
 *   /projekte/            Übersicht aller Projekte
 *   /projekte/<slug>/     Detailseite je Projekt
 *   /ueber-mich/
 *   /kontakt/
 *   /impressum/
 */

import { readFile, readdir, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, "dist");

/* ------------------------------------------------------------------ *
 * Kleine Helfer
 * ------------------------------------------------------------------ */

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const isExternal = (href) => /^(https?:|mailto:|tel:)/.test(href);

const linkAttrs = (href) =>
  /^https?:/.test(href) ? ' target="_blank" rel="noopener noreferrer"' : "";

/* ------------------------------------------------------------------ *
 * Frontmatter (schlanke YAML-Teilmenge)
 * ------------------------------------------------------------------ */

function parseScalar(raw) {
  const v = raw.trim();
  if (v === "") return "";
  if (/^".*"$/.test(v) || /^'.*'$/.test(v)) return v.slice(1, -1);
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null" || v === "~") return null;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (/^\[.*\]$/.test(v)) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((x) => parseScalar(x));
  }
  return v;
}

function parseFrontmatter(raw) {
  const text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!match) return { data: {}, body: text };

  const data = {};
  const lines = match[1].split("\n");
  let key = null;

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const listItem = /^\s*-\s+(.*)$/.exec(line);
    if (listItem && key) {
      if (!Array.isArray(data[key])) data[key] = [];
      data[key].push(parseScalar(listItem[1]));
      continue;
    }

    const pair = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (pair) {
      key = pair[1];
      const value = pair[2].trim();
      data[key] = value === "" ? [] : parseScalar(value);
    }
  }

  return { data, body: text.slice(match[0].length) };
}

/* ------------------------------------------------------------------ *
 * Markdown -> HTML
 * ------------------------------------------------------------------ */

function inline(text) {
  const codeSpans = [];
  let out = text.replace(/`([^`]+)`/g, (_, code) => {
    codeSpans.push(code);
    return ` CODE${codeSpans.length - 1} `;
  });

  out = escapeHtml(out);

  out = out.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
    (_, alt, src, title) =>
      `<img src="${src}" alt="${alt}"${title ? ` title="${title}"` : ""} loading="lazy" decoding="async">`
  );

  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_, label, href) => `<a href="${href}"${linkAttrs(href)}>${label}</a>`
  );

  out = out
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>");

  out = out.replace(/ CODE(\d+) /g, (_, i) => `<code>${escapeHtml(codeSpans[Number(i)])}</code>`);

  return out;
}

function markdown(src) {
  const lines = String(src).replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let i = 0;

  const isBlockStart = (line) =>
    !line.trim() ||
    /^```/.test(line) ||
    /^#{1,6}\s/.test(line) ||
    /^\s*([-*+]\s|\d+\.\s)/.test(line) ||
    /^>\s?/.test(line) ||
    /^(-{3,}|\*{3,}|_{3,})\s*$/.test(line) ||
    /^\|/.test(line);

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    const fence = /^```\s*([A-Za-z0-9+#-]*)\s*$/.exec(line);
    if (fence) {
      const lang = fence[1];
      const buf = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) buf.push(lines[i++]);
      i++;
      const cls = lang ? ` class="language-${lang}"` : "";
      html.push(`<pre><code${cls}>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { html.push("<hr>"); i++; continue; }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const content = heading[2].trim();
      html.push(`<h${level} id="${slugify(content)}">${inline(content)}</h${level}>`);
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      html.push(`<blockquote>${markdown(buf.join("\n"))}</blockquote>`);
      continue;
    }

    if (/^\|/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const cells = (row) => row.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(lines[i]);
      i += 2;
      const body = [];
      while (i < lines.length && /^\|/.test(lines[i])) body.push(cells(lines[i++]));
      html.push(
        `<div class="table-wrap"><table><thead><tr>${head
          .map((c) => `<th>${inline(c)}</th>`)
          .join("")}</tr></thead><tbody>${body
          .map((row) => `<tr>${row.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table></div>`
      );
      continue;
    }

    const bullet = /^\s*([-*+])\s+(.*)$/.exec(line);
    const numbered = /^\s*(\d+)\.\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      const items = [];
      while (i < lines.length) {
        const m = ordered
          ? /^\s*\d+\.\s+(.*)$/.exec(lines[i])
          : /^\s*[-*+]\s+(.*)$/.exec(lines[i]);
        if (!m) break;
        const buf = [m[1]];
        i++;
        while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) buf.push(lines[i++].trim());
        items.push(`<li>${inline(buf.join(" "))}</li>`);
      }
      html.push(ordered ? `<ol>${items.join("")}</ol>` : `<ul>${items.join("")}</ul>`);
      continue;
    }

    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) buf.push(lines[i++]);
    html.push(`<p>${inline(buf.join(" "))}</p>`);
  }

  return html.join("\n");
}

/* ------------------------------------------------------------------ *
 * Layout
 * ------------------------------------------------------------------ */

function layout({ config, title, description, bodyClass = "", content, canonical, current = "" }) {
  const fullTitle = title ? `${title} · ${config.name}` : `${config.name} · ${config.role}`;

  const navHtml = (config.nav || [])
    .map((item) => {
      const active = item.href === current ? ' aria-current="page"' : "";
      return `<a href="${item.href}"${active}>${escapeHtml(item.label)}</a>`;
    })
    .join("");

  const footerLinks = (config.links || [])
    .map((l) => `<a href="${l.href}"${linkAttrs(l.href)}>${escapeHtml(l.label)}</a>`)
    .join("");

  return `<!doctype html>
<html lang="${config.lang || "de"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(fullTitle)}</title>
<meta name="description" content="${escapeHtml(description || config.site?.description || "")}">
${config.site?.noindex ? '<meta name="robots" content="noindex, nofollow">' : ""}
${canonical ? `<link rel="canonical" href="${canonical}">` : ""}
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(fullTitle)}">
<meta property="og:description" content="${escapeHtml(description || config.site?.description || "")}">
<meta name="theme-color" content="#0d0f12" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<script>document.documentElement.classList.add("js")</script>
<link rel="stylesheet" href="/assets/styles.css">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>◆</text></svg>">
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Direkt zum Inhalt</a>

<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/">${escapeHtml(config.name)}</a>
    <nav class="site-nav" aria-label="Hauptnavigation">${navHtml}</nav>
  </div>
</header>

<main id="main">
${content}
</main>

<footer class="site-footer">
  <div class="wrap footer-inner">
    <p>© ${new Date().getFullYear()} ${escapeHtml(config.name)}</p>
    <nav class="footer-links" aria-label="Fußzeile">${footerLinks}<a href="/impressum/">Impressum</a></nav>
  </div>
</footer>

<script src="/assets/site.js" defer></script>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ *
 * Bausteine
 * ------------------------------------------------------------------ */

function projectCard(project) {
  const tags = (project.data.tags || []).map((t) => `<li>${escapeHtml(t)}</li>`).join("");

  return `<article class="card">
  <a class="card-link" href="/projekte/${project.slug}/">
    <span class="card-meta">${escapeHtml(project.data.year || "")}</span>
    <h3 class="card-title">${escapeHtml(project.data.title)}</h3>
    <p class="card-summary">${escapeHtml(project.data.summary || "")}</p>
  </a>
  ${tags ? `<ul class="tags">${tags}</ul>` : ""}
</article>`;
}

function pageHeader({ eyebrow, title, lead }) {
  return `<header class="page-header wrap">
  ${eyebrow ? `<p class="eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
  <h1>${escapeHtml(title)}</h1>
  ${lead ? `<p class="lead">${escapeHtml(lead)}</p>` : ""}
</header>`;
}

function emptyProjects() {
  return `<p class="muted">Noch keine Projekte. Lege eine Datei unter <code>content/projects/</code> an.</p>`;
}

/* ------------------------------------------------------------------ *
 * Seiten
 * ------------------------------------------------------------------ */

function homePage({ config, home, projects }) {
  const heroLinks = (config.links || [])
    .map((l) => `<a class="btn" href="${l.href}"${linkAttrs(l.href)}>${escapeHtml(l.label)}</a>`)
    .join("");

  const featured = projects.filter((p) => p.data.featured !== false).slice(0, 3);

  return `
<section class="hero wrap">
  <p class="eyebrow">${escapeHtml(config.role)}${config.location ? ` · ${escapeHtml(config.location)}` : ""}</p>
  <h1>${escapeHtml(config.name)}</h1>
  <p class="lead">${escapeHtml(config.tagline)}</p>
  <div class="btn-row">
    <a class="btn btn-primary" href="/projekte/">Zu den Projekten</a>
    ${heroLinks}${config.cv ? `<a class="btn" href="${config.cv}">Lebenslauf (PDF)</a>` : ""}
  </div>
</section>

${home.html ? `<section class="wrap section intro"><div class="prose narrow">${home.html}</div>
  <p class="section-link"><a href="/ueber-mich/">Wer ich bin →</a></p></section>` : ""}

<section class="wrap section">
  <h2 class="section-title">Eine Auswahl</h2>
  ${featured.length ? `<div class="cards">${featured.map(projectCard).join("")}</div>` : emptyProjects()}
  ${projects.length > featured.length
      ? `<p class="section-link"><a href="/projekte/">Alle ${projects.length} Projekte →</a></p>`
      : projects.length
        ? `<p class="section-link"><a href="/projekte/">Zur Übersicht →</a></p>`
        : ""}
</section>

<section class="wrap section cta">
  <h2>Schreib mir</h2>
  <p class="lead">Offene Stelle, Projektidee oder einfach eine Frage zu einem der Spiele?</p>
  <div class="btn-row"><a class="btn btn-primary" href="/kontakt/">Zum Kontakt</a></div>
</section>
`;
}

function projectsIndexPage({ config, projects, intro }) {
  return `
${pageHeader({
    eyebrow: "Spiele",
    title: "Projekte",
    lead: intro || "Woran ich bisher gearbeitet habe.",
  })}

<section class="wrap section-tight">
  ${projects.length ? `<div class="cards">${projects.map(projectCard).join("")}</div>` : emptyProjects()}
</section>
`;
}

function projectPage({ project }) {
  const tags = (project.data.tags || []).map((t) => `<li>${escapeHtml(t)}</li>`).join("");

  const meta = [];
  if (project.data.year) meta.push(`<div><dt>Zeitraum</dt><dd>${escapeHtml(project.data.year)}</dd></div>`);
  if (project.data.role) meta.push(`<div><dt>Rolle</dt><dd>${escapeHtml(project.data.role)}</dd></div>`);
  if (project.data.stack?.length)
    meta.push(`<div><dt>Stack</dt><dd>${escapeHtml(project.data.stack.join(", "))}</dd></div>`);

  const actions = [];
  if (project.data.repo)
    actions.push(`<a class="btn" href="${project.data.repo}" target="_blank" rel="noopener noreferrer">Quellcode</a>`);
  if (project.data.demo)
    actions.push(
      `<a class="btn btn-primary" href="${project.data.demo}" target="_blank" rel="noopener noreferrer">${escapeHtml(project.data.demoLabel || "Live ansehen")}</a>`
    );

  return `
<article class="wrap project">
  <a class="back" href="/projekte/">← Zurück zur Übersicht</a>
  <header class="project-header">
    <h1>${escapeHtml(project.data.title)}</h1>
    <p class="lead">${escapeHtml(project.data.summary || "")}</p>
    ${tags ? `<ul class="tags">${tags}</ul>` : ""}
    ${actions.length ? `<div class="btn-row">${actions.join("")}</div>` : ""}
  </header>
  ${meta.length ? `<dl class="project-meta">${meta.join("")}</dl>` : ""}
  ${project.data.cover ? `<img class="cover" src="${project.data.cover}" alt="${escapeHtml(project.data.title)}">` : ""}
  <div class="prose">${project.html}</div>
</article>
`;
}

function aboutPage({ config, about }) {
  const skills = (config.skills || [])
    .map(
      (g) => `<div class="skill-group">
      <h3>${escapeHtml(g.group)}</h3>
      <ul class="tags">${(g.items || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
    </div>`
    )
    .join("");

  return `
${pageHeader({
    eyebrow: config.role,
    title: about.data.headline || "Über mich",
    lead: about.data.lead || "",
  })}

<section class="wrap section-tight">
  <div class="prose narrow">${about.html}</div>
  ${skills ? `<h2 class="section-title spaced">Werkzeuge</h2><div class="skills">${skills}</div>` : ""}
  ${config.cv ? `<div class="btn-row spaced"><a class="btn" href="${config.cv}">Lebenslauf als PDF</a></div>` : ""}
</section>
`;
}

function contactPage({ config, contact }) {
  const links = (config.links || [])
    .map(
      (l) => `<li><a href="${l.href}"${linkAttrs(l.href)}>${escapeHtml(l.label)}</a></li>`
    )
    .join("");

  return `
${pageHeader({
    eyebrow: "Kontakt",
    title: contact.data.headline || "Kontakt",
    lead: contact.data.lead || "",
  })}

<section class="wrap section-tight">
  ${contact.html ? `<div class="prose narrow">${contact.html}</div>` : ""}
  <div class="btn-row spaced">
    <a class="btn btn-primary" href="mailto:${escapeHtml(config.email)}">${escapeHtml(config.email)}</a>
  </div>
  ${links ? `<h2 class="section-title spaced">Woanders zu finden</h2><ul class="link-list">${links}</ul>` : ""}
</section>
`;
}

function impressumPage({ config }) {
  const im = config.impressum || {};
  return `
<article class="wrap section prose narrow">
  <h1>Impressum</h1>
  <p>Angaben gemäß § 5 DDG</p>
  <p>${escapeHtml(im.name || config.name)}<br>
  ${(im.address || []).map(escapeHtml).join("<br>")}</p>
  <h2>Kontakt</h2>
  <p>E-Mail: <a href="mailto:${escapeHtml(im.email || config.email)}">${escapeHtml(im.email || config.email)}</a></p>
  <h2>Verantwortlich für den Inhalt</h2>
  <p>${escapeHtml(im.name || config.name)}, Anschrift wie oben.</p>
  ${im.note ? `<p class="muted"><em>${escapeHtml(im.note)}</em></p>` : ""}
</article>
`;
}

/* ------------------------------------------------------------------ *
 * Build
 * ------------------------------------------------------------------ */

async function loadMarkdownFile(file) {
  const raw = await readFile(file, "utf8");
  const { data, body } = parseFrontmatter(raw);
  return { data, html: markdown(body), raw: body };
}

async function loadOptional(name) {
  const file = path.join(ROOT, "content", name);
  if (!existsSync(file)) return { data: {}, html: "", raw: "" };
  return loadMarkdownFile(file);
}

async function loadProjects() {
  const dir = path.join(ROOT, "content", "projects");
  if (!existsSync(dir)) return [];

  const files = (await readdir(dir)).filter((f) => f.endsWith(".md"));
  const projects = [];

  for (const file of files) {
    const doc = await loadMarkdownFile(path.join(dir, file));
    if (doc.data.draft === true) continue;
    if (!doc.data.title) {
      console.warn(`  ! ${file} hat kein "title" im Frontmatter, wird übersprungen.`);
      continue;
    }
    projects.push({
      ...doc,
      file,
      slug: doc.data.slug || slugify(file.replace(/^\d+[-_]?/, "").replace(/\.md$/, "")),
    });
  }

  projects.sort((a, b) => {
    const oa = a.data.order ?? 999;
    const ob = b.data.order ?? 999;
    if (oa !== ob) return oa - ob;
    return String(b.data.year || "").localeCompare(String(a.data.year || ""));
  });

  return projects;
}

async function copyDir(from, to) {
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) await copyDir(src, dest);
    else await writeFile(dest, await readFile(src));
  }
}

async function writePage(relPath, html) {
  const target = path.join(DIST, relPath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html, "utf8");
}

async function build() {
  const config = JSON.parse(await readFile(path.join(ROOT, "site.config.json"), "utf8"));
  const base = config.site?.url ? config.site.url.replace(/\/$/, "") : "";
  const canonical = (p) => (base ? base + p : "");

  try {
    await rm(DIST, { recursive: true, force: true });
  } catch {
    console.warn("  ! dist/ konnte nicht geleert werden, Dateien werden überschrieben.");
  }
  await mkdir(DIST, { recursive: true });

  const [home, about, contact, projects] = await Promise.all([
    loadOptional("home.md"),
    loadOptional("about.md"),
    loadOptional("kontakt.md"),
    loadProjects(),
  ]);

  await writePage(
    "index.html",
    layout({
      config,
      title: "",
      description: config.site?.description,
      canonical: canonical("/"),
      bodyClass: "page-home",
      current: "/",
      content: homePage({ config, home, projects }),
    })
  );

  await writePage(
    path.join("projekte", "index.html"),
    layout({
      config,
      title: "Projekte",
      description: `Spiele und Arbeiten von ${config.name}.`,
      canonical: canonical("/projekte/"),
      bodyClass: "page-projects",
      current: "/projekte/",
      content: projectsIndexPage({ config, projects, intro: config.projectsIntro }),
    })
  );

  for (const project of projects) {
    await writePage(
      path.join("projekte", project.slug, "index.html"),
      layout({
        config,
        title: project.data.title,
        description: project.data.summary,
        canonical: canonical(`/projekte/${project.slug}/`),
        bodyClass: "page-project",
        current: "/projekte/",
        content: projectPage({ project }),
      })
    );
  }

  await writePage(
    path.join("ueber-mich", "index.html"),
    layout({
      config,
      title: about.data.headline || "Über mich",
      description: about.data.lead || `Über ${config.name}.`,
      canonical: canonical("/ueber-mich/"),
      bodyClass: "page-about",
      current: "/ueber-mich/",
      content: aboutPage({ config, about }),
    })
  );

  await writePage(
    path.join("kontakt", "index.html"),
    layout({
      config,
      title: "Kontakt",
      description: `So erreichst du ${config.name}.`,
      canonical: canonical("/kontakt/"),
      bodyClass: "page-contact",
      current: "/kontakt/",
      content: contactPage({ config, contact }),
    })
  );

  await writePage(
    path.join("impressum", "index.html"),
    layout({
      config,
      title: "Impressum",
      description: "Impressum und Kontaktangaben.",
      bodyClass: "page-legal",
      content: impressumPage({ config }),
    })
  );

  await writePage(
    "404.html",
    layout({
      config,
      title: "Nichts gefunden",
      description: "Diese Seite existiert nicht.",
      bodyClass: "page-legal",
      content: `<section class="wrap section prose narrow"><h1>404</h1><p>Diese Adresse führt ins Leere. <a href="/">Zurück zur Startseite</a>.</p></section>`,
    })
  );

  if (existsSync(path.join(ROOT, "assets"))) {
    await copyDir(path.join(ROOT, "assets"), path.join(DIST, "assets"));
  }

  if (base) {
    const urls = [
      "/",
      "/projekte/",
      ...projects.map((p) => `/projekte/${p.slug}/`),
      "/ueber-mich/",
      "/kontakt/",
      "/impressum/",
    ];
    await writeFile(
      path.join(DIST, "sitemap.xml"),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
        .map((u) => `  <url><loc>${base}${u}</loc></url>`)
        .join("\n")}\n</urlset>\n`,
      "utf8"
    );
    await writeFile(
      path.join(DIST, "robots.txt"),
      config.site?.noindex
        ? `User-agent: *\nDisallow: /\n`
        : `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`,
      "utf8"
    );
    // GitHub Pages liest die Wunschdomain aus dieser Datei
    await writeFile(path.join(DIST, "CNAME"), `${new URL(base).hostname}\n`, "utf8");
  }

  console.log(`✓ Build fertig: ${projects.length} Projekt(e), Ausgabe in dist/`);
  console.log(`  · /  /projekte/  /ueber-mich/  /kontakt/  /impressum/`);
  for (const p of projects) console.log(`  · /projekte/${p.slug}/  (${p.file})`);
  if (config.site?.noindex) console.log(`  ! noindex ist aktiv, Suchmaschinen bleiben ausgesperrt.`);
}

build().catch((err) => {
  console.error("✗ Build fehlgeschlagen:", err);
  process.exit(1);
});
