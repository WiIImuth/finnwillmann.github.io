---
title: Shardcore
slug: shardcore
summary: Ein Bohrschiff zerlegt Low-Poly-Planeten Block für Block bis zum Kern. Eine 3D-Adaption von To The Core mit eigenem Skill-Baum und dreizehn Welten.
year: 2026
date: 2026-10
role: Einzelarbeit
stack:
  - Unity 6
  - C#
  - URP
  - Input System
  - butler
repo: ""
demo: https://willmuth.itch.io/shardcore-demo
demoLabel: Demo auf itch.io
thumb: /assets/images/shardcore-cover.jpg
cover: /assets/images/shardcore-titel.jpg
gallery:
  - /assets/images/shardcore-01.jpg
  - /assets/images/shardcore-02.jpg
  - /assets/images/shardcore-03.jpg
  - /assets/images/shardcore-04.jpg
  - /assets/images/shardcore-05.jpg
  - /assets/images/shardcore-06.jpg
draft: false
---

## Worum es geht

Mit einem Bohrschiff fliegt man in einen Low-Poly-Planeten, zerlegt ihn Block
für Block und bringt das Erz nach Hause. Das Erz fließt in einen großen
Skill-Baum, dann geht es wieder los, jedes Mal ein Stück tiefer. Wer den Kern
knackt, nimmt Kurs auf die nächste Welt.

Dreizehn Welten liegen im Sonnensystem: ein rostiger Felsbrocken, Dschungel und
Eiswelten, eine brodelnde Sonne, ein zersprungener Stern und am Ende ein
Schwarzes Loch. Jeder Planet ist aus tausenden Blöcken gebaut, Schicht für
Schicht bis zum Kern. Ein geknackter Kern lässt seine Welt härter und
ertragreicher zurückkommen.

## Von To The Core zu Shardcore

Ausgangspunkt war **To The Core**, ein 2D-Incremental-Spiel von SomethingExtra
aus dem Jahr 2023. Shardcore überträgt dessen Prinzip in die dritte Dimension:
Der Planet besteht aus vielen kleinen Zellen, die einzeln zerbrechen.

Bevor etwas Eigenes entstehen konnte, musste klar sein, was das Original
eigentlich tut. Daraus wurde eine Faktensammlung aus dem Fan-Wiki, Steam-Guides
und rund 160 Diskussionsthreads. Jede Zahl darin trägt eine Markierung: am
Screenshot bestätigt, aus einer Quelle übernommen, aus einer Formel
hochgerechnet oder nur vermutet.

Danach bekam das Spiel eine eigene Identität: einen eigenen Titel, eigene Namen
für Planeten, Ausrüstung und Waffen und einen eigenen Skill-Baum mit eigenen
Werten. Aus „Home“ wurde Rustbell, aus „Blackhole“ The Maw.

## Ein Baum, der das Ziel zeigt

Der Skill-Baum ist rund. Der Kern sitzt in der Mitte, sechs Äste wachsen als
Sektoren nach außen, und jeder Ring ist eine Tiefe. So zeigt schon das Bild,
worum es im Spiel geht: **zum Kern.**

Die Äste sind nach Aufgabe getrennt und nicht nach dem Rohstoff, mit dem man
bezahlt: Bohrkopf, Rumpf, Reaktor, Ausbeute, Arsenal und Werkstatt, zusammen
über 150 Knoten. Fünf Langzeit-Knoten mit je 100 Stufen sorgen dafür, dass sich
Farmen auf jedem Planeten weiter lohnt.

Der Baum steht als Tabelle im Projekt. Ein Generator baut daraus die
Spieldaten, und das runde Layout rechnet sich selbst aus. Ein neuer Knoten
braucht keine Koordinaten.

## Balance aus einem Bericht

Ein Menüpunkt im Editor schreibt einen Balance-Bericht. Für jeden Planeten
steht darin, was ein Treffer anrichtet und kostet, wenn alle Knoten bis dorthin
bezahlbar, halb oder ganz ausgebaut sind.

Der Vergleich mit dem übernommenen Baum hat drei Formeln verändert:

- Der Krit-Faktor wurde vorher nur angezeigt. Jetzt wirkt er.
- Die Elektrizität wuchs mit der Ladung teils über das Tausendfache. Jetzt gibt
  sie feste Prozent, solange Ladung da ist.
- Gesammelte Kerne addierten ihren Schaden flach und wirkten kaum. Jetzt wirken
  sie als Faktor.

Die Rechnung vor dem Umbau zeigte den Unterschied am deutlichsten beim
Vollausbau. Im alten Baum war ein voll ausgebautes Schiff 100- bis 2.000-mal
stärker als ein bezahlbares, im neuen höchstens 12-mal. Farmen lohnt sich
weiterhin, aber man überspringt damit keine ganzen Planeten mehr.

## Spielbar für mehr Menschen

Unter Barrierefreiheit gibt es Farbfilter für Protanopie, Deuteranopie und
Tritanopie, Schrift in drei Größen, einen hohen Kontrast, Einblendungen für
wichtige Geräusche mit Richtungspfeil, weniger Lichtblitze, eine ruhige Kamera
ohne Wackeln und ein Spieltempo zwischen 50 und 100 Prozent.

Alle Menüs lassen sich ohne Maus bedienen, mit Tastatur oder Gamepad. Gängige
Controller funktionieren auch, wenn man sie mitten im Spiel ein- oder aussteckt,
und die Tastenhinweise zeigen dann den passenden Knopf. Das Spiel gibt es auf
Deutsch und Englisch.

## Wie es entstanden ist

Code und Texte von Shardcore sind mit der KI Claude entstanden, die Musik mit
Suno. So steht es auch auf der itch.io-Seite.

Gebaut und veröffentlicht wird direkt aus Unity: Ein Menüpunkt baut Demo oder
Vollversion mit der nächsten Versionsnummer, lädt per butler nur die Änderungen
auf itch.io und markiert den Stand in Git.

Die kostenlose Demo enthält die ersten beiden Welten.
