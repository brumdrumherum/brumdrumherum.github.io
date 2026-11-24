# Push-Benachrichtigungen (Sprint 2): was im Backend fehlt

Die App (`index.html`) ist für Push vorbereitet. Sie sendet erst, wenn diese Teile stehen:

1. **VAPID-Schlüssel erzeugen** (einmalig): `npx web-push generate-vapid-keys`
   - Öffentlicher Schlüssel in `config.js`: `VAPID_PUBLIC_KEY: "..."`
   - Privater Schlüssel nur ins Backend (Xano oder GitHub-Secret), nie in die App.
2. **Xano-Endpunkt `POST /push_subscribe`**, speichert pro `device`:
   `subscription` (endpoint, keys) und `routes` (id, time, days, line = Liste [lon, lat]).
   - Datensparsamkeit: Übermittelt wird nur die Linie, keine Adresstexte und kein Streckenname.
   - Hosting in der EU-Region von Xano planen.
   - Inaktive Geräte automatisch löschen.
3. **Versand**: nach dem Baustellen-Import (GitHub Actions, `scripts/`) prüfen, welche neuen Baustellen
   im Korridor einer gespeicherten Strecke liegen (100 m Stadt Bern, 250 m ASTRA), dann pro Gerät eine
   Web-Push-Nachricht senden (Bibliothek `web-push`), 30 Min. vor der Abfahrt.
   Inhalt: `{ "title": "...", "body": "...", "url": "index.html" }`.
   Reine Nachtsperrungen lösen keine Nachricht aus. Abgelaufene Anmeldungen (HTTP 404/410) löschen.
4. iPhone: Push geht nur, wenn die App zum Home-Bildschirm hinzugefügt ist (iOS 16.4+). Die Zustellung ist nicht garantiert.
5. Datenschutz: Sobald Strecken im Backend liegen, gelten sie als personenbezogen. Bekanntgabe ins Ausland
   (Art. 16 DSG, Mapbox in den USA) in der Datenschutzerklärung angeben und prüfen, ob eine
   Datenschutz-Folgenabschätzung (Art. 22 DSG) nötig ist.

Bis dahin zeigt die App «Vorgemerkt», nicht «Aktiv».
