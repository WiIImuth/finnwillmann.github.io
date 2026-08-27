---
title: Carry Me Home
slug: carry-me-home
summary: Ein absichtlich schwerer 2D-Platformer. Den Wind zeichnet man selbst mit der Maus und lässt sich daran durchs Level ziehen.
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
cover: /assets/images/carry-me-home-01.jpg
order: 2
draft: false
---

## Das Spiel

Carry Me Home ist ein reduzierter 2D-Platformer, der absichtlich mit 3D-Assets
gebaut ist. Die Welt gewinnt dadurch Plastizität, die Steuerung bleibt schlicht.
Als Vorbild diente das Prinzip eines Rage Games: Fehler werden nicht abgefedert,
sie gehören zur Lernkurve. Frust ist erlaubt, Unfairness nicht. Jede Stelle soll
mit genug Übung sicher zu schaffen sein.

Entstanden ist das Ganze im Modul „Projekt 1: Interdisziplinäres Projekt“
zusammen mit Moritz Lohmann. Bei mir lag die komplette technische Umsetzung in
Unity, bei Moritz die 3D-Assets und das Level-Design.

![Ein Level aus Carry Me Home: schwebende Inseln über Wasser, im Hintergrund eine Burg](/assets/images/carry-me-home-02.jpg)

## Wind, den man selbst malt

Es gibt keine festen Windzonen. Stattdessen zeichnet man den Wind. Ein
Mausstrich wird auf eine Ebene in der Szene projiziert, daraus entsteht ein Pfad
mit gleichmäßig verteilten, unsichtbaren Knoten. Alles, was mit seinem
Trigger-Bereich in diese Knoten gerät, die Spielfigur ebenso wie bewegliche
Objekte, wird an ihnen entlanggezogen. Wie an einer Kette aus Magneten.

Damit daraus eine Aufgabe wird und kein Freifahrtschein, hängt am Zeichnen ein
**Energie-Budget**. Jeder gezeichnete Meter kostet, die Energie füllt sich über
die Zeit wieder auf. Wie lang die Linie ausfällt, ist dadurch eine Entscheidung
mitten im Sprung.

Sämtliche Stellschrauben liegen in einem ScriptableObject statt im Code:
Knotenabstand, Zugkraft, Höchstgeschwindigkeit, wie viel Schwung erhalten
bleibt, wie lange eine Linie lebt. Balancing passiert damit im Editor, nicht im
Compiler, und mehrere Presets für unterschiedliche Level kosten keine einzige
Codezeile.

![Weiterer Levelabschnitt mit Hängebrücke und Häuschen](/assets/images/carry-me-home-03.jpg)

## Wo es hakte

Die Idee lässt sich in einem Satz erzählen. Die Schwierigkeit steckt in den
Details: Trigger-Setups, Rigidbody-Verhalten, Reihenfolge der Knoten, Löschen
von Linien, Erhalt des Schwungs beim Loslassen, und das Verhindern eines
Hin-und-Her zwischen zwei benachbarten Knoten. Fehler in solchen Systemen sind
selten lokal. Sie zeigen sich als Verhalten, nicht als Exception.

Die Mechanik brauchte mehrere Anläufe. Was geholfen hat: sie früh und immer
wieder im echten Spielgefühl auszuprobieren, statt auf dem Papier zu optimieren.

Dazu kamen Blocker, die mit dem eigenen Code nichts zu tun hatten. Das Projekt
hing beim Initial Asset Database Refresh, Editor-Dateien waren beschädigt.
Sauber auseinanderzuhalten, ob das Problem im Code oder im Projekt-Setup liegt,
war dabei die eigentliche Übung.

## Zwei Dinge, die geblieben sind

**Physik-Mechaniken laufen über Zustände, nicht über Werte.** Entscheidend war
nie, wie stark der Zug wirkt, sondern wann er einsetzt, wann er endet und was
danach mit dem Schwung geschieht. Klare Regeln dafür haben mehr gebracht als
jedes Nachjustieren an Zahlen.

Und: Wenn Editor oder Projekt-Cache kaputt sind, hilft weiteres Code-Tuning
nicht. Solche Ursachen früh auszuschließen, spart Stunden.
