# Design (Entwurf aus M0b, Korrekturen folgen als Liste)

## Grundsatz
Verspielt, rundlich, satte flache Farben wie die Modelle (MODELS.md).
Keine Emojis, keine Stock-Icons, wenig Text.

## Schrift
- Fredoka (OFL), lokal über `@fontsource/fredoka`, Gewichte 400/600/700
- Titel 700, Buttons 600, Fließtext 400
- Mindestgröße 18 px

## Farben (CSS-Variablen in src/styles.css)
| Name | Wert | Einsatz |
|---|---|---|
| Himmel | #cfe8f7 | Hintergrund |
| Gras | #a9d18e | Boden |
| Rot | #d8362f | Hauptfarbe Lok, Play |
| Gelb | #ffc83d | Akzent, Sterne, aktive Auswahl |
| Dunkel | #2d3038 | Schrift, Räder, Icons |
| Blau | #3b82c4 | Sekundär-Buttons |
| Grün | #2fa84f | "Fahren!" |
| Weiß | #ffffff | Flächen, Icon-Füllung |

## Bedienelemente
- Buttons: mind. 64 x 64 px, Radius 22 px, unten 4 px dunkle Kante als Tiefe
- Haupt-Button (Play, Fahren!): 88 px hoch, volle Breite bis 320 px
- Tippen: Button rutscht 3 px nach unten, kein Hover
- Abstände: Vielfache von 8 px, Sicherheitsrand für iPhone (safe-area)

## Icons
Eigene SVGs in `src/ui/icons.js`, 48 x 48, dicke runde Linien (6 px),
Füllung weiß/gelb: Play, Garage, Stern, Tuten, Sound.

## Splash und Bewegung
- Lok fährt von hinten ein, bremst ab, tutet (sobald Audio frei ist), Titel fällt ein
- Dampf aus Kugeln, wiederverwendet
- Bewegung immer weich (ease-out), nie hektisch
