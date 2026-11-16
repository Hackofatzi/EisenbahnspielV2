# Brick Train Racer

Mobile-first Web-Spiel für Kinder (6–9 Jahre), statische Seite im Browser.
Spiel: SPEC.md · Zug-Look: MODELS.md · Design: DESIGN.md · Ablauf/Status: PLAN.md

## Regeln
- Hochformat, Touch-first, keine Hover-Interaktionen
- Statisch hostbar: Build in /dist, kein Server, keine Datenbank
- Buttons mind. 64 px, wenig Text, Texte nur in src/texts.js (Deutsch)
- Kein Tracking, keine Werbung, keine Konten, keine externen Skripte
- Fonts lokal einbinden, keine externen Aufrufe
- Speicherstand nur in localStorage
- Spiellogik (4-Spur-Raster) getrennt von Darstellung
- Kein Game Over: Hindernisse bremsen nur kurz
- Modelle nur im Code aus Grundformen, keine externen 3D-Dateien bis M5
- Design: siehe DESIGN.md. Keine Emojis, keine Stock-Icons
- Icons als eigene SVGs; Sounds eigen (Web Audio) oder CC0, Quelle notieren

## Befehle
- Dev: npm run dev
- Build: npm run build
- Modell-Galerie: /gallery.html
- Deploy: ./deploy.sh (Zugangsdaten in .env, nie committen)

## Definition of Done
- Läuft im Viewport 390x844 ohne Konsolenfehler (Browser-Test, Claude in Chrome
  oder Playwright)
- Wisch- und Tippsteuerung im Browser geprüft
- Git-Commit nach jedem Meilenstein

## Arbeitsweise
- Eine Sitzung pro Meilenstein, Status in PLAN.md pflegen
- Abschlussmeldung max. 5 Zeilen
- Browser-Test mit Screenshots nur am Meilensteinende; Logik mit Unit-Tests
- Korrekturen von mir als gesammelte Liste abarbeiten
- Planung/Logik: Opus; Umsetzung nach Plan: Sonnet; Trivialfixes: kleinstes
  Modell, das reicht. Sag mir, wenn ein Wechsel (/model) sinnvoll wäre.
- Nach zwei gescheiterten Versuchen: im Plan Mode neu analysieren

## Sound-Quellen
(hier eintragen)