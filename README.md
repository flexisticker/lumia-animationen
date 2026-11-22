# Live-Studio für MichaModus und 3dbymicha

Eigenes Programm für TikTok-Lives: **Verwaltung im Browser** (PC), **Steuerung am Tablet**, zwei **Browserquellen** für OBS /
TikTok LIVE Studio. Lumia Stream liefert nur die TikTok-Ereignisse (Geschenke, Likes, Follower …), das Studio löst alles selbst aus.

| Adresse | Wofür |
|---|---|
| `/studio` | Verwaltung: alle Einstellungen, Animationen ansehen, eigene Videos hochladen, Lumia-Verbindung, Testen |
| `/aktion` | Tablet-Steuerung: Kanal, Modus (Party/Zocken bzw. Werkstatt/Zocken), Ansagen, Gimmicks, Like-Fontäne, Tests |
| `/quelle/hinten-hoch`, `/quelle/hinten-quer` | Browserquelle hinter dir: Hintergrund (2 Modi), Musik, Fenster 1 + 2 für Spiel / Drucker-Kamera |
| `/quelle/vorne-hoch`, `/quelle/vorne-quer` | Browserquelle vor dir (hoch 1080×1920 / quer 1920×1080, jede mit eigenen Videos): 37 Animationen, Spendername, Banner + Slogans, Like-Fontäne, Ansagen |

## Unraid

Ein Container `ghcr.io/flexisticker/live-studio:latest` (auch unter dem alten Namen `michamodus-medien:latest`), Port 8120, Daten `/data`.
**Kanäle MichaModus und 3dbymicha sind umschaltbar** (Verwaltung oben bzw. Steuerung „Kanal“) – jeder Kanal hat eigene Einstellungen,
die Browserquellen bleiben dieselben und wechseln sofort mit. Updates: Docker → Check for Updates → apply update.

## Twitch, Querformat, StreamPrint

- Twitch-Alerts kommen über Lumia (Follow, Sub, Prime-Sub, Resub, Geschenk-Subs, Bits in 4 Stufen, Hype Train Start/Level/Ende, Raid) – 13 eigene 16:9-Animationen mit Ton.
- Querformat: Browserquellen einfach in 1920 × 1080 anlegen; Hintergründe haben eigene Querformat-Videos, Fenster 1 kann fest 16:9 sein (Spiel).
- StreamPrint (virtueller Bondrucker): unter Animationen & Einblendungen → StreamPrint Adresse `http://<PC>:8000/overlay`, Empfang `http://<PC>:8000/event`
  und „weiterleiten“ an. In StreamPrint dann Streamer.bot/TikTok direkt abschalten, sonst doppelte Zettel.

## Lumia

Lumia → Einstellungen → API: Developers API an, LAN-Zugriff erlauben, Schlüssel kopieren; Windows-Firewall Port 39231 eingehend erlauben.
Im Studio unter **Lumia-Verbindung** IP des Stream-PCs, Port und Schlüssel eintragen. Der Schlüssel liegt nur in `/data/geheim.json`.
Ausweichweg: Ereignisse per HTTP an `POST /api/ereignis` (Kopf `X-MM: 1`, Lumia-Ereignisformat).

## OBS-Reihenfolge (von unten nach oben)

1. Spielaufnahme und/oder Drucker-Kamera (sichtbar durch Fenster 1/2)
2. `/quelle/hinten-hoch` (1080 × 1920) bzw. `/quelle/hinten-quer` (1920 × 1080)
3. Deine Kamera, freigestellt
4. `/quelle/vorne-hoch` (1080 × 1920) bzw. `/quelle/vorne-quer` (1920 × 1080) – „Audio über OBS steuern“ an

## Entwicklung

- Quellen: `overlay/` (Overlays), `app/server.mjs`, `app/web/` (Studio, Shim, Seitenvorlage). `node werkzeuge/build.mjs` erzeugt `app/public/` und `lumia/`.
- Lokal: `DATA_DIR=/tmp/d MEDIA_DIR=medien KANAL=michamodus PORT=8121 node app/server.mjs`
- `lumia/` = ältere Variante als Lumia-Custom-Overlays (weiter nutzbar, nicht mehr nötig).
- Videos/Musik/Bilder erzeugt mit fal.ai (MiniMax H3 Max, LTX 2.5, nano-banana-2, ElevenLabs Music), eigene Motive ohne TikTok-Logos.
