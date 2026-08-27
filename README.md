# Portfolio

Statische Portfolio-Website. **Keine Abhängigkeiten**, es genügt Node.js
(bei dir installiert: v22). Kein `npm install`, keine Build-Tools.

## Loslegen

```bash
node serve.mjs
```

Öffnet die Vorschau auf <http://localhost:4321>. Änderungen an `content/`,
`assets/` oder `site.config.json` werden automatisch neu gebaut. Im Browser
einfach neu laden.

Für die fertige Seite zum Hochladen:

```bash
node build.mjs      # erzeugt dist/
```

## Ordnerstruktur

```
site.config.json        Name, Rolle, Links, Skills, Impressum
content/
  about.md              Der Text im Abschnitt „Über mich"
  projects/
    01-beispielprojekt.md    eine Datei = ein Projekt
assets/
  styles.css            Alle Farben stehen ganz oben als Variablen
  images/               Screenshots, Cover-Bilder, Lebenslauf-PDF
build.mjs               Build-Skript
serve.mjs               Vorschau-Server
dist/                   Generiert, nicht von Hand bearbeiten
```

## Ein neues Projekt hinzufügen

Neue Datei in `content/projects/` anlegen, z. B. `03-mein-projekt.md`:

```markdown
---
title: Mein Projekt
summary: Ein Satz, der erklärt, was es tut.
year: 2026
tags:
  - TypeScript
  - React
repo: https://github.com/nutzer/repo
demo: https://beispiel.de
order: 3
---

## Das Problem

Fließtext in Markdown.
```

Speichern, fertig. Die Karte auf der Startseite und die Detailseite unter
`/projekte/mein-projekt/` entstehen automatisch.

### Frontmatter-Felder

| Feld | Pflicht | Bedeutung |
| --- | --- | --- |
| `title` | ja | Überschrift und Kartentitel |
| `summary` | empfohlen | Ein Satz auf der Karte und in der Google-Vorschau |
| `slug` | nein | URL-Teil; sonst aus dem Dateinamen abgeleitet |
| `year` | nein | Zeitraum, z. B. `2026` oder `"2025/26"` |
| `role` | nein | Deine Rolle im Projekt |
| `tags` | nein | Kurze Schlagworte für die Karte |
| `stack` | nein | Technologien in der Detail-Infozeile |
| `repo` / `demo` | nein | Buttons „Quellcode" und „Live ansehen" |
| `cover` | nein | Pfad zu einem Bild, z. B. `/assets/images/app.png` |
| `order` | nein | Kleinere Zahl = weiter oben |
| `draft` | nein | `true` blendet das Projekt aus |

Bilder gehören nach `assets/images/` und werden als `/assets/images/datei.png`
verlinkt.

## Veröffentlichen

Der Ordner `dist/` ist die fertige Seite. Sie läuft auf jedem statischen
Hoster:

- **Cloudflare Pages** oder **Netlify**: Repo verbinden, Build-Befehl
  `node build.mjs`, Ausgabeverzeichnis `dist`. Kostenlos, HTTPS inklusive.
- **GitHub Pages**: mit einer kleinen Action, die `node build.mjs` ausführt.
- **Beliebiger Webspace**: `dist/` per FTP hochladen.

Vor dem Veröffentlichen in `site.config.json` setzen:

- `site.url` auf die echte Domain (erzeugt `sitemap.xml` und `robots.txt`)
- `impressum` vollständig ausfüllen, denn für deutsche Seiten ist das
  nach § 5 DDG Pflicht

## Später auf Astro umsteigen?

Möglich und unkompliziert: die Markdown-Dateien in `content/projects/` sind
genau das Format, das Astros Content Collections erwarten. Nur die Templates
müssten übertragen werden.
