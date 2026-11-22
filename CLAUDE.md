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
- Aktionsknöpfe stapeln nicht mehr: neuer Knopfdruck bricht laufende Knopf-Animation ab und startet neu (`item.knopf`, `stopNow`), Geschenke laufen zu Ende; Einstellung `knopfModus` knopf|alles|anstellen (Bereich Aktionsknöpfe).
- 22.11.2026 abends: **Spiele-Vorgaben** (`SPIEL_VORGABEN` im Server, einmalig ergänzt über `saved.spieleVorgaben`, gelöschte kommen nicht wieder):
  WoW Forever, Star Citizen, Skerrion, Retro, RPG, Sci-Fi, Jump & Run, Pioneers of Pagonia, Die Siedler 4, Aufbau & Strategie – je eigener Hintergrund
  `medien/hintergrund/spiele/<thema>(-quer).mp4` (nano-banana-2 Bild → LTX 2.5 Pro 10 s, Start = Ende, ohne Ton; eigene Motive, keine Spiel-Logos/Assets)
  und Musik je Spiel (`spiel.musik`). Neue Spiele: Bild+Schleife wie oben erzeugen, in SPIEL_VORGABEN eintragen (oder Michael lädt im Studio hoch).
  **Musik-Player:** `MUSIK` im Server (medien/musik/*.mp3, ElevenLabs Music v2.5, 2 min, Schleife per 4-s-Überblendung mit zwei ffmpeg-Eingängen – asplit hängt),
  `saved.musik {titel, lautstaerke, vonSpiel}`, `POST /api/musik`, SSE `musik` → hintere Quellen blenden über. Steuerung: Bereich „Musik“ mit Titeln, „Musik aus“ und Lautstärkeregler.
  Spiel mit Musik setzt sie beim Zocken, zurück in Modus 1 wieder Standard (nur wenn das Spiel sie gesetzt hatte).
- 22.11.2026 abends: **Plattform-Schild** an jeder Namens-Einblendung (`item.plattform` tiktok|twitch, `.pf-tiktok`/`.pf-twitch`, nur Schriftzug, keine Logos),
  Likes mit Schild „TikTok · Name +n“ (`likeTag`), abschaltbar `plattformAn`. **Sprachausgabe (Danke)** über Michaels ElevenLabs-Konto: Schlüssel nur in
  `geheim.json` (`elevenlabsKey`), Stimme/Modell `saved.tts`, Studio-Seite „Sprachausgabe“ (Stimmen laden, Probe), `POST /api/tts {text}` → `/tts/<sha>.mp3`
  (Zwischenspeicher /data/tts, max. 500, 40/min). Texte je Ereignis in vorne-Bereich „sprache“ (`tts*`, Platzhalter {NAME} {ANZAHL} {GESCHENK} {MONATE} {ZUSCHAUER}),
  Namen werden für die Stimme bereinigt (Emojis weg, _ → Leerzeichen), Animation wird währenddessen leiser (`ttsDucking`). Test mit `TTS_BASE` (nicht production).
  Nicht getestet: echte ElevenLabs-API (nur Nachbau mit gleicher Schnittstelle). Offen: Stadion-Airhorn neu erzeugen (fal-Guthaben war leer).
- 22.11.2026 abends: **Start/Ende je Spiel:** vordere Quelle merkt sich das Spiel (`spiel:`-Nachricht), Ansage „start“/„ende“ zeigt dann den Spiel-Hintergrund
  im Vollbild (`sceneBg`, `szeneSpielVollbild`) + Zeile „Heute: {SPIEL}“ / „Danke fürs Zuschauen bei {SPIEL}!“; eigener Text je Spiel `spiel.start`/`spiel.ende` (Titel | Unterzeile).
  **Talk-Runde** = Spiel-Vorgabe `talk` mit `ohneFenster` (Hintergrund blendet Fenster im Zockmodus aus, außer „immer“), Musik chill, eigene Start/Ende-Texte.
  Talk-Hintergrund `medien/hintergrund/spiele/talk(-quer).mp4` fehlt noch (fal-Guthaben leer) → bis dahin Zockerbude; Server trägt Vorgabe-Videos beim Start nach, sobald die Datei im Image ist.
- 22.11.2026 abends: **BRB + Technik-Störung** als Vollbild-Ansagen (`brb`, `technik`, Knöpfe in der Steuerung), Hintergrund = eigenes Video (`brbVideo`/`technikVideo`
  + Quer, Standard aus medien/hintergrund/brb(-quer).mp4 bzw. technik(-quer).mp4 wenn vorhanden) › Spiel-Hintergrund; BRB mit Countdown (`szeneBrbMinuten`, Standard 5).
  **Wartet auf fal-Guthaben (erzeugen, dann nur Dateien ablegen – der Server nimmt sie automatisch):** hintergrund/brb(-quer).mp4, hintergrund/technik(-quer).mp4,
  hintergrund/spiele/talk(-quer).mp4, sounds/brb.mp3, sounds/technik.mp3, Stadion-Airhorn (Tonspur von animationen/airhorn(-quer).mp4 ersetzen).
- Fix 22.11.2026: Spielfenster im Hintergrund war nicht ganz durchsichtig – das Loch (destination-out) erbte die halbtransparente Abdunkel-Farbe; jetzt immer `fillStyle #000`, `globalAlpha 1` (geprüft: Alpha 0 in der Fenstermitte).
- Musik-Schnellknopf oben in der Steuerung (Kopfzeile klebt beim Scrollen): „Musik aus“ blendet weich aus (`musikAusblendenMs`, Standard 2500), „Musik an“ startet den letzten Titel (`saved.musik.vorher`, Titel „an“ in /api/musik).
- 22.11.2026: **Chat-Einblendung** (gemischt): Server nimmt Lumia-Ereignisse `type: "chat"` an (Plattform aus `origin`, Felder aus `data.extraSettings` bzw. `data`: displayname/username, message, userColor, id; `shouldRemove` löscht), SSE `chat` → vordere Quelle (`#chat`, Plattform-Schild `.pf-<plattform>` vor jedem Namen). Einstellungen Bereich „Chat-Einblendung“ (`chatWann` Standard party, Lage/Größe, max. Nachrichten, Ausblenden, !Befehle weg), Knopf „Chat ein/aus“, Test im Studio (`/api/test-chat`). Lumia-Chatformat nur aus Doku-Suche, Doku-Seite war nicht erreichbar → beim ersten echten Test prüfen; es wird weiterhin NICHTS an Lumia gesendet (kein subscribe).
- 22.11.2026: **Modus → OBS-Szene mit Rückmeldung:** `setModus` liefert den OBS-Stand (`OK:<Szene>` oder Grund: Kopplung aus, „steuern“ aus, keine Szene eingestellt,
  nicht verbunden, Szene unbekannt), `/api/modus` gibt ihn als `obs` zurück, Steuerung zeigt ihn in der Statusanzeige (`obsMeldung`). Mit Mock-OBS geprüft: Party ↔ Zocken schaltet.
  **Like-Fontäne:** TikTok-Likes = genau 1 Herz je Like (gestaffelt, max. `likeMax`, Schalter `likeEinsZuEins`); Knopf/Ansagen weiter als Schwall (`likeMenge`).
- 22.11.2026 abends: fal-Medien nachgeliefert: hintergrund/spiele/talk(-quer).mp4 (Lounge), hintergrund/brb(-quer).mp4 (leerer Gaming-Stuhl), hintergrund/technik(-quer).mp4
  (Reparatur-Roboter + Testbild), sounds/brb.mp3, sounds/technik.mp3, Stadion-Airhorn als neue Tonspur in animationen/airhorn(-quer).mp4 (ElevenLabs SFX, loudnorm -14).
- ElevenLabs-Fehler werden jetzt ausgewertet (`elFehler`: missing_permissions → Hinweis auf Berechtigungen „Text to Speech“ + „Voices lesen“, invalid_api_key → neu kopieren, Kontingent), Schlüssel wird von Leerzeichen/Anführungszeichen bereinigt, Stimmen-ID auch von Hand eintragbar (falls nur TTS-Recht).
- 22.11.2026: Michael bestätigt: Sprachausgabe mit echtem ElevenLabs-Schlüssel funktioniert (Ursache vorher: Schlüssel-Berechtigungen).
- 22.11.2026: **Sparen (Wunsch Michael):** keine weiteren kostenpflichtigen fal.ai-Erzeugungen ohne ausdrückliche Freigabe (Varianten je Animation zurückgestellt). Vorher Kosten nennen und fragen.
- 22.11.2026: Test-Knöpfe am Tablet (Live-Studio) lösen echte Test-Ereignisse über `/api/test` aus (`testEreignis`: Geschenk/Stufe → tiktok-gift mit giftName/coins, Ereignisse → passender Alert-Schlüssel) → Namenskarte mit Profilbild, Plattform-Schild, Text und ggf. Danke-Sprache. Name aus dem Namensfeld, sonst Zufallsname (`TEST_NAMEN`). Testliste enthält jetzt gruppe/ab/geschenk.
- 22.11.2026: **Fenster 1/2 getrennt für Hochkant und Quer:** zusätzliche Felder `f<n>QuerEigen` + `f<n>Q{Wann,X,Y,Breite,Hoehe,Format}` (Quer-Standard Fenster 1: Mitte 50/50, Breite 72 %, 16:9); Hintergrund-Overlay nimmt in der Quer-Quelle (`QUER`) diese Werte. Studio: Felder „Hochkant: …“ oben, Block „Quer: …“ darunter im selben Reiter.
- 22.11.2026: Fenster-Einstellungen in eigenen Reitern „Spielfenster – TikTok (hochkant)“ (`f1`) und „Spielfenster – Twitch (quer)“ (`f1q`, Felder `f1Q*`), ebenso Fenster 2. Quellen melden ihr Format (`/api/events?format=&pfad=&w=&h=`), Studio zeigt auf „Hintergrund & Kameras“/„Animationen“ die verbundenen Quellen mit Format und die richtigen Adressen (-hoch/-quer). Geprüft: Hochkant-Änderung lässt Quer unberührt und umgekehrt.
- 22.11.2026: Talk-Runde (Spiel mit `ohneFenster`) ohne eigene OBS-Szene schaltet jetzt auf die Party-Szene (sonst Zock-Szene); Meldung nennt das Spiel, wenn keine Szene gefunden wird. Mock-OBS: WoW → Gaming, Talk → Just Chatting.
