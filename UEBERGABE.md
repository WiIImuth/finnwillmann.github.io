# Übergabe: Portfolio finnwillmann.com

Stand: 27. August 2026. Dieses Dokument fasst alles zusammen, was ein neuer Chat
braucht, um ohne Rückfragen weiterzuarbeiten.

## 1. Worum es geht

Persönliche Portfolio-Website von Finn Willmann, Künstlername **Willmuth**.
Student an der Hochschule Macromedia, Spieleentwicklung in Unity. Die Seite
dient der Jobsuche und zeigt Projekte und Artworks. Sie ist zweisprachig,
Deutsch und Englisch.

Live unter **https://finnwillmann.com**, seit dem 27. August 2026 auch für
Suchmaschinen freigegeben.

## 2. Konten und Adressen

| | |
|---|---|
| Domain (Haupt) | finnwillmann.com, verwaltet bei IONOS |
| Weitere Domains | finnwillmann.de, finnwillmann.store, finnwillmann.global, fwillmann.com (liegen ungenutzt) |
| GitHub | Benutzername **WiIImuth**, geschrieben mit zwei grossen i, nicht mit l |
| Repository | https://github.com/WiIImuth/finnwillmann.github.io |
| E-Mail | mail@finnwillmann.com |
| Instagram | https://www.instagram.com/willlmuth/ (drei l) |
| itch.io | https://willmuth.itch.io |
| Spiel-Builds | Google-Drive-Ordner, verlinkt in den Projektseiten |

## 3. Wo die Dateien liegen

Projektordner auf dem Rechner des Nutzers, als Ordner mit der Sitzung verbunden:

```
C:\Users\finnw\OneDrive\Macro\Claude\Portfolio
```

Im Linux-Shell-Zugriff (`device_bash`) erreichbar unter `$HOME/mnt/Portfolio`.

## 4. Technischer Aufbau

**Eigener Generator ohne Abhängigkeiten.** `build.mjs` ist ein einzelnes
Node-Skript (Node 22, keine npm-Pakete) mit eigenem Markdown-Parser, eigenem
Frontmatter-Parser und eigener Bildmass-Erkennung. Grund: npm ist in beiden
Umgebungen durch einen Proxy blockiert (403). **Niemals eine Lösung
vorschlagen, die `npm install` braucht**, solange das so ist. Astro, React,
Tailwind und Ähnliches fallen damit aus.

```
build.mjs            der gesamte Generator, rund 950 Zeilen
site.config.json     Name, Künstlername, Links, Skills, Impressum, Instagram
content/             deutsche Texte als Markdown
content/en/          englische Fassungen, fehlt eine Datei greift die deutsche
assets/styles.css    Designsystem, rund 1300 Zeilen
assets/site.js       Ankersprung, Theme, Reveal, Lightbox, Parallax
assets/images/       alle Bilder und ein Video
dist/                Ergebnis des Builds, steht in .gitignore
.github/workflows/deploy.yml
```

**Seiten je Sprache:** Start, Projekte (Übersicht und Detail), Artworks, Über
mich, Kontakt, Impressum, Datenschutz. Deutsch unter `/`, Englisch unter
`/en/`, mit eigenen Pfadsegmenten (`/projekte/` gegen `/en/projects/`). Die
Zuordnung steht in `LANGS[...].seg`, die Pfade baut `routes(L)`, die
Übersetzungen liegen in `LANGS[...].t`.

**Vorhandene Funktionen:**

- Hell- und Dunkelmodus mit Schalter, Zustand in `localStorage`, ein Skript im
  head setzt das Theme vor dem ersten Zeichnen
- Sprachumschaltung, jede Seite kennt ihr Gegenstück
- Reveal beim Scrollen über `IntersectionObserver` und `data-anim="rise"|"zoom"`
- Lightbox mit FLIP-Animation, Zoom, Pan, Pinch, Tastatur und Wischgesten
- Ankersprung: Kacheln auf der Startseite springen direkt zur jeweiligen Arbeit
- Cache-Busting über `?v=<sha1>` an CSS und JS
- Bildmasse werden aus JPEG- und PNG-Headern gelesen und ins HTML geschrieben,
  damit das Layout beim Nachladen nicht springt
