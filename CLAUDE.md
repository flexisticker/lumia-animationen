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
