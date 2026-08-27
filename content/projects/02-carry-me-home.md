---
title: Carry Me Home
slug: carry-me-home
summary: Ein bewusst schwerer 2D-Platformer, in dem man den Wind selbst mit der Maus zeichnet und sich daran durchs Level ziehen lässt.
year: 2025/26
role: Programmierung und Sound-Design
tags:
  - Unity
  - C#
  - Physik
  - Sound-Design
stack:
  - Unity
  - C#
  - ScriptableObjects
repo: ""
demo: https://drive.google.com/drive/folders/1CQqry5PNj__V8CvP2Zu-ybV9MXhn8mew?usp=drive_link
demoLabel: Build herunterladen
cover: ""
order: 2
draft: false
---

## Worum es geht

Carry Me Home ist ein minimalistischer 2D-Platformer, der bewusst mit 3D-Assets
arbeitet — die Welt wirkt dadurch plastisch, die Steuerung bleibt reduziert.
Das Spiel orientiert sich am Prinzip eines Rage Games: Fehler werden nicht
abgefedert, sondern sind Teil der Lernkurve. Es darf frustrieren, muss aber
fair bleiben. Jede Herausforderung soll mit Übung zuverlässig lösbar sein.

Entstanden im Modul „Projekt 1: Interdisziplinäres Projekt" zusammen mit
Moritz Lohmann. Ich habe die gesamte technische Umsetzung in Unity
verantwortet, Moritz die 3D-Assets und das Level-Design.

## Die Kernmechanik: Wind zeichnen

Statt fester Windzonen zeichnet der Spieler den Wind selbst. Ein Mausstrich
wird auf eine Zeichenebene in der Szene projiziert und daraus ein Pfad
erzeugt, auf dem in gleichmäßigen Abständen unsichtbare Knoten sitzen. Wer mit
seinem Trigger-Bereich in diese Knoten gerät — die Spielfigur ebenso wie
bewegliche Objekte — wird an ihnen entlanggezogen, wie an einer Kette von
Magneten.

Damit daraus ein Spiel wird und kein Freifahrtschein, hat das Zeichnen ein
**Energie-Budget**: Jeder gezeichnete Meter kostet, Energie lädt sich über die
Zeit wieder auf. Wie lang eine Linie werden darf, ist damit eine
Ressourcen-Entscheidung mitten im Sprung.

Sämtliche Tuning-Werte — Knotenabstand, Zugkraft, Höchstgeschwindigkeit,
Momentum-Erhalt, Lebensdauer der Linie — liegen in einem ScriptableObject
statt im Code. Balancing ist damit eine Änderung im Editor, nicht im
Compiler, und verschiedene Presets für verschiedene Level sind ohne Codezeile
möglich.

## Was daran schwierig war

Die Idee klingt simpel. In der Umsetzung steckt die Schwierigkeit in den
Details: Trigger-Setups, Rigidbody-Verhalten, die Reihenfolge der Knoten, das
Löschen von Linien, der Erhalt des Momentums beim Loslassen und das Verhindern
von unerwünschtem Hin-und-Her zwischen zwei Knoten. Fehler in solchen Systemen
sind selten lokal — sie zeigen sich als Verhalten, nicht als Exception.

Die Mechanik hat mehrere Anläufe gebraucht. Geholfen hat, sie früh und
regelmäßig im echten Spielgefühl zu testen statt auf dem Papier zu optimieren.

Dazu kamen technische Blocker, die nichts mit dem eigenen Code zu tun hatten:
Das Projekt hing beim Initial Asset Database Refresh, Editor-Dateien waren
beschädigt. In solchen Momenten sauber zu unterscheiden, ob das Problem im
eigenen Code oder im Projekt-Setup liegt, war die eigentliche Übung.

## Was ich mitgenommen habe

**Physik-Mechaniken funktionieren nicht über Werte, sondern über Zustände.**
Entscheidend war nicht, wie stark der Zug ist, sondern wann er aktiv ist, wann
er endet und was danach mit dem Schwung passiert. Klare Regeln dafür haben
mehr gebracht als jedes Nachjustieren von Zahlen.

Und: Wenn der Editor oder der Projekt-Cache kaputt ist, bringt weiteres
Code-Tuning nichts. Solche Ursachen früh zu prüfen, spart Stunden.
