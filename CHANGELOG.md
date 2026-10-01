# Brumdrumherum – Änderungen

Version = Sprint: Version 1.0 = Sprint 1, Version 2.0 = Sprint 2 usw.
Diese Datei beim Weiterarbeiten mit der KI immer mit hochladen.

## Version 1.0 – Sprint 1 (Stand 1.10.2026)

### App
- Installierbare Web-App (PWA) auf GitHub Pages, Dark-Mode-Design «Nachtasphalt und Markierungsgelb».
- Geführte Story von A bis Z mit Persona Max (immer mit Beispieldaten, damit sie gleich abläuft).
- Mapbox: echte Karte, Adresssuche in der ganzen Schweiz, Routen mit Alternativen. Token in `config.js` (wird bei Updates nicht überschrieben).
- Routenvergleich nach Fahrzeit, Baustellen und Umweg. Auslastung entfernt (Entscheid Team: kein Live-Verkehrsfluss).
- Baustellen melden (Community), Punkte und Abzeichen.

### Echte Daten (Region Bern)
- **Stadt Bern (KOER):** Xano-Funktion `import_stadt_bern` holt die Baustellen, filtert abgelaufene, speichert jede nur einmal und übernimmt keine Namen oder Telefonnummern. Abgleich mit der ganzen Baustellenfläche, Korridor 100 m.
- **ASTRA:** GitHub Actions holt alle Meldungen (DATEX II, ca. 13 MB) und filtert auf Bern. Xano war dafür zu langsam (Fehler 502). Verortung ohne TMC-Tabelle über die Anschlussnamen im Text und 19 Anschlüsse aus OpenStreetMap, Korridor 250 m. TMC-Tabelle 7.3 bei ASTRA angefragt.
- **Nachtsperrungen:** Zeitfenster wie «nachts 20:00–05:00» werden ausgelesen. Sie lösen keine Warnung aus. Beim ersten Lauf waren alle 7 Berner ASTRA-Meldungen Nachtsperrungen.

### Backend und Automatisierung
- Xano: Tabelle `incidents`, öffentliche Lese-Schnittstelle `GET /incidents` (Gruppe «app»), geschützte Schnittstellen `POST /astra` und `POST /stadt-bern` (Gruppe «cron»).
- GitHub Actions: «ASTRA Baustellen» (nachts und zu Pendelzeiten alle 15 Min.), «Stadt Bern Baustellen» (nachts und zu Pendelzeiten stündlich).
- Schlüssel: ASTRA-Token in Xano und GitHub Secrets, Zeitplan-Passwort CRON_SECRET in Xano und GitHub Secrets, Mapbox-Token in `config.js`.

### Wichtige Entscheide
- PWA statt FlutterFlow, Push über GitHub Actions statt Firebase, Mapbox statt TomTom.
- ASTRA-Verarbeitung in GitHub Actions statt Xano (Grösse der Daten).

### Noch offen für Sprint 2
- Strecken dauerhaft speichern, echte Push-Nachrichten, TMC-Tabelle von ASTRA einbauen, User-Tests.