- Strukturierte Daten (JSON-LD, Person mit `alternateName` Willmuth und
  `sameAs` auf Instagram und itch.io)
- Open Graph mit Vorschaubild, Projektseiten nutzen ihr eigenes Titelbild

**Deploy:** Push auf `main` startet die Action `Deploy`. Sie baut mit
`node build.mjs` und veröffentlicht `dist` über GitHub Pages. Die DNS-Einträge
bleiben bei IONOS, `www` läuft als CNAME.

## 5. Arbeitsablauf

Änderungen werden im Ordner auf dem Rechner gemacht, dort gebaut, committet und
gepusht:

```
cd "C:\Users\finnw\OneDrive\Macro\Claude\Portfolio"
node build.mjs
git add -A
git commit -m "..."
git push
```

Der Push muss vom Nutzer kommen, die Shell der Sitzung hat keine
GitHub-Anmeldung.

## 6. Feste Regeln des Nutzers

1. **Keine Gedankenstriche.** Weder Geviertstrich noch Halbgeviertstrich, in
   Dateien und in Chatantworten. Diese Regel gilt dauerhaft.
2. itch.io-Links zeigen immer auf `https://willmuth.itch.io`.
3. Kein Lebenslauf auf der Seite, in keiner Form.
4. Der Künstlername Willmuth steht vorn, der bürgerliche Name direkt daneben.
5. Bei GrappleGlory ist ein gekauftes Controller-Paket die technische Basis.
   Der Text sagt das offen und stellt daneben, was er selbst gebaut hat
   (Momentum, Greifhaken, Air-Control, Wallrun). Nicht zu "komplett selbst
   entwickelt" umschreiben, das steht im Widerspruch zu seiner eigenen
   Prüfungsdokumentation.

## 7. Inhalte

**Projekte** (`content/projects/`):

1. GrappleGlory, 2026, Solo, 3D-Plattformer mit Greifhaken, sechs Bilder
2. Carry Me Home, 2D-Plattformer mit Windmechanik, drei Bilder
3. Suitcase Sins, aus einem Siebentage-Jam, fünf Bilder, nur 347 Pixel breit

**Artworks** (`content/artworks/`):

1. Predasaur, 3D-Fahrzeugkonzept aus Blender, vier Bilder und ein Turntable-Video
2. Zeichenstudien, sechs Blätter aus den Gestaltungsgrundlagen

## 8. Stand der Dinge

Erledigt und live:

- Struktur auf mehrere Seiten aufgeteilt
- Alle Texte inhaltlich gefüllt und im Stil des Nutzers geschrieben
- Apple-nahes Design mit fliessenden Übergängen
- Zweisprachigkeit, Theme-Schalter, Lightbox, Ankersprung
- Artworks-Bereich, auch auf der Startseite
- Künstlername Willmuth in Kopfzeile, Startseite, Seitentiteln, Fusszeile,
  Impressum und strukturierten Daten
- Datenschutzerklärung unter `/datenschutz/` und `/en/privacy/`
- Impressum mit vollständiger Anschrift
- `noindex` entfernt, `robots.txt` erlaubt alles, Sitemap wird erzeugt
- Vorschaubild fürs Teilen

## 9. Offene Punkte

- **Google Search Console** ist noch nicht eingerichtet. Property anlegen,
  TXT-Eintrag bei IONOS, Sitemap `sitemap.xml` einreichen, Indexierung für
  Start- und Über-mich-Seite beantragen.
- **Die vier Nebendomains** leiten noch nicht weiter. Bei IONOS als permanente
  Weiterleitung (301) auf finnwillmann.com setzen.
