#!/usr/bin/env node
/**
 * Portfolio-Build, ohne externe Abhängigkeiten.
 *
 *   node build.mjs        Baut die Seite nach dist/
 *
 * Inhalte:
 *   site.config.json      Name, Links, Skills, Impressum, Übersetzungen
 *   content/              deutsche Texte
 *   content/en/           englische Texte (fehlt eine Datei, greift die deutsche)
 *   assets/               wird 1:1 nach dist/assets kopiert
 *
 * Erzeugte Seiten je Sprache:
 *   /            /en/              Startseite
 *   /projekte/   /en/projects/     Übersicht
 *   /projekte/x/ /en/projects/x/   Detailseite
 *   /ueber-mich/ /en/about/
 *   /kontakt/    /en/contact/
 *   /impressum/  /en/imprint/
 */

import { readFile, readdir, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, "dist");

/* ------------------------------------------------------------------ *
 * Sprachen
 * ------------------------------------------------------------------ */

const LANGS = {
  de: {
    code: "de",
    prefix: "",
    dir: "",
    other: "en",
    otherLabel: "EN",
    otherTitle: "Switch to English",
    seg: { projects: "projekte", artworks: "artworks", about: "ueber-mich", contact: "kontakt", imprint: "impressum" },
    t: {
      skip: "Direkt zum Inhalt",
      nav: { projects: "Projekte", artworks: "Artworks", about: "Über mich", contact: "Kontakt" },
      heroCta: "Zu den Projekten",
      selected: "Eine Auswahl",
      allProjects: (n) => `Alle ${n} Projekte`,
      overview: "Zur Übersicht",
      moreAbout: "Wer ich bin",
      ctaTitle: "Schreib mir",
      ctaLead: "Offene Stelle, Projektidee oder einfach eine Frage zu einem der Spiele?",
      ctaButton: "Zum Kontakt",
      back: "Zurück zur Übersicht",
      period: "Zeitraum",
      role: "Rolle",
      stack: "Stack",
      source: "Quellcode",
      live: "Live ansehen",
      video: "Video ansehen",
      tools: "Werkzeuge",
      elsewhere: "Woanders zu finden",
      imprint: "Impressum",
      artworksEyebrow: "Zeichnung und 3D",
      artworksTitle: "Artworks",
      artworksLead: "Arbeiten aus dem Studium, von der Bleistiftstudie bis zum fertigen 3D-Modell.",
      instagramTitle: "Zuletzt auf Instagram",
      instagramLead: "Was gerade entsteht, landet dort zuerst.",
      instagramCta: "Profil ansehen",
      projectsEyebrow: "Spiele",
      projectsTitle: "Projekte",
      projectsLead: "Woran ich bisher gearbeitet habe.",
      aboutTitle: "Über mich",
      contactTitle: "Kontakt",
      cv: "Lebenslauf als PDF",
      empty: "Noch keine Projekte.",
      notFoundTitle: "Nichts gefunden",
      notFoundText: "Diese Adresse führt ins Leere.",
      backHome: "Zurück zur Startseite",
      theme: "Hell und dunkel wechseln",
      imprintHead: "Angaben gemäß § 5 DDG",
      imprintContact: "Kontakt",
      imprintResponsible: "Verantwortlich für den Inhalt",
      imprintAddress: "Anschrift wie oben.",
      mainNav: "Hauptnavigation",
      footerNav: "Fußzeile",
      shot: (x) => `Bildschirmfoto aus ${x}`,
    },
  },
  en: {
    code: "en",
    prefix: "/en",
    dir: "en",
    other: "de",
    otherLabel: "DE",
    otherTitle: "Auf Deutsch ansehen",
    seg: { projects: "projects", artworks: "artworks", about: "about", contact: "contact", imprint: "imprint" },
    t: {
      skip: "Skip to content",
      nav: { projects: "Work", artworks: "Artworks", about: "About", contact: "Contact" },
      heroCta: "See the work",
      selected: "Selected work",
      allProjects: (n) => `All ${n} projects`,
      overview: "See all work",
      moreAbout: "More about me",
      ctaTitle: "Get in touch",
      ctaLead: "An open role, a project idea, or a question about one of the games?",
      ctaButton: "Contact",
      back: "Back to all work",
      period: "Period",
      role: "Role",
      stack: "Stack",
      source: "Source code",
      live: "Play it",
      video: "Watch video",
      tools: "Tools",
      elsewhere: "Elsewhere",
      imprint: "Legal notice",
      artworksEyebrow: "Drawing and 3D",
      artworksTitle: "Artworks",
      artworksLead: "Work from my studies, from pencil studies to finished 3D models.",
      instagramTitle: "Latest on Instagram",
      instagramLead: "Whatever is in progress shows up there first.",
      instagramCta: "Open the profile",
      projectsEyebrow: "Games",
      projectsTitle: "Work",
      projectsLead: "What I have built so far.",
      aboutTitle: "About",
      contactTitle: "Contact",
      cv: "Download CV",
      empty: "No projects yet.",
      notFoundTitle: "Not found",
      notFoundText: "There is nothing at this address.",
      backHome: "Back to the homepage",
      theme: "Toggle light and dark",
      imprintHead: "Information according to § 5 DDG",
      imprintContact: "Contact",
      imprintResponsible: "Responsible for the content",
      imprintAddress: "address as above.",
      mainNav: "Main navigation",
      footerNav: "Footer",
      shot: (x) => `Screenshot from ${x}`,
    },
  },
};

const routes = (L) => ({
  home: `${L.prefix}/`,
  projects: `${L.prefix}/${L.seg.projects}/`,
  project: (slug) => `${L.prefix}/${L.seg.projects}/${slug}/`,
  artworks: `${L.prefix}/${L.seg.artworks}/`,
  about: `${L.prefix}/${L.seg.about}/`,
  contact: `${L.prefix}/${L.seg.contact}/`,
  imprint: `${L.prefix}/${L.seg.imprint}/`,
});

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

const linkAttrs = (href) =>
  /^https?:/.test(href) ? ' target="_blank" rel="noopener noreferrer"' : "";

const pick = (value, lang) =>
  value && typeof value === "object" && !Array.isArray(value) ? value[lang] ?? value.de ?? "" : value ?? "";

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
 * Symbol für den Hell-Dunkel-Schalter
 * ------------------------------------------------------------------ */

const ICON_THEME = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
<circle class="sun-core" cx="12" cy="12" r="4.6"></circle>
<g class="sun-rays">
<line x1="12" y1="1.6" x2="12" y2="3.7"></line><line x1="12" y1="20.3" x2="12" y2="22.4"></line>
<line x1="1.6" y1="12" x2="3.7" y2="12"></line><line x1="20.3" y1="12" x2="22.4" y2="12"></line>
<line x1="4.6" y1="4.6" x2="6.1" y2="6.1"></line><line x1="17.9" y1="17.9" x2="19.4" y2="19.4"></line>
<line x1="4.6" y1="19.4" x2="6.1" y2="17.9"></line><line x1="17.9" y1="6.1" x2="19.4" y2="4.6"></line>
</g>
<path class="moon" d="M21 14.2A8.6 8.6 0 0 1 9.8 3a8.6 8.6 0 1 0 11.2 11.2z"></path>
</svg>`;

/* ------------------------------------------------------------------ *
 * Layout
 * ------------------------------------------------------------------ */

function layout({ config, L, title, description, bodyClass = "", content, canonical, altUrl, current = "" }) {
  const r = routes(L);
  const t = L.t;
  const fullTitle = title ? `${title} · ${config.name}` : `${config.name} · ${pick(config.role, L.code)}`;
  const base = config.site?.url ? config.site.url.replace(/\/$/, "") : "";

  const navItems = [
    { label: t.nav.projects, href: r.projects },
    { label: t.nav.artworks, href: r.artworks },
    { label: t.nav.about, href: r.about },
    { label: t.nav.contact, href: r.contact },
  ];

  const navHtml = navItems
    .map((item) => {
      const active = item.href === current ? ' aria-current="page"' : "";
      return `<a href="${item.href}"${active}>${escapeHtml(item.label)}</a>`;
    })
    .join("");

  const footerLinks = (config.links || [])
    .map((l) => `<a href="${l.href}"${linkAttrs(l.href)}>${escapeHtml(l.label)}</a>`)
    .join("");

  return `<!doctype html>
<html lang="${L.code}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(fullTitle)}</title>
<meta name="description" content="${escapeHtml(description || "")}">
${config.site?.noindex ? '<meta name="robots" content="noindex, nofollow">' : ""}
${canonical ? `<link rel="canonical" href="${canonical}">` : ""}
${base && canonical ? `<link rel="alternate" hreflang="${L.code}" href="${canonical}">` : ""}
${base && altUrl ? `<link rel="alternate" hreflang="${L.other}" href="${base}${altUrl}">` : ""}
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(fullTitle)}">
<meta property="og:description" content="${escapeHtml(description || "")}">
<meta name="color-scheme" content="light dark">
<script>
(function () {
  document.documentElement.classList.add("js");
  try {
    var saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") document.documentElement.setAttribute("data-theme", saved);
  } catch (e) {}
})();
</script>
<link rel="stylesheet" href="/assets/styles.css">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>◆</text></svg>">
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">${escapeHtml(t.skip)}</a>

<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="${r.home}">${escapeHtml(config.name)}</a>
    <nav class="site-nav" aria-label="${escapeHtml(t.mainNav)}">${navHtml}</nav>
    <div class="header-tools">
      <a class="lang-switch" href="${altUrl}" title="${escapeHtml(L.otherTitle)}" lang="${L.other}">${L.otherLabel}</a>
      <button class="theme-toggle" type="button" aria-label="${escapeHtml(t.theme)}" title="${escapeHtml(t.theme)}">${ICON_THEME}</button>
    </div>
  </div>
</header>

<main id="main">
${content}
</main>

<footer class="site-footer">
  <div class="wrap footer-inner">
    <p>© ${new Date().getFullYear()} ${escapeHtml(config.name)}</p>
    <nav class="footer-links" aria-label="${escapeHtml(t.footerNav)}">${footerLinks}<a href="${r.imprint}">${escapeHtml(t.imprint)}</a></nav>
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

function projectCard(project, L) {
  const r = routes(L);
  const d = project.data;
  const image = d.thumb || d.cover;
  const tags = (d.tags || []).map((x) => `<li>${escapeHtml(x)}</li>`).join("");

  return `<article class="card${image ? " has-cover" : ""}" data-anim="rise">
  <a class="card-link" href="${r.project(project.slug)}">
    ${image ? `<span class="card-cover"><img src="${image}" alt="" loading="lazy" decoding="async"></span>` : ""}
    <span class="card-meta">${escapeHtml(d.year || "")}</span>
    <h3 class="card-title">${escapeHtml(d.title)}</h3>
    <p class="card-summary">${escapeHtml(d.summary || "")}</p>
  </a>
  ${tags ? `<ul class="tags">${tags}</ul>` : ""}
</article>`;
}

