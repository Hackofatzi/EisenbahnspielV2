# Plan

Jeder Meilenstein endet mit Browser-Test und Git-Commit.
Status hier pflegen: offen / erledigt.

- M0 (erledigt, wartet auf Korrekturliste): Zug-Look. Designsprache, Dampflok, Kohlewagen, Personenwagen,
  /gallery.html mit Polygonzähler. Danach Korrekturliste von mir.
- M0b (erledigt, wartet auf Korrekturliste): Design. DESIGN.md umsetzen: Schrift, Farben, 5 Kern-Icons
  (Play, Garage, Stern, Tuten, Sound) als SVG, Splash-Animation,
  Beispiel-Screens Start und Garage. Danach Korrekturliste von mir.
- M1 (erledigt, Test auf echtem Handy steht aus): Solo-Fahrt. 4 Spuren, Wisch, Hüpfen, Tuten (Oszillator),
  Sammelobjekte, Hindernisse, Zieleinlauf. Danach Test auf echtem Handy.
- M2 (erledigt, Test auf echtem Handy steht aus): Gegner. 3 KI-Züge, Platzierung, Ergebnis-Screen.
- M3 (offen): Kurven und Weichen. Segmentgenerator, optische Kurven.
- M3b (offen): Umgebung. Dekorationen und Tiere pro Strecken-Thema,
  Reaktion aufs Tuten, Performance-Test auf dem Handy.
- M4 (offen): Garage. Restliche 4 Loks und 2 Wagen, Kupplung, Farben,
  Freischaltung, lokspezifische Tut-Sounds.
- M5 (offen): Feinschliff. Sounds, Themen, App-Icon, manifest.json,
  Deploy-Skript, Test auf echtem iPhone.
  Optional: Modelle in Blender nachbearbeiten (GLB).
- v2: Ebenen/Brücken, optional breiteres Gleisnetz.

## Entscheidungen
- Engine: three.js bestätigt (Vite, JS mit JSDoc, Vitest für logic/).
- Immer 4 Spuren, 3 KI-Züge, Hüpfen in v1.
- Weichen (geändert nach M2): Spurwechsel nur bei/vor Weichen, nicht mehr überall.
  Betrifft M3 (Generator, KI, Wisch-Eingabe, Anzeige der Wechselzonen).
- Züge blockieren sich (M2-Nachbesserung): kein Durchfahren, Spurwechsel nur bei freiem Platz.
- Zielgeräte: iPhones, auch 4 Jahre alt; Hosting HostEurope.
- DESIGN.md fehlt noch; wird in M0b erstellt.
- Struktur: logic/ (ohne three.js), render/, models/, ui/, audio/, input/, tests/.