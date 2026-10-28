# Portfolio: Hinweise für Claude

Bewerbungsportfolio von Finn Willmann, Spieleentwicklung mit Unity, C# und
Blender. Zielgruppe sind Studios und Praktikumsgeber. Live auf
finnwillmann.com. Die Bedienung steht in `README.md`, hier steht nur, was
beim Arbeiten am Code sonst schiefgeht.

## Harte Regeln

- **Kein `npm install`.** Der Proxy antwortet mit 403, in der Cloud wie
  lokal. Also Vanilla CSS und Vanilla JS, kein Framework, keine Bibliothek,
  kein zusätzlicher Buildschritt. Fertige Komponenten aus Bibliotheken sind
  Vorbild, nie Import.
- **`dist/` niemals bearbeiten.** Es ist erzeugt und liegt in `.gitignore`.
- **Keine Gedankenstriche** in Texten, weder auf der Seite noch in Commits.
  Komma, Doppelpunkt oder Klammer stattdessen.
- **Inhalte nicht erfinden.** Aussagen über Projekte stammen aus
  `content/`, nicht aus dem Modell.
- Die Seite ist zweisprachig: `content/` und `content/en/`. Was am Layout
  geändert wird, gilt für beide.

## Wo was liegt

Die HTML-Templates sind **Funktionen in `build.mjs`**, nicht eigene Dateien:
`layout`, `homePage`, `projectsIndexPage`, `projectPage`, `artworksPage`,
`aboutPage`, `contactPage`, `pageHeader`, `ctaSection`, `projectCard`.
Styles in `assets/styles.css`, Verhalten in `assets/site.js`, der
Hero-Shader in `assets/shader.js`.

```bash
node build.mjs     # baut nach dist/
node serve.mjs     # Vorschau auf localhost:4321, baut bei Änderungen neu
```

## Die visuelle Welt heißt Impuls

- Dunkel ist der Grundzustand, hell ist eigenständig komponiert und nicht
  invertiert. Beide Zustände stehen oben in `styles.css` als Rollen in
  OKLCH.
- Display ist **Anybody** mit Breitenachse, Fließtext ist **Onest**, beide
  selbst gehostet.
- Spacing auf einer 4er-Basis (`--s1` bis `--s7`), Easing als `--ease` und
  `--ease-out`.
- Der eine gesetzte Moment: der Hero bleibt stehen, das Blatt schiebt sich
  darüber, der Name zieht sich dabei zusammen. Gesteuert über `--p` von 0
  bis 1 aus `site.js`. Ohne Skript steht `--p` auf 0 und die Seite ist
  vollständig da.
- Die scheinbar leeren Divs im Hero sind keine Überbleibsel: `buehne-grund`,
  `buehne-deckel`, `buehne-mitte`, `neon-schein`, `neon-saum` und
  `neon-balken` malen jeweils eine eigene Ebene mit eigenem Blendmodus.
  Zusammenlegen ändert das Licht.

## Glas

Seit Oktober 2026 tragen Kopfzeile, Knöpfe, Schlagworte, Menü, die runden
Schalter und die Lightbox-Steuerung Glas. Der Block steht am Ende von
`styles.css`.

- Glas hat **zwei Lagen**: `--glas-grund` aus der Hintergrundfarbe trägt den
  Kontrast, `--glas-tint` darüber macht das Material. Nur der Schimmer
  allein stellt den Text der Kopfzeile aufs Neonlicht, gemessen 3.2:1.
- Die Lichtkante liegt als Ring im Rahmen, über zwei Masken voneinander
  abgezogen, damit sie jedem Radius folgt.
- **Keine Brechung über SVG-Filter.** Gemessen Bild für Bild lag der
  Unterschied mit und ohne bei 0.11 von 255, gekostet hat sie etwa das
  Dreifache. Sie zeigt nur etwas, wo hinter dem Glas eine Struktur liegt,
  und hinter Kopfzeile und Knöpfen liegt ein weicher Verlauf.
- `position` in Sammelregeln ist eine Falle: die Kopfzeile ist `sticky`,
  das Menü und die Lightbox-Knöpfe sind `fixed` oder `absolute`. Zweimal
  überschrieben, zweimal Panel aus dem Bild geschoben.

## Prüfen vor dem Commit

Nicht nur den Code lesen, die gebaute Seite ansehen: Startseite,
Projektübersicht, eine Projektseite und Artworks, jeweils hell und dunkel,
breit und schmal. Kontrast gegen 4.5:1 für Fließtext und 3:1 für große
Schrift und Bedienelemente messen, und zwar am gerenderten Pixel neben dem
Text, nicht auf dem Buchstaben. Tastaturfokus, `prefers-reduced-motion` und
Touch einmal durchgehen.

## Veröffentlichen

`git push` auf `main`, danach baut die Action etwa zwei Minuten
(`.github/workflows/deploy.yml`), dann ist es live. Pushen muss Finn selbst:
in der Linux-VM, über die Claude auf den Ordner zugreift, liegen keine
GitHub-Zugangsdaten.

Der Ordner liegt in OneDrive und ist nur eingeschränkt beschreibbar. Git
braucht dort die Erlaubnis, eigene Sperrdateien zu löschen, sonst bleiben
nach einem Commit `.lock`-Dateien liegen und spätere Befehle scheitern an
"File exists".

## Offen

- Impressum in `site.config.json` ist unvollständig, Anschrift fehlt.
  Pflicht nach § 5 DDG.
- Die Autoren-Mail in der Git-Historie ist `deine@mail.de`, ein Platzhalter.
  Commits zählen so nicht auf Finns GitHub-Konto.
- Nebendomains finnwillmann.de, .global und fwillmann.com leiten noch nicht
  weiter.
