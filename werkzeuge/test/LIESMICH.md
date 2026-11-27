# Gesamttest Live-Studio (Headless)

Prüft Hintergrundwechsel (Fensterloch hoch/quer, OBS-Szene, Musik, Video-Überblendung, Chat, Tablet-Markierung), OBS-Szenenwechsel von außen,
Kameras, Wand-Monitor, Kanal/Logo, Weihnachts-Alerts und alle Studio-Seiten auf JS-Fehler.

```bash
node werkzeuge/test/obs-nachbau.mjs &          # OBS-WebSocket auf Port 4466 (GET /wechsel?name=… = Szene in OBS umschalten)
node werkzeuge/test/hue-nachbau.mjs knopf &    # Hue-Bridge auf Port 8099
DATA_DIR=/tmp/lstest MEDIA_DIR=$PWD/medien PORT=8147 node app/server.mjs &
NODE_PATH=$(npm root -g) node werkzeuge/test/gesamttest.cjs   # Ergebnis: „ALLES OK“ oder Liste mit ✗
```
Mit frischem DATA_DIR starten (der Test verändert Einstellungen).
