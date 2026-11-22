# MichaModus – Lumia-Animationen (Projektgedächtnis)

- Kunde: Michael (Flexisticker), TikTok-Kanal **MichaModus**, streamt hochkant 9:16, steht freigestellt im Bild. Deutsch, Du-Form.
- Lumia Stream läuft auf seinem Stream-PC, empfängt TikTok-Ereignisse (Geschenke bestätigt). Offizieller Lumia-MCP existiert
  (`@lumiastream/mcp`, kann Overlays steuern/Alerts testen, aber keine Overlays mit Code anlegen) → Code wird einmal in Lumia eingefügt.
- Aufbau: Quellen in `overlay/`, `werkzeuge/build.mjs` erzeugt `lumia/<overlay>/1-html … 5-data` (Lumia-Reiter). Liste der Animationen: `animationen.json`.
- Animationen: fal.ai `minimax/h3-max/text-to-video`, 5 s, 768P, 9:16, schwarzer Hintergrund, Ton im Video. Schwarz wird im Overlay per WebGL
  herausgerechnet (Regler „Schwarz entfernen“). Hintergrund: nano-banana-2 Bild → LTX 2.5 (Start = Endbild) Schleife. Musik: ElevenLabs Music v2.5,
  Schleife per Überblendung (ffmpeg). Prompt-Vorlage siehe `animationen.json`/Git-Historie.
- Lumia-Alert-Schlüssel: tiktok-gift, tiktok-like, tiktok-follower, tiktok-share, tiktok-superFan, tiktok-treasureChest, tiktok-totalLikes, tiktok-battleEnd.
- Knöpfe: Aktionszentrale → `Overlay.callCommand('mm-aktion', {aktion: JSON})` → Lumia-Befehl sendet `{{aktion}}` per overlaycontent an das Animations-Overlay.
- 22.11.2026: alle 37 Animationen + Zockerbude-Schleife erzeugt. Medien-Container ghcr.io/flexisticker/michamodus-medien (Port 8120 auf Unraid, baut bei jedem Push auf main).
- 22.11.2026 abends: Umbau zum eigenen Programm „Live-Studio“ (Node 22, ohne Abhängigkeiten): `app/server.mjs` (Einstellungen in /data,
  SSE-Verteilung, WebSocket-Client zu Lumia `ws://<PC>:39231/api?token=` – NIE etwas an Lumia senden, jede Nachricht wäre ein Befehl),
  Seiten /studio, /aktion, /quelle/vorne, /quelle/hinten. Overlays laufen unverändert über `app/web/shim.js` (ersetzt window.Overlay).
  Zwei Instanzen per Umgebungsvariable KANAL (michamodus :8120, 3dbymicha :8122, Vorgaben PRESETS im Server).
  Hintergrund: 2 Modi + 2 Fenster (f1/f2: Spiel, Drucker-Kamera) für OBS-Quellen darunter. Image ghcr.io/flexisticker/live-studio.
  Nicht getestet: echte Lumia-Verbindung über LAN, OBS/LIVE Studio, Tablet.
- 22.11.2026 spät: **Twitch** über dieselbe Lumia-Verbindung (twitch-follower, -subscriber (subPlan "Prime" = Prime, subMonths>1 = Resub),
  -giftSubscription, -bits (Stufen 100/1000/5000), -hypetrainStarted/-LevelProgressed/-Ended, -raid) → 13 Animationen 16:9 (Gruppe `twitch`, Dateien tw-*.mp4).
  Querformat: Videos im falschen Format werden ganz gezeigt (nicht beschnitten); Hintergründe je Format (`videoQuer`, `zockVideoQuer`, *-quer.mp4).
  Fenster: `f1Format`/`f2Format` (16:9 für das Spiel bei Twitch). **StreamPrint** (Repo flexisticker/streamprint, virtueller Bondrucker, Python auf dem PC):
  Bereich in der vorderen Quelle (iframe auf http://<PC>:8000/overlay, Einstellungen `sp*`, Knopf „Bondrucker ein/aus“), Studio leitet Lumia-Ereignisse
  per POST an `/event` weiter (`toStreamPrint`, Tests mit `_demo`). Dann in StreamPrint Streamer.bot/TikTokLive abschalten (sonst doppelt).
  Hinweis: Quellen in OBS per http://192.168.1.10:<port> einbinden (https-Seite dürfte das http-iframe des StreamPrint blockieren).
  Sounds (ElevenLabs SFX) für Like-Fontäne, Ansagen, Moduswechsel in `medien/sounds/`. Jede Animation hat Ton (geprüft).
- 22.11.2026 nachts: **Kanäle umschaltbar statt zwei Container** (Wunsch Michael): `saved.profile[<kanal>][vorne|hinten|aktion]`, `saved.profil` = aktiver Kanal,
  Vorgaben `PRESETS` im Server, `POST /api/profil` → alle Quellen laden neu. Alte Einzel-Kanal-Daten werden beim Start nach `profile[KANAL||michamodus]` übernommen.
  Ein Container (Vorlage `unraid/live-studio.xml`), Image auch weiter als michamodus-medien:latest (Update des alten Containers geht).
- 22.11.2026 nachts: **OBS-Kopplung** (obs-websocket v5, Passwort nur in /data/geheim.json): Szene schaltet Modus, Spiel/Modus schaltet Szene, Hintergrund je Spiel.
  **Alerts in 16:9:** alle 37 TikTok/Knopf-Animationen zusätzlich als `medien/animationen/<id>-quer.mp4` (1344×768, mit Ton). Browserquellen je Format:
  `/quelle/vorne-hoch|vorne-quer|hinten-hoch|hinten-quer` (1080×1920 bzw. 1920×1080; ohne Zusatz = nach Fenstergröße). Overlay: `FORMAT` aus Pfad, `videoFor` nimmt
  im Querformat `vq_<id>` › `<id>-quer.mp4` (wenn kein eigenes Hochkant-Video) › Hochkant-Video. Studio-Galerie mit Umschalter Hoch/Quer.
  **Slogans je Kanal trennen:** MichaModus = Gaming & Spaß (kein Drucken!), 3dbymicha = 3D-Druck (Spaß darf rein). Server ersetzt den alten Slogan „gedruckt, gelacht & gefeiert“ beim Start.
