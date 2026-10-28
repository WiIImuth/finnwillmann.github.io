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
`aboutPage`, `contactPage`, `pageHeader`, `ctaSection`, `arbeitZeile`,
`artworkTile`, `schubfach`. `arbeitZeile` ist eine Arbeit, auf der
Startseite und in der Übersicht dieselbe: Bild links, Text rechts.
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
  bis 1 aus `site.js`, nach einer Bildschirmhöhe ist es 1. Ohne Skript
  steht `--p` auf 0 und die Seite ist vollständig da.
- Die scheinbar leeren Divs im Hero sind keine Überbleibsel: `buehne-grund`,
  `buehne-deckel`, `buehne-mitte`, `neon-schein`, `neon-saum` und
  `neon-balken` malen jeweils eine eigene Ebene mit eigenem Blendmodus.
  Zusammenlegen ändert das Licht. `buehne-deckel` ist seit dem Redesign
  ausgeblendet.
- Hinter dem Hero laufen nur noch die Wellen (`nurWellen: true`). Die
  fallenden Lichtstriche (Lightfall) sind auf Finns Wunsch raus, der
  GLSL-Code liegt noch in `shader.js`.

## Klar: Liquid Glass auf der Bedienung

Seit dem Redesign Ende Oktober 2026 gilt die Lesart "Klar": Glas nur auf
dem, was man anfasst, so wie Apple es selbst einsetzt. Der Block steht am
Ende von `styles.css`, der ältere Glasblock direkt davor liefert die
Zutaten.

- **Jede Seite hat dieselbe Ordnung**: der Kopf steht im Licht, darüber
  liegt deckend `.blatt` mit runden oberen Ecken. Auf der Startseite ist
  das `.stage-inhalt.blatt`, auf den Unterseiten wickeln die Templates
  alles nach dem Seitenkopf in `<div class="blatt">`, den Aufruf am Ende
  eingeschlossen.
- Glas tragen die Kopfzeilen-Kapsel (`.header-inner`), Knöpfe (`.btn`),
  die Linkgruppe im Hero (`.gruppe`), das Menü und die Lightbox. Inhalte
  nie. Glas im Glas gibt es nicht: die Schalter in der Kapsel sind
  durchsichtig.
- **Ecken kennen zwei Arten.** Bedienbares ist eine Kapsel (`999px`).
  Flächen und Bilder haben `--r-flaeche`, was darin liegt
  `--r-flaeche` minus den Abstand. Neue Radien nicht frei wählen.
- **Keine Schlagworte.** Technik steht nur noch als Zeile "Stack" auf der
  Projektseite und als Satz unter "Über mich".
- Glas hat **zwei Lagen**: `--glas-grund` aus der Hintergrundfarbe trägt den
  Kontrast, `--glas-tint` darüber macht das Material.
- In der Kapsel steht alles in voller Textfarbe. Gedämpfter Text fiel auf
  dem Glas über einem hellen Projektbild auf 3.0:1, voller steht bei
  5.7:1 und mehr.
- Die Lichtkante liegt als Ring im Rahmen, über zwei Masken voneinander
  abgezogen, damit sie jedem Radius folgt.
- **Keine Brechung über SVG-Filter.** Gemessen Bild für Bild lag der
  Unterschied mit und ohne bei 0.11 von 255, gekostet hat sie etwa das
  Dreifache.
- `position` in Sammelregeln ist eine Falle: die Kopfzeile ist jetzt
  `fixed` und liegt über der Seite, das Menü und die Lightbox-Knöpfe sind
  `fixed` oder `absolute`. Wo kein Licht hinter dem Kopf steht, braucht der
  Inhalt oben `--kopf-h` Platz.

## Prüfen vor dem Commit

Nicht nur den Code lesen, die gebaute Seite ansehen: Startseite,
Projektübersicht, eine Projektseite und Artworks, jeweils hell und dunkel,
breit und schmal. Kontrast gegen 4.5:1 für Fließtext und 3:1 für große
Schrift und Bedienelemente messen, und zwar am gerenderten Pixel neben dem
Text, nicht auf dem Buchstaben. Tastaturfokus, `prefers-reduced-motion` und
Touch einmal durchgehen.

## Veröffentlichen

`git push` auf `main`, danach baut die Action (`.github/workflows/deploy.yml`),
meist in unter einer Minute, dann ist es live. Unter Windows geht der Push
direkt. In der Linux-VM, über die Claude sonst auf den Ordner zugreift,
liegen keine GitHub-Zugangsdaten, dort muss Finn selbst pushen. GitHub
Pages lässt den Browser Seiten zehn Minuten zwischenspeichern: wer danach
die alte Fassung sieht, lädt mit Strg+F5 neu.

Der Ordner liegt in OneDrive und ist nur eingeschränkt beschreibbar. Git
braucht dort die Erlaubnis, eigene Sperrdateien zu löschen, sonst bleiben
nach einem Commit `.lock`-Dateien liegen und spätere Befehle scheitern an
"File exists".

## Offen

- Weitere Arbeiten von itch.io sollen dazukommen. Shardcore ist seit dem
  28.10.2026 drin, Quelle waren `itch/` und `Docs/` im Shardcore-Projekt.
  Text und Bilder von Finn oder seiner itch.io-Seite, nicht erfunden. Eine
  neue Datei in `content/projects/` und `content/en/projects/` genügt,
  `arbeitZeile` stellt sie dar. Die Ziffer vor dem Dateinamen folgt `order`.
- Die Autoren-Mail in der Git-Historie ist `deine@mail.de`, ein Platzhalter.
  Commits zählen so nicht auf Finns GitHub-Konto.
- Nebendomains finnwillmann.de, .global und fwillmann.com leiten noch nicht
  weiter.
