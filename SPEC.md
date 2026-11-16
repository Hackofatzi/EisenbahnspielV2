# Brick Train Racer (Arbeitstitel)

Zielgruppe: Kinder 6 - 9 Jahre, allein oder mit Eltern. Sprache: Deutsch.

## Kernidee
Kind baut aus Loks und Wagen einen Zug und fährt Rennen. Steuerung per Wisch,
Spurwechsel über Weichen wie bei Subway Surfers.

## Screens
1. Start: animierter Splash (Lok fährt ein, tutet, Titel), Play-Button,
   Garage, Sound-Schalter
2. Garage: Lok und bis zu 5 Wagen wählen, Farbe wählen, "Fahren!"
   (Lok antippen = tuten)
3. Rennen: Ansicht von hinten, 4 Spuren
4. Ergebnis: Platz 1–3 mit Sternen, "Nochmal", "Garage"

## Steuerung
- Wisch links/rechts: Nachbarspur wählen
- Wisch nach oben: Hüpfen über niedrige Hindernisse (in v1)
- Tuten-Knopf unten rechts (min. 72 px): reiner Spaß, Lok-Sound
- Ebenenwechsel: automatisch, keine Eingabe

## Spuren und Gegner
- Logik: immer 4 Spuren
- Solo-Modus: allein auf der Strecke, Sammelobjekte und Zeit
- Rennmodus: Spieler + 3 KI-Züge
- Hindernisse bremsen nur kurz, kein Fehlschlag
- Wagen folgen der Lok leicht verzögert in der Spur; Hitbox nur an der Lok (Entwurf, in M1 prüfen)
- Später optional: breiteres Gleisnetz mit 5–6 Gleisen

## Strecke
- Aus Segmenten: Gerade, Kurve links/rechts, Weiche links/rechts
- Zwei Kurven ergeben eine engere Kurve
- Kurven nur optisch (Kamera), Logik bleibt 4-Spur-Raster
- Weichen: rein optisch, ohne Zwang; sichtbare Animation und Sound beim Überfahren
- Generator: immer mind. 1 freie Spur, keine 2 Weichen direkt hintereinander
- Länge 60–90 s, Zieleinlauf

## Ebenen (erst v2)
- Jede Spur hat pro Segment eine Höhe (Boden oder Brücke)
- Zug übernimmt die Höhe seiner Spur automatisch
- Brücke mit Rampe hoch und runter, Rampe früh sichtbar
- Auf Brücken kein Spurwechsel, Weichen nur am Boden
- Kollision nur zwischen Objekten auf gleicher Höhe
- Brücke bietet Bonus, Boden mehr Gegnerkontakt

## Tuten
- Web Audio API, lokspezifischer Sound
- Neuer Druck startet Ton neu, Sperre 0,3 s
- Audio wird beim ersten Tipp auf "Play" freigeschaltet (iOS)
- M1: einfacher Oszillator-Ton als Platzhalter

## Progression
- Sterne pro Rennen schalten Loks, Wagen, Farben und 3 Strecken-Themen frei
- Mehr Wagen = mehr Sterne, aber etwas langsamer
- Sterne gibt es auch im Solo-Modus (nach Sammelobjekten und Zeit); genaue Regel und Preise pro Freischaltung noch offen
- Start frei: Dampflok, Kohlewagen, Personenwagen, Containerwagen (Vorschlag)

## Look & Feel
- Verspielter 3D-Look aus Grundformen, siehe MODELS.md und DESIGN.md
- Eigene Designs, keine Nachbildung bestehender Apps
- Sound-Feedback (Tuten, Stern, Spurwechsel, Weiche, Hindernis, Ziel, UI),
  optional Sprecher-Hinweise
- Zwischenanimationen: Lok in die Garage, Wagen rasten ein, Sterne fliegen
  ins Konto, Zieleinlauf mit Konfetti aus Grundformen

## Lebendige Umgebung
- Die Map darf nie leer oder statisch wirken: überall kleine Bewegung und
  Leben am Streckenrand und im Hintergrund (z. B. Vögel, Tiere, Wolken,
  Wind in Bäumen, Rauch aus Schornsteinen)
- Claude schlägt passende Elemente pro Strecken-Thema vor; ich wähle aus
- Elemente sind zufällig verteilt und variieren pro Fahrt
- Rein dekorativ: keine Kollision, kein Einfluss auf die Spiellogik,
  kein Ablenken von Spuren und Hindernissen
- Gleicher Stil wie Zug und UI: Grundformen, rundlich, verspielt
- Performance zuerst: wenige, günstige Objekte, wiederverwendet (Pooling),
  im Rennen nur "low"-Detail
- Kleine Reaktionen sind erwünscht (Vögel flattern auf, wenn der Zug tutet)

## App-Icon und Start
- App-Icon: Dampflok-Front als eigenes SVG, ohne Text, quadratisch
- manifest.json und apple-touch-icon für den Homescreen
- Splash als Animation in der Seite (kein Gerätegrößen-Splash in v1)

## Ziel und Hosting
- Primär iPhones, auch 4 Jahre alte Geräte (Performance-Budget danach)
- Hosting beim eigenen Hoster (HostEurope), Deploy per ./deploy.sh

## Nicht in v1
Online-Multiplayer, Shop, In-App-Käufe, Werbung, Konten, Tracking, Ebenen.

## Offene Fragen
- Sterne-Regel (Solo und Rennen) und Preise der Freischaltungen
- Offline/PWA mit Service Worker?
- Deploy-Weg bei HostEurope (FTP/SFTP/SSH)