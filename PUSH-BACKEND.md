# Push-Benachrichtigungen (Beta): was im Backend fehlt

Die Beta-App (`beta.html`) ist fertig vorbereitet. Sie sendet erst, wenn diese Teile stehen:

1. **VAPID-Schlüssel erzeugen** (einmalig): `npx web-push generate-vapid-keys`
   - Öffentlicher Schlüssel in `config.js`: `VAPID_PUBLIC_KEY: "..."`
   - Privater Schlüssel nur ins Backend (Xano oder GitHub-Secret), nie in die App.
2. **Xano-Endpunkt `POST /push_subscribe`**, speichert pro `device`:
   `subscription` (endpoint, keys) und `routes` (id, name, time, days, line = Liste [lon, lat]).
3. **Versand**: nach dem Baustellen-Import (GitHub Actions, `scripts/`) prüfen, welche neuen Baustellen
   im 100-Meter-Korridor einer gespeicherten Strecke liegen, dann pro Gerät eine Web-Push-Nachricht senden
   (Bibliothek `web-push`), Inhalt: `{ "title": "...", "body": "...", "url": "beta.html" }`.
   Abgelaufene Anmeldungen (HTTP 404/410) löschen.
4. iPhone: Push geht nur, wenn die App zum Home-Bildschirm hinzugefügt ist (iOS 16.4+).

Bis dahin zeigt die App «Vorgemerkt», nicht «Aktiv».