function pageHeader({ eyebrow, title, lead }) {
  return `<header class="page-header wrap" data-anim="rise">
  ${eyebrow ? `<p class="eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
  <h1 class="display-sm">${escapeHtml(title)}</h1>
  ${lead ? `<p class="lead">${escapeHtml(lead)}</p>` : ""}
</header>`;
}

/* ------------------------------------------------------------------ *
 * Seiten
 * ------------------------------------------------------------------ */

function homePage({ config, L, home, projects }) {
  const r = routes(L);
  const t = L.t;

  const heroLinks = (config.links || [])
    .map((l) => `<a class="btn" href="${l.href}"${linkAttrs(l.href)}>${escapeHtml(l.label)}</a>`)
    .join("");

  const featured = projects.filter((p) => p.data.featured !== false).slice(0, 3);
  const location = pick(config.location, L.code);

  return `
<section class="hero">
  <div class="hero-glow" aria-hidden="true"></div>
  <div class="wrap hero-inner">
    <p class="eyebrow">${escapeHtml(pick(config.role, L.code))}${location ? ` · ${escapeHtml(location)}` : ""}</p>
    <h1 class="display">${escapeHtml(config.name)}</h1>
    <p class="hero-lead">${escapeHtml(pick(config.tagline, L.code))}</p>
    <div class="btn-row">
      <a class="btn btn-primary" href="${r.projects}">${escapeHtml(t.heroCta)}</a>
      ${heroLinks}${config.cv ? `<a class="btn" href="${config.cv}">${escapeHtml(t.cv)}</a>` : ""}
    </div>
  </div>
</section>

${home.html
  ? `<section class="band">
  <div class="wrap">
    <div class="statement" data-anim="rise">${home.html}</div>
    <p class="section-link" data-anim="rise"><a href="${r.about}">${escapeHtml(t.moreAbout)}</a></p>
  </div>
</section>`
  : ""}

<section class="wrap section">
  <h2 class="section-title" data-anim="rise">${escapeHtml(t.selected)}</h2>
  ${featured.length
    ? `<div class="cards">${featured.map((p) => projectCard(p, L)).join("")}</div>`
    : `<p class="muted">${escapeHtml(t.empty)}</p>`}
  <p class="section-link" data-anim="rise"><a href="${r.projects}">${escapeHtml(
      projects.length > featured.length ? t.allProjects(projects.length) : t.overview
    )}</a></p>
</section>

<section class="cta">
  <div class="wrap" data-anim="rise">
    <h2 class="display-sm">${escapeHtml(t.ctaTitle)}</h2>
    <p class="lead">${escapeHtml(t.ctaLead)}</p>
    <div class="btn-row"><a class="btn btn-primary" href="${r.contact}">${escapeHtml(t.ctaButton)}</a></div>
  </div>
</section>
`;
}

function projectsIndexPage({ L, projects, intro }) {
  const t = L.t;
  return `
${pageHeader({ eyebrow: t.projectsEyebrow, title: t.projectsTitle, lead: intro || t.projectsLead })}

<section class="wrap section-tight">
  ${projects.length
    ? `<div class="cards">${projects.map((p) => projectCard(p, L)).join("")}</div>`
    : `<p class="muted">${escapeHtml(t.empty)}</p>`}
</section>
`;
}

function projectPage({ project, L }) {
  const r = routes(L);
  const t = L.t;
  const d = project.data;

  const tags = (d.tags || []).map((x) => `<li>${escapeHtml(x)}</li>`).join("");

  const meta = [];
  if (d.year) meta.push(`<div><dt>${escapeHtml(t.period)}</dt><dd>${escapeHtml(d.year)}</dd></div>`);
  if (d.role) meta.push(`<div><dt>${escapeHtml(t.role)}</dt><dd>${escapeHtml(d.role)}</dd></div>`);
  if (d.stack?.length)
    meta.push(`<div><dt>${escapeHtml(t.stack)}</dt><dd>${escapeHtml(d.stack.join(", "))}</dd></div>`);

  const actions = [];
  if (d.video)
    actions.push(`<a class="btn" href="${d.video}" target="_blank" rel="noopener noreferrer">${escapeHtml(d.videoLabel || t.video)}</a>`);
  if (d.repo)
    actions.push(`<a class="btn" href="${d.repo}" target="_blank" rel="noopener noreferrer">${escapeHtml(t.source)}</a>`);
  if (d.demo)
    actions.push(`<a class="btn btn-primary" href="${d.demo}" target="_blank" rel="noopener noreferrer">${escapeHtml(d.demoLabel || t.live)}</a>`);

  const shots = d.gallery || [];
  const gallery = shots.length
    ? `<div class="shots wrap">${shots
        .map(
          (src) =>
            `<figure data-anim="zoom"><img src="${src}" alt="${escapeHtml(t.shot(d.title))}" loading="lazy" decoding="async"></figure>`
        )
        .join("")}</div>`
    : "";

  return `
<article class="project">
  <div class="wrap">
    <a class="back" href="${r.projects}">← ${escapeHtml(t.back)}</a>
    <header class="project-header" data-anim="rise">
      <h1 class="display-sm">${escapeHtml(d.title)}</h1>
      <p class="lead">${escapeHtml(d.summary || "")}</p>
      ${tags ? `<ul class="tags">${tags}</ul>` : ""}
      ${actions.length ? `<div class="btn-row">${actions.join("")}</div>` : ""}
    </header>
    ${meta.length ? `<dl class="project-meta" data-anim="rise">${meta.join("")}</dl>` : ""}
  </div>

  ${d.cover ? `<div class="cover-frame wrap" data-anim="zoom"><img class="cover" src="${d.cover}" alt="${escapeHtml(d.title)}"></div>` : ""}
  ${gallery}

  <div class="wrap">
    <div class="prose" data-anim="rise">${project.html}</div>
  </div>
</article>
`;
}

function artworksPage({ config, L, artworks }) {
  const t = L.t;

  const entries = artworks
    .map((a) => {
      const d = a.data;
      const tags = (d.tags || []).map((x) => `<li>${escapeHtml(x)}</li>`).join("");

      const video = d.video && !/^https?:/.test(d.video)
        ? `<div class="artwork-video" data-anim="zoom">
             <video src="${d.video}"${d.poster ? ` poster="${d.poster}"` : ""} controls muted loop playsinline preload="none"></video>
           </div>`
        : "";

      const shots = (d.gallery || [])
        .map(
          (src) =>
            `<figure data-anim="zoom"><a href="${src}" target="_blank" rel="noopener noreferrer"><img src="${src}" alt="${escapeHtml(d.title)}" loading="lazy" decoding="async"></a></figure>`
        )
        .join("");

      return `<article class="artwork">
  <header class="artwork-head" data-anim="rise">
    <h2 class="artwork-title">${escapeHtml(d.title)}</h2>
    <p class="artwork-meta">${escapeHtml(d.year || "")}${d.role ? ` · ${escapeHtml(d.role)}` : ""}</p>
    ${a.html ? `<div class="prose narrow">${a.html}</div>` : ""}
    ${tags ? `<ul class="tags">${tags}</ul>` : ""}
  </header>
  ${video}
  ${shots ? `<div class="shots">${shots}</div>` : ""}
</article>`;
    })
    .join("");

  const ig = config.instagram || {};
  const posts = (ig.posts || [])
    .slice(0, 6)
    .map(
      (post) =>
        `<a class="insta-tile" href="${post.href || ig.profile}" target="_blank" rel="noopener noreferrer" data-anim="zoom">
           <img src="${post.image}" alt="${escapeHtml(post.alt || "Instagram")}" loading="lazy" decoding="async">
         </a>`
    )
    .join("");

  const instagram = ig.profile
    ? `<section class="band insta">
  <div class="wrap">
    <h2 class="display-sm" data-anim="rise">${escapeHtml(t.instagramTitle)}</h2>
    <p class="lead" data-anim="rise">${escapeHtml(t.instagramLead)}</p>
    ${posts ? `<div class="insta-grid">${posts}</div>` : ""}
    <div class="btn-row spaced" data-anim="rise">
      <a class="btn" href="${ig.profile}" target="_blank" rel="noopener noreferrer">${escapeHtml(t.instagramCta)}</a>
    </div>
  </div>
</section>`
    : "";

  return `
${pageHeader({ eyebrow: t.artworksEyebrow, title: t.artworksTitle, lead: pick(config.artworksIntro, L.code) || t.artworksLead })}

<section class="wrap section-tight artworks">
  ${entries || `<p class="muted">${escapeHtml(t.empty)}</p>`}
</section>

${instagram}
`;
}

function aboutPage({ config, L, about }) {
  const t = L.t;
  const skills = (config.skills || [])
    .map(
      (g) => `<div class="skill-group">
      <h3>${escapeHtml(pick(g.group, L.code))}</h3>
      <ul class="tags">${(g.items || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
    </div>`
    )
    .join("");

  return `
${pageHeader({ eyebrow: pick(config.role, L.code), title: about.data.headline || t.aboutTitle, lead: about.data.lead || "" })}

<section class="wrap section-tight">
  <div class="prose narrow" data-anim="rise">${about.html}</div>
  ${skills
    ? `<h2 class="section-title spaced" data-anim="rise">${escapeHtml(t.tools)}</h2>
       <div class="skills" data-anim="rise">${skills}</div>`
    : ""}
  ${config.cv ? `<div class="btn-row spaced" data-anim="rise"><a class="btn" href="${config.cv}">${escapeHtml(t.cv)}</a></div>` : ""}
</section>
`;
}

function contactPage({ config, L, contact }) {
  const t = L.t;
  const links = (config.links || [])
    .map((l) => `<li><a href="${l.href}"${linkAttrs(l.href)}>${escapeHtml(l.label)}</a></li>`)
    .join("");

  return `
${pageHeader({ eyebrow: t.contactTitle, title: contact.data.headline || t.contactTitle, lead: contact.data.lead || "" })}

<section class="wrap section-tight">
  ${contact.html ? `<div class="prose narrow" data-anim="rise">${contact.html}</div>` : ""}
  <div class="btn-row spaced" data-anim="rise">
    <a class="btn btn-primary" href="mailto:${escapeHtml(config.email)}">${escapeHtml(config.email)}</a>
  </div>
  ${links
    ? `<h2 class="section-title spaced" data-anim="rise">${escapeHtml(t.elsewhere)}</h2>
       <ul class="link-list" data-anim="rise">${links}</ul>`
    : ""}
</section>
`;
}

function imprintPage({ config, L }) {
  const t = L.t;
  const im = config.impressum || {};
  return `
<article class="wrap section prose narrow" data-anim="rise">
  <h1>${escapeHtml(t.imprint)}</h1>
  <p>${escapeHtml(t.imprintHead)}</p>
  <p>${escapeHtml(im.name || config.name)}<br>
  ${(im.address || []).map(escapeHtml).join("<br>")}</p>
  <h2>${escapeHtml(t.imprintContact)}</h2>
  <p><a href="mailto:${escapeHtml(im.email || config.email)}">${escapeHtml(im.email || config.email)}</a></p>
  <h2>${escapeHtml(t.imprintResponsible)}</h2>
  <p>${escapeHtml(im.name || config.name)}, ${escapeHtml(t.imprintAddress)}</p>
  ${im.note ? `<p class="muted"><em>${escapeHtml(pick(im.note, L.code))}</em></p>` : ""}
</article>
`;
}

/* ------------------------------------------------------------------ *
 * Inhalte laden
 * ------------------------------------------------------------------ */

async function loadMarkdownFile(file) {
  const raw = await readFile(file, "utf8");
  const { data, body } = parseFrontmatter(raw);
  return { data, html: markdown(body), raw: body };
}

const contentPath = (L, ...parts) =>
  path.join(ROOT, "content", ...(L.dir ? [L.dir] : []), ...parts);

async function loadOptional(L, name) {
  const localised = contentPath(L, name);
  if (existsSync(localised)) return loadMarkdownFile(localised);
  const fallback = path.join(ROOT, "content", name);
  if (existsSync(fallback)) return loadMarkdownFile(fallback);
  return { data: {}, html: "", raw: "" };
}

async function loadCollection(L, name) {
  const german = path.join(ROOT, "content", name);
  if (!existsSync(german)) return [];

  const files = (await readdir(german)).filter((f) => f.endsWith(".md"));
  const projects = [];

  for (const file of files) {
    const localised = contentPath(L, name, file);
    const translated = existsSync(localised);
    const doc = await loadMarkdownFile(translated ? localised : path.join(german, file));

    if (doc.data.draft === true) continue;
    if (!doc.data.title) {
      console.warn(`  ! ${file} hat kein "title" im Frontmatter, wird übersprungen.`);
      continue;
    }

    projects.push({
      ...doc,
      file,
      translated,
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

const loadProjects = (L) => loadCollection(L, "projects");
const loadArtworks = (L) => loadCollection(L, "artworks");

/* ------------------------------------------------------------------ *
 * Build
 * ------------------------------------------------------------------ */

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

const toFile = (url) => path.join(...url.split("/").filter(Boolean), "index.html");

async function build() {
  const config = JSON.parse(await readFile(path.join(ROOT, "site.config.json"), "utf8"));
  const base = config.site?.url ? config.site.url.replace(/\/$/, "") : "";
  const abs = (p) => (base ? base + p : "");

  try {
    await rm(DIST, { recursive: true, force: true });
  } catch {
    console.warn("  ! dist/ konnte nicht geleert werden, Dateien werden überschrieben.");
  }
  await mkdir(DIST, { recursive: true });

  const urls = [];

  for (const key of Object.keys(LANGS)) {
    const L = LANGS[key];
    const O = LANGS[L.other];
    const r = routes(L);
    const ro = routes(O);
    const t = L.t;

    const [home, about, contact, projects, artworks] = await Promise.all([
      loadOptional(L, "home.md"),
      loadOptional(L, "about.md"),
      loadOptional(L, "kontakt.md"),
      loadProjects(L),
      loadArtworks(L),
    ]);

    await writePage(
      L.dir ? path.join(L.dir, "index.html") : "index.html",
      layout({
        config, L,
        title: "",
        description: pick(config.site?.description, L.code),
        canonical: abs(r.home),
        altUrl: ro.home,
        bodyClass: "page-home",
        current: r.home,
        content: homePage({ config, L, home, projects }),
      })
    );
    urls.push(r.home);

    await writePage(
      toFile(r.projects),
      layout({
        config, L,
        title: t.projectsTitle,
        description: pick(config.projectsIntro, L.code) || t.projectsLead,
        canonical: abs(r.projects),
        altUrl: ro.projects,
        bodyClass: "page-projects",
        current: r.projects,
        content: projectsIndexPage({ L, projects, intro: pick(config.projectsIntro, L.code) }),
      })
    );
    urls.push(r.projects);

    for (const project of projects) {
      await writePage(
        toFile(r.project(project.slug)),
        layout({
          config, L,
          title: project.data.title,
          description: project.data.summary,
          canonical: abs(r.project(project.slug)),
          altUrl: ro.project(project.slug),
          bodyClass: "page-project",
          current: r.projects,
          content: projectPage({ project, L }),
        })
      );
      urls.push(r.project(project.slug));
    }

    await writePage(
      toFile(r.artworks),
      layout({
        config, L,
        title: t.artworksTitle,
        description: pick(config.artworksIntro, L.code) || t.artworksLead,
        canonical: abs(r.artworks),
        altUrl: ro.artworks,
        bodyClass: "page-artworks",
        current: r.artworks,
        content: artworksPage({ config, L, artworks }),
      })
    );
    urls.push(r.artworks);

    await writePage(
      toFile(r.about),
      layout({
        config, L,
        title: about.data.headline || t.aboutTitle,
        description: about.data.lead || "",
        canonical: abs(r.about),
        altUrl: ro.about,
        bodyClass: "page-about",
        current: r.about,
        content: aboutPage({ config, L, about }),
      })
    );
    urls.push(r.about);

    await writePage(
      toFile(r.contact),
      layout({
        config, L,
        title: t.contactTitle,
        description: contact.data.lead || "",
        canonical: abs(r.contact),
        altUrl: ro.contact,
        bodyClass: "page-contact",
        current: r.contact,
        content: contactPage({ config, L, contact }),
      })
    );
    urls.push(r.contact);

    await writePage(
      toFile(r.imprint),
      layout({
        config, L,
        title: t.imprint,
        description: t.imprint,
        canonical: abs(r.imprint),
        altUrl: ro.imprint,
        bodyClass: "page-legal",
        content: imprintPage({ config, L }),
      })
    );
    urls.push(r.imprint);

    const missing = projects.filter((p) => !p.translated).length;
    if (L.dir && missing) {
      console.warn(`  ! ${missing} Projekt(e) ohne englische Fassung, dort greift der deutsche Text.`);
    }
  }

  const D = LANGS.de;
  await writePage(
    "404.html",
    layout({
      config, L: D,
      title: D.t.notFoundTitle,
      description: D.t.notFoundText,
      altUrl: routes(LANGS.en).home,
      bodyClass: "page-legal",
      content: `<section class="wrap section prose narrow"><h1>404</h1><p>${escapeHtml(
        D.t.notFoundText
      )} <a href="/">${escapeHtml(D.t.backHome)}</a>.</p></section>`,
    })
  );

  if (existsSync(path.join(ROOT, "assets"))) {
    await copyDir(path.join(ROOT, "assets"), path.join(DIST, "assets"));
  }

  if (base) {
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
    await writeFile(path.join(DIST, "CNAME"), `${new URL(base).hostname}\n`, "utf8");
  }

  console.log(`✓ Build fertig: ${urls.length} Seiten, Deutsch und Englisch`);
  if (config.site?.noindex) console.log(`  ! noindex ist aktiv, Suchmaschinen bleiben ausgesperrt.`);
}

build().catch((err) => {
  console.error("✗ Build fehlgeschlagen:", err);
  process.exit(1);
});