- **Impressumshinweis** enthält noch einen Scherzsatz ("Bitte Sakultendo, melde
  mich nicht bei die Landesmedienanstalten"). Der steht öffentlich auf der
  Seite. Steht in `site.config.json` unter `impressum.note.de`.
- **Zweiter Kontaktweg** nach § 5 DDG fehlt, aktuell nur E-Mail. Telefonnummer
  oder Kontaktformular wäre sauberer.
- **Alternativtexte** für Bilder fehlen, `alt` ist überall leer.
- **Suitcase-Sins-Bilder** sind mit 347 Pixeln zu klein.
- **Spiel-Builds** liegen in einem Google-Drive-Ordner statt auf itch.io.
- **Monsterlings**, ein viertes Projekt auf seinem itch-Profil, fehlt auf der Seite.
- **Instagram-Beiträge**: automatisches Nachladen ist bewusst nicht gebaut
  (bräuchte Facebook-App, Business-Konto und rotierendes Token, und Metas
  Einbettungsskript würde Besucher-IPs an Meta senden). Stattdessen gibt es
  `instagram.posts` in der Konfiguration, aktuell leer.
- **E-Mail-Einrichtung**: Er wollte mail@finnwillmann.com in Apple Mail
  einbinden. Zwei Wege wurden erklärt (IONOS-Postfach über IMAP, oder iCloud+
  mit eigener Domain), umgesetzt ist noch nichts.

## 10. Der nächste grosse Auftrag: Redesign

Wörtlich von ihm:

> Referenzen: https://www.era-residence.com, https://www.shapes.gallery,
> https://reactbits.dev/get-started/index. Ich will als der dynamische
> scrollverlauf der ersten webseite, die Icons aus der Zweiten und aus der
> dritten Webseite, die visuelle gestalltung aus den vorhendenen Elementen
> wahrgenommen werden.

Also: Scrollverlauf wie bei era-residence, Icons wie bei shapes.gallery,
visuelle Gestaltung im Geist der Elemente von reactbits.

**Wichtiger Vorbehalt:** reactbits ist eine React-Bibliothek. Der Generator ist
bewusst ohne Abhängigkeiten gebaut, und npm ist blockiert. Die Effekte müssen
also in eigenem Vanilla-JS und CSS nachgebaut werden, nicht durch Einbinden der
Bibliothek. Das ist machbar, sollte aber vorher klar gesagt werden.

Es existiert eine Skill namens `portfolio-redesign` in der Sitzung, die den
Ablauf vorgibt: erst Diagnose, dann drei visuelle Welten zur Auswahl, dann
Umsetzung.

## 11. Bekannte Stolpersteine

- **npm ist blockiert** (403), in der Cloud und auf dem Rechner. Alles ohne
  Pakete lösen.
- **`dist/` steht in `.gitignore`** und wird bei jedem Build überschrieben.
  Änderungen dort sind sofort weg und erreichen die Seite nie. Deshalb steht
  jetzt ein Warnhinweis am Anfang jeder erzeugten Datei.
- **Löschen im verbundenen Ordner ist gesperrt** (OneDrive und Sandbox).
  `rm` schlägt mit `EPERM` fehl. Der Build fängt das ab und überschreibt
  stattdessen. Wenn Löschrechte gebraucht werden, über die
  Berechtigungsanfrage gehen.
- **Git-Lock-Dateien** bleiben nach abgebrochenen Befehlen liegen. Jeder
  Git-Befehl im Ordner sollte mit `find .git -name "*.lock" -delete` enden.
- **Git-Identität**: seine globale Konfiguration stand auf `deine@mail.de`.
  Commits von der Sitzung aus deshalb mit
  `git -c user.name="Finn Willmann" -c user.email="willmannfinn420@gmail.com"`.
- **JSON verträgt kein Komma hinter dem letzten Listeneintrag.** Genau das hat
  einmal den Deploy abgebrochen. Nach jeder Änderung an `site.config.json` mit
  `node -e "JSON.parse(...)"` prüfen.
- **Browsercache**: nach Änderungen an CSS oder JS im Browser mit Strg und F5
  neu laden. Das Cache-Busting hilft, aber nicht bei allem.
- **Screenshots im Headless-Chromium** werden oft zu früh aufgenommen, Elemente
  mit `animation-delay` fehlen dann. Verlässlicher ist eine Messung über
  `--dump-dom` mit einem kleinen Skript, das Werte in den Seitentitel schreibt.

## 12. Start im neuen Chat

Diese Datei anhängen, den Ordner
`C:\Users\finnw\OneDrive\Macro\Claude\Portfolio` verbinden, und sagen, woran
weitergearbeitet werden soll. Für das Redesign genügt der Hinweis auf
Abschnitt 10.
