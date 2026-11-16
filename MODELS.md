# Zug-Look

## Designsprache
- Alles aus geometrischen Grundformen (Zylinder, Kugeln, Kapseln, Kegel,
  Rotationskörper, abgerundete Quader)
- Verspielt: rundlich, kräftige Proportionen, große Räder mit Nabe,
  freundliche Front mit Scheinwerfern
- Flache, satte Farben, 3–5 Farbflächen pro Modell
- Jedes Modell: build<Name>(params) -> THREE.Group, params: color, accentColor,
  scale, detail ("low" im Rennen, "high" in der Garage)
- Silhouette zuerst: bei 80 px Breite erkennbar; Details nur in "high"
- Richtwerte (Claude darf abweichen, wenn es besser aussieht):
  Lok max. ca. 4.000 Dreiecke, Wagen max. ca. 2.000
- Alle Wagen haben dieselbe Kupplungshöhe und -form, damit jede Kombination passt

## Loks (5)
- Dampflok (Maßstab für M0): liegender Kessel mit Ringen und Dom,
  Schornstein mit Trichter, Führerhaus mit überstehendem Dach,
  Schienenräumer als Keil, 2 große + 2 kleine Räder
- Diesellok: kräftiger Kapselkörper, Kühlergrill, Lichtleiste
- Schnellzug: stromlinienförmig, runde Nase, Fensterband
- Rangierlok: kurz und kompakt, hohe Kabine, Warnstreifen
- Güterlok: kantig-rund mit Stromabnehmer, kräftige Drehgestelle

## Wagen (5)
- Kohlewagen: offene Wanne mit Kohlekugeln
- Personenwagen: abgerundet, Fensterreihe, Rundumdach
- Autotransporter: zweistöckiges Gestell mit Mini-Autos
- Containerwagen: Flachwagen mit 2 bunten Containern
- Baumaschinen-Wagen: Tieflader mit Bagger oder Planierraupe

## Umgebung
- Dekorationen (Tiere, Bäume, Häuser, Wolken) im selben Stil wie die Züge,
  aus Grundformen, nur "low"-Detail, Richtwert unter 300 Dreiecke pro Objekt

## Garage
- Start frei: Dampflok, Kohlewagen, Personenwagen, Containerwagen (Vorschlag)
- Rest per Sterne freischalten; max. 5 Wagen, Typen mehrfach erlaubt
- Jede Lok hat einen eigenen Tut-Sound; Loks unterscheiden sich nur optisch

## Qualität
- /gallery.html: alle Modelle drehbar, beide Detailstufen, Polygonzähler
- Korrekturen als gesammelte Liste, nicht einzeln
- Ladungen (Autos, Container, Bagger) sind Varianten derselben Bausteine