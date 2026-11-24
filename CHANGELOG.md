# Brumdrumherum – Änderungen

Version = Sprint: Version 1.0 = Sprint 1, Version 2.0 = Sprint 2 usw.
Diese Datei beim Weiterarbeiten mit der KI immer mit hochladen.

## Version 1.0 – Sprint 1 (Stand 24.11.2026)

### App
- **Baustellen Kanton Bern (24.11.2026):** Neue Quelle «Kanton Bern» (Tiefbauamt, Kantonsstrassen). Export vom 12.11.2026 (334 Linien, LV95). `scripts/tba-be.mjs` rechnet auf WGS84 um, verwirft abgeschlossene Baustellen und schreibt `tba-be.json` (309 Baustellen). Die App lädt die Datei nach den Xano-Daten, Korridor 100 m. Aktualisieren: `node scripts/tba-be.mjs <neues.geojson> tba-be.json`. Der Service Worker lädt die Datei zuerst aus dem Netz.
- **Strecken umbenennen (17.11.2026):** In der Streckenansicht gibt es den Knopf «Umbenennen». Daten der früheren Beta (`brum-beta:*`) werden beim ersten Start übernommen. Die Beispielstrecken rendern den Bildschirm nur noch neu, wenn «Meine Strecken» offen ist.
- **beta.html leitet um (17.11.2026):** `beta.html` leitet auf die Hauptseite weiter, damit niemand mehr die alte Beta-Version sieht. Push-Klick öffnet `index.html`.
- **Beispielstrecken schneller laden (17.11.2026):** Die Beispiele werden parallel geladen, gelungene bleiben erhalten, auch wenn eine andere fehlschlägt. Interner Merker `seeded` entfällt zugunsten von `seedKeys`.
- **Start direkt auf «Meine Strecken» (17.11.2026):** Die Begrüssung entfällt, beim Öffnen der Seite erscheinen sofort die Strecken.
- **Beispielstrecken mit Namen (17.11.2026):** «Wankdorf → Shoppyland» heisst jetzt «Arbeitsweg Fiona». Neu dazu: «Fussballtraining Tom» (Wabern → Wankdorf) und «Einkaufen Sabrina» (Belp → Westside). Bestehende Installationen bekommen Umbenennung und neue Strecken einmalig, gelöschte kommen nicht zurück.
- **Beta ist live (9.11.2026):** `index.html` übernimmt alle Verbesserungen aus `beta.html` (Startseite, Ortssuche, Vorbereitung Push). Die echte App zeigt keine Punkte, Abzeichen, Quests oder Serien mehr (Nutzertest: Gamification kam schlecht an). Gespeicherte Strecken bleiben erhalten.
- **Demo-Story ohne Gamification (9.11.2026):** Auch `demo.html` zeigt keine Punkte mehr (User-Test, 8 Personen: Punkte und Abzeichen 2.1 von 5, 0 von 8 als wertvollstes Feature). Schritte C, H, J neu geschrieben, Zusammenfassung mit Testergebnissen. Ein Schalter `GAMIFY` steuert das für App und Demo. Die Karte in der Demo nutzt immer die Story-Daten, damit Schritt K die A1-Nachtsperrung zeigt. Profil: drei Kennzahlen nebeneinander.
- **Demo-Story ergänzt:** neuer Schritt K «Nachtsperrungen bleiben still» (A1 Bethlehem–Brünnen, nur nachts), Backend-Ablauf wie er wirklich läuft (GitHub Actions für ASTRA, Xano für Stadt Bern), Zusammenfassung mit echten Zahlen und Erkenntnissen.
- **Echte App statt Story:** `index.html` startet ohne Story, ohne simulierte Uhrzeit und ohne Beispieldaten. Erst Begrüssung, dann direkt «Neue Strecke» mit Adresssuche. Die Story mit Max bleibt als `demo.html` für Pitch, Showroom und Coaching.
- **Speichern auf dem Handy:** Strecken, Meldungen und Punkte bleiben nach dem Neustart erhalten (nur auf diesem Gerät). Im Profil lassen sich alle Daten löschen.
- **Kein Login:** Jedes Gerät erhält eine zufällige, anonyme Nummer (für die spätere Anmeldung bei Xano für Push). Keine Namen, keine Mail. Login ist Roadmap, falls mehrere Geräte nötig werden.
- **Betrieb:** `import_stadt_bern` überspringt Baustellen ohne ID statt abzubrechen (aufgetreten am 2.10.2026, Fehler «Missing param: field_value»).
- Installierbare Web-App (PWA) auf GitHub Pages, Dark-Mode-Design «Nachtasphalt und Markierungsgelb».
- Geführte Story von A bis Z mit Persona Max (immer mit Beispieldaten, damit sie gleich abläuft).
- Mapbox: echte Karte, Adresssuche in der ganzen Schweiz, Routen mit Alternativen. Token in `config.js` (wird bei Updates nicht überschrieben).
- Routenvergleich nach Fahrzeit, Baustellen und Umweg. Auslastung entfernt (Entscheid Team: kein Live-Verkehrsfluss).
- Baustellen melden (Community): nur Punkt und Art, als «nicht verifiziert» markiert, nur im Stillstand, bleibt auf dem Gerät. Punkte und Abzeichen sind seit 9.11.2026 ausgeblendet.

### Echte Daten (Region Bern)
- **Stadt Bern (KOER):** Xano-Funktion `import_stadt_bern` holt die Baustellen, filtert abgelaufene, speichert jede nur einmal und übernimmt keine Namen oder Telefonnummern. Abgleich mit der ganzen Baustellenfläche, Korridor 100 m.
- **ASTRA:** GitHub Actions holt alle Meldungen (DATEX II, ca. 13 MB) und filtert auf Bern. Xano war dafür zu langsam (Fehler 502). Verortung ohne TMC-Tabelle über die Anschlussnamen im Text und 19 Anschlüsse aus OpenStreetMap, Korridor 250 m. TMC-Tabelle 7.3 bei ASTRA angefragt.
- **Nachtsperrungen:** Zeitfenster wie «nachts 20:00–05:00» werden ausgelesen. Sie lösen keine Warnung aus. Beim ersten Lauf waren alle 7 Berner ASTRA-Meldungen Nachtsperrungen.

- **Updates kommen sofort an:** Der Service Worker lädt Seiten jetzt immer zuerst frisch aus dem Netz (nur offline aus dem Speicher). Vorher konnten Handys nach einem Update noch die alte Version zeigen.

### Backend und Automatisierung
- Xano: Tabelle `incidents`, öffentliche Lese-Schnittstelle `GET /incidents` (Gruppe «app»), geschützte Schnittstellen `POST /astra` und `POST /stadt-bern` (Gruppe «cron»).
- GitHub Actions: «ASTRA Baustellen» (nachts und zu Pendelzeiten alle 15 Min.), «Stadt Bern Baustellen» (nachts und zu Pendelzeiten stündlich).
- Schlüssel: ASTRA-Token in Xano und GitHub Secrets, Zeitplan-Passwort CRON_SECRET in Xano und GitHub Secrets, Mapbox-Token in `config.js`.

### Wichtige Entscheide
- PWA statt FlutterFlow, Push über GitHub Actions statt Firebase, Mapbox statt TomTom.
- ASTRA-Verarbeitung in GitHub Actions statt Xano (Grösse der Daten).
- Daten auf dem Gerät, kein Konto (weniger Personendaten, kein Passwort-Aufwand). Login nur, falls Strecken auf mehreren Geräten nötig werden.
- Kein Live-Verkehrsfluss (Fokus auf Baustellen), keine Gamification (User-Test: 2.1 von 5).

### Technische Grenzen
- Ohne TMC-Tabelle erkennt das System nur ASTRA-Meldungen mit einem der 19 hinterlegten Anschlüsse oder genauen Koordinaten. Der Korridor von 250 m ist geschätzt.
- Importe laufen alle 15 bzw. 60 Minuten, GitHub Actions startet nicht garantiert pünktlich. Die App zeigt den Stand des letzten Imports.
- Mapbox-Token auf die Domain der App beschränken.
- Korridore (100 m, 250 m) und Score-Gewichte sind Annahmen, in weiteren User-Tests prüfen.

### Noch offen für Sprint 2
- Strecken bei Xano anmelden (mit Gerätenummer), echte Push-Nachrichten, TMC-Tabelle von ASTRA einbauen, User-Tests.
- Baustellen über die Mobilitätsdateninfrastruktur MODI des Bundes beziehen statt direkt von den Anbietern.
- Datenschutz: EU-Region bei Xano, nur die Linie ohne Adresstexte übermitteln, inaktive Geräte löschen, Datenschutz-Folgenabschätzung (Art. 22 DSG) prüfen, Bekanntgabe ins Ausland (Mapbox, USA) in der Datenschutzerklärung. Siehe `PUSH-BACKEND.md`.
