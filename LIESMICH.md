# Brumdrumherum – Version 1.0 (Sprint 1)

- `index.html` = die echte App (ohne Story, mit echten Daten).
- `demo.html` = die Demo-Story mit Max (für Pitch, Showroom und Coaching).
- `beta.html` leitet auf die Hauptseite weiter.
Details in `CHANGELOG.md`, Push-Vorbereitung in `PUSH-BACKEND.md`.

## Update hochladen
Im Repository «Add file» → «Upload files» und diese Dateien hineinziehen:
`index.html`, `demo.html`, `sw.js`, `tba-be.json`, `CHANGELOG.md`, `LIESMICH.md`. Dann «Commit changes».
`config.js` mit dem Mapbox-Token bleibt unverändert.

## Baustellen Kanton Bern aktualisieren
`tba-be.json` liegt im Repository und wird mit der App ausgeliefert. Neu erzeugen: `node scripts/tba-be.mjs <neues.geojson> tba-be.json`, danach hochladen.

## Auf dem Handy prüfen
App ganz schliessen und zweimal neu öffnen. Es erscheint direkt «Meine Strecken» mit den Beispielstrecken, neue Strecke über «Neue Strecke».
Demo-Story: https://brumdrumherum.github.io/demo.html
