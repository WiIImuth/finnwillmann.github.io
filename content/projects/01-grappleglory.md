---
title: GrappleGlory
slug: grappleglory
summary: Ein First-Person-Movement-Platformer, in dem Bewegung selbst die Belohnung ist — Greifhaken, Wallrun und Slide, sauber verkettet.
year: 2026
role: Einzelarbeit
tags:
  - Unity
  - C#
  - Blender
  - Level-Design
stack:
  - Unity 6
  - C#
  - Blender
  - ProBuilder
  - Git
repo: ""
demo: ""
cover: ""
order: 1
draft: false
---

## Die Idee

Eine junge Ninja-Eidechse absolviert Prüfungs-Parcours an einem japanischen
Bergtempel-Dojo. Kein Kampf, keine Gegner — die Herausforderung besteht darin,
die Strecke schnell und ohne Unterbrechung zu durchqueren.

Die Leitidee passt in einen Satz: **Bewegung ist die Belohnung.** An ihr habe
ich jede Entscheidung im Projekt gemessen. Was den Bewegungsfluss stärkt, kam
rein; was ihn bremst, flog raus oder wurde umgebaut.

Das Setting gibt dabei jeder Mechanik eine Geschichte. Der Greifhaken ist die
Chamäleon-Zunge, der Wallrun funktioniert über Haftzehen, der Slide ist das
Schwanz-Gleiten. Fähigkeiten sollten sich nicht wie abstrakte Spielfunktionen
anfühlen, sondern wie Teil einer Figur.

## Auf fremdem Code aufbauen

Als Fundament für die Spielfigur habe ich bewusst ein fertiges Controller-Paket
aus dem Asset Store genutzt statt alles selbst zu schreiben. Ein eigener
Controller dieser Qualität wäre Wochen Arbeit gewesen — Zeit, die ich lieber in
Level-Design und Spielgefühl gesteckt habe.

Umsonst war das nicht. Ich musste fremden Code lesen, erweitern und an einigen
Stellen reparieren. Mehrere Funktionen existierten nur dem Namen nach: ein
Tempo-Regler, der keiner war, ein Steuerungs-Feld, das ab einem bestimmten Wert
nichts mehr veränderte. Meine eigenen rund 25 Scripts liegen deshalb getrennt
vom Paket, damit ein Update meine Arbeit nicht überschreiben kann.

## Drei Leitlinien für das Spielgefühl

Beim Testen haben sich drei Regeln herausgebildet, an denen ich das
Bewegungs-Tuning ausgerichtet habe.

**Tempo gehört dem Spieler.** Der Controller setzte mitgebrachtes Tempo an
mehreren Stellen hart auf einen Fixwert zurück — beim Andocken an die Wand, an
der Wand selbst, beim Absprung. Ich habe das umgebaut, sodass Wallrun und
Landung eingehendes Tempo übernehmen. Erst damit funktioniert die Kette, die
Level 2 trägt: Grapple, Wallrun, Wall-Jump, Luft-Lenkung, nächste Wand.

**Kontrolle in der Luft, aber ehrlich.** Der Spieler kann seine Flugbahn
biegen, ohne Tempo zu verlieren — der Schwung wird gedreht statt gebremst. Ein
Praxistest erzwang eine Verfeinerung: Mit voller Luft-Kontrolle konnte ein
kurzer Seitwärts-Tipper die Figur mit vollem Tempo zur Seite werfen. Die
Steuerung ist deshalb vorwärts-dominant.

**Fehler kosten Sekunden, keine Minuten.** Ein Fehlschuss mit dem Greifhaken
löst keinen Cooldown mehr aus — vorher bedeutete jeder Fehlversuch drei
Sekunden Stillstand. Der Neustart-Knopf sitzt groß und mittig im Pause-Menü,
weil „nochmal, aber besser" in einem Speedrun-Spiel die häufigste Entscheidung
überhaupt ist.

## Level als Code statt als Szene

Beide Parcours entstehen nicht von Hand im Editor, sondern über eigene
Editor-Werkzeuge, die die komplette Geometrie aus einer Koordinatentabelle
aufbauen. Die Maße habe ich dabei nicht nach Gefühl gesetzt, sondern gegen die
tatsächlichen Physik-Werte gerechnet: Aus Sprungkraft und Schwerkraft ergibt
sich ein Sprung-Scheitel von rund 2,55 Metern und eine flache Sprungweite von
etwa 8 Metern — die Lücken im Tutorial bleiben mit 5 Metern bewusst verzeihlich.

So ist jede Passage mit der jeweiligen Fähigkeit machbar und ohne sie eben
nicht. Und eine Änderung ist ein Wert in der Tabelle und ein Menüklick.

## Der Datenverlust

Der einschneidendste Moment des Projekts war ein Datenverlust. Mühsam von Hand
verlegte Planken und Balken verschwanden mehrfach aus Level 1, und die Analyse
ergab, dass die Arbeit nie auf der Festplatte angekommen war — der
Editor-Stand ging verloren, als die Szene neu geladen wurde, nachdem die Datei
außerhalb von Unity verändert worden war.

Die Konsequenzen waren strukturell: Git-Versionierung, Szenen werden nur noch
in Unity bearbeitet und sofort committet, und riskante Szenen-Eingriffe laufen
über eigene Werkzeuge. Das Room-Trim-Werkzeug entstand direkt aus diesem
Verlust und macht die damals verlorene Arbeit heute in wenigen Klicks
wiederholbar.

Paradoxerweise hat dieser Tiefpunkt die Werkzeug-Landschaft des Projekts am
stärksten verbessert.

## Was ich gelernt habe

Meine größten Zeitverluste entstanden nicht durch schwere Probleme, sondern
durch **zu frühe Gewissheit**. Pink gerenderte Shader habe ich zweimal an der
falschen Stelle „behoben", bevor die systematische Prüfung die echte Ursache
fand: Das Projekt lief ohne zugewiesene Render-Pipeline. Beim verschwundenen
Himmel dasselbe Muster — die erste plausible Erklärung war falsch.

Geholfen hat am Ende immer dasselbe Vorgehen: die tatsächlichen Daten
anschauen und eine Erklärung erst glauben, wenn sie *alle* Symptome erklärt und
nicht nur das lauteste. Meine Fehldiagnosen lasse ich in der Dokumentation
markiert stehen. Der Weg zur Lösung ist oft lehrreicher als die Lösung selbst.

Und eine zweite Lehre, die bleibt: Arbeit, die nur als Szenen-Zustand
existiert, ist fragil. Arbeit, die als Code existiert, gehört mir.
