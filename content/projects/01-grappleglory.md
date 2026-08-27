---
title: GrappleGlory
slug: grappleglory
summary: First-Person-Platformer, bei dem die Bewegung selbst das Ziel ist. Greifhaken, Wallrun und Slide wollen sauber ineinandergreifen.
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
demo: https://drive.google.com/drive/folders/1CQqry5PNj__V8CvP2Zu-ybV9MXhn8mew?usp=drive_link
demoLabel: Build herunterladen
cover: ""
order: 1
draft: false
---

## Worum es geht

Eine junge Ninja-Eidechse läuft Prüfungs-Parcours an einem Bergtempel-Dojo ab.
Gegner gibt es keine, gekämpft wird nicht. Die ganze Aufgabe besteht darin, die
Strecke schnell und ohne Stocken zu durchqueren.

Ein Satz hat das Projekt zusammengehalten: **Bewegung ist die Belohnung.**
Daran habe ich jede Entscheidung gemessen. Alles, was den Fluss unterstützt,
durfte bleiben. Alles, was ihn ausbremst, ist rausgeflogen oder wurde umgebaut.

Das Setting liefert dabei für jede Mechanik eine Erklärung. Der Greifhaken ist
eine Chamäleon-Zunge, der Wallrun funktioniert über Haftzehen, der Slide ist ein
Rutschen auf dem Schwanz. Ich wollte, dass sich die Fähigkeiten nach Figur
anfühlen und nicht nach Funktionsliste.

## Ein eigenes Movement-System

Bevor ich am Spielgefühl gearbeitet habe, habe ich mir angesehen, wie andere
Spiele Bewegung lösen. Wo entsteht Schwung, wo geht er verloren, wann fühlt
sich Kontrolle in der Luft fair an und wann willkürlich? Aus diesen Referenzen
ist eine Liste von Regeln entstanden, an der ich mein eigenes Bewegungssystem
ausgerichtet habe.

Als technische Basis dient ein schmales Controller-Paket. Alles, was das
Spielgefühl ausmacht, habe ich darauf neu gebaut: das Momentum-System, den
Greifhaken in vier kombinierbaren Varianten, die vorwärts-dominante
Luftsteuerung und das Zusammenspiel aus Wallrun, Landung und Absprung. An
diesen Stellen ist vom Original wenig übrig geblieben. Einige Funktionen
existierten ohnehin nur dem Namen nach: ein Tempo-Regler, der nichts regelte,
ein Steuerungsfeld, das ab einem gewissen Wert wirkungslos blieb.

## Woran ich das Spielgefühl gemessen habe

Beim Testen sind drei Regeln entstanden.

**Das Tempo gehört dem Spieler.** Der Controller setzte mitgebrachten Schwung
gleich an mehreren Stellen auf einen festen Wert zurück, beim Andocken an die
Wand, während des Wallruns und noch einmal beim Absprung. Ich habe das so
umgebaut, dass Wallrun und Landung eingehendes Tempo übernehmen. Erst dadurch
funktioniert die Kette, auf der Level 2 aufbaut: Grapple, Wallrun, Wall-Jump,
Lenken in der Luft, nächste Wand.

**Luftkontrolle, aber ehrlich.** Man kann seine Flugbahn nach einem Sprung
biegen, ohne dabei langsamer zu werden. Der Schwung dreht sich, statt zu
verschwinden. Ein Test zwang mich zur Nachbesserung: Bei voller Luftkontrolle
reichte ein kurzer Tipper zur Seite, um die Figur mit vollem Tempo quer zu
werfen. Seitdem ist die Steuerung vorwärts-dominant.

**Ein Fehler kostet Sekunden, keine Minuten.** Ein danebengegangener
Greifhaken-Schuss löst keinen Cooldown mehr aus. Vorher stand man nach jedem
Fehlversuch drei Sekunden herum. Der Neustart-Knopf sitzt groß in der Mitte des
Pause-Menüs, weil „nochmal, aber besser“ in einem Speedrun die häufigste
Entscheidung überhaupt ist.

## Parcours aus einer Tabelle

Beide Level entstehen nicht von Hand im Editor. Eigene Editor-Werkzeuge bauen
die komplette Geometrie aus einer Koordinatentabelle auf. Die Maße stammen dabei
aus der Physik und nicht aus dem Bauchgefühl: Sprungkraft und Schwerkraft
ergeben einen Scheitelpunkt von etwa 2,55 Metern und eine flache Sprungweite von
rund 8 Metern. Die Lücken im Tutorial liegen bei 5 Metern, also bewusst im
verzeihlichen Bereich.

Damit ist jede Passage mit der zugehörigen Fähigkeit zu schaffen und ohne sie
eben nicht. Eine Änderung wiederum ist ein Wert in der Tabelle plus ein
Menüklick.

## Als die Arbeit weg war

Der schlimmste Moment im Projekt war ein Datenverlust. Aus Level 1
verschwanden mehrfach Planken und Balken, die ich mühsam von Hand verlegt hatte.
Die Analyse ergab: Die Arbeit war nie auf der Festplatte angekommen. Der Stand
im Editor ging verloren, sobald die Szene neu geladen wurde, nachdem jemand die
Datei von außerhalb angefasst hatte.

Meine Antwort darauf war strukturell. Das Projekt liegt seitdem unter Git,
Szenen bearbeite ich ausschließlich in Unity und committe sofort, und riskante
Eingriffe laufen über eigene Werkzeuge. Room Trim ist direkt aus diesem Verlust
entstanden und erledigt die damals verlorene Arbeit heute in ein paar Klicks.

Kurioserweise hat ausgerechnet dieser Tiefpunkt die Werkzeuge des Projekts am
weitesten gebracht.

## Was hängengeblieben ist

Die meiste Zeit habe ich nicht an schweren Problemen verloren, sondern an **zu
früher Sicherheit**. Pink gerenderte Shader habe ich zweimal an der falschen
Stelle repariert, bis die systematische Prüfung die wahre Ursache fand: Dem
Projekt fehlte die zugewiesene Render-Pipeline. Beim verschwundenen Himmel
lief es genauso, auch dort war die erste plausible Erklärung schlicht falsch.

Geholfen hat jedes Mal dasselbe: in die tatsächlichen Daten schauen, und einer
Erklärung erst glauben, wenn sie *alle* Symptome abdeckt statt nur des
auffälligsten. Meine Fehldiagnosen lasse ich markiert in der Dokumentation
stehen. Der Weg zur Lösung lehrt oft mehr als die Lösung.

Und noch etwas ist geblieben: Arbeit, die nur als Szenen-Zustand existiert, ist
verletzlich. Arbeit, die als Code existiert, gehört mir.
