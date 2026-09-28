# Brumdrumherum als App aufs Handy

Dieser Ordner ist die installierbare Version des Prototyps (Progressive Web App).
Einmal online gestellt, erscheint Brumdrumherum mit eigenem Symbol auf dem Home-Bildschirm
und öffnet im Vollbild ohne Browserleiste, wie eine normale App. Sie funktioniert auch offline.

## 1. Online stellen mit GitHub Pages (kostenlos, ca. 5 Minuten)

1. Auf github.com anmelden und ein neues, öffentliches Repository anlegen, z. B. `brumdrumherum`.
2. «Add file» → «Upload files» und den **Inhalt** dieses Ordners hochladen
   (index.html, manifest.webmanifest, sw.js und den Ordner icons). Mit «Commit changes» bestätigen.
3. Im Repository «Settings» → «Pages» öffnen. Bei «Branch» `main` und `/ (root)` wählen, speichern.
4. Nach ein bis zwei Minuten erscheint dort die Adresse, z. B.
   `https://<benutzername>.github.io/brumdrumherum/`.

## 2. Auf dem Handy installieren

**iPhone (Safari):** Adresse öffnen → Teilen-Symbol → «Zum Home-Bildschirm» → «Hinzufügen».
Wichtig: Es muss Safari sein, nicht Chrome oder die Teams-App.

**Android (Chrome):** Adresse öffnen → Menü (⋮) → «App installieren» oder «Zum Startbildschirm hinzufügen».

Danach die App über das gelbe Symbol auf dem Home-Bildschirm starten.

## 3. Bedienung

- Unten liegt die Story von A bis Z als Leiste. «Weiter» führt Schritt für Schritt durch den Tag von Max.
- Auf den Titel der Leiste tippen, um Erklärung und Backend-Log aufzuklappen.
- Mit «×» die Story ausblenden und die App frei nutzen. Unter «Profil» lässt sie sich wieder einblenden.

## 4. Was diese Version (noch) nicht kann

- Push-Nachrichten sind simuliert. Echte Push-Nachrichten brauchen Firebase und ein Backend.
- Baustellen sind nachgebaute Einträge im Format der echten Schnittstellen, Verkehrsstärken sind Demo-Werte.
- Details dazu: Produktdokumentation Sprint 1 im Teams-Ordner.

## 5. Aktualisieren

Neue Version der Dateien hochladen und in `sw.js` die Zeile `const CACHE = "brumdrumherum-v1";`
auf `v2` usw. erhöhen. Sonst zeigt das Handy weiter die zwischengespeicherte alte Version.
