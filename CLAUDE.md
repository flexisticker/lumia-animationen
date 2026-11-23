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
- 22.11.2026: **Schild über dem Fenster verschiebbar:** `f<n>SchildPos` links|mitte|rechts, `f<n>SchildX` (−50…50 % der Fensterbreite), `f<n>SchildY` (−30…30 % der Bildhöhe), für beide Formate gemeinsam.
  **Einstellungen nach Update weg:** Ursache fast sicher fehlende Pfad-Zuordnung `/data` (alter Container michamodus-medien ohne Path → anonymes Volume, wird bei Update neu angelegt).
  Server prüft `/proc/self/mountinfo` (`datenDauerhaft`), Studio zeigt sonst rote Warnung mit Anleitung (Path /data → /mnt/user/appdata/live-studio).
- 22.11.2026: **Musik-Playlists je Genre:** Server sammelt `<genre>.mp3` + `<genre>-2.mp3 … -30.mp3` (`MUSIK[].dateien`), `musikInfo` liefert `dateien`, `reihenfolge` (zufall|nacheinander, `saved.musik.reihenfolge`), `weiter` (Zeitstempel → nächstes Stück).
  Hintergrund-Overlay: Playlist (`pl`, `naechster`, `spiele`), bei 1 Titel Schleife, sonst `ended` → nächster. Steuerung: „⏭ Nächstes Stück“, Umschalter 🔀 Zufall / 🔁 Nacheinander, Anzeige Anzahl.
  Neue Titel (Freigabe Michael, ca. 2,80 $): Stable Audio 2.5 (`fal-ai/stable-audio-25/text-to-audio`, 150 s, WAV → Stille weg, Fades, loudnorm, MP3) je 2 für fantasy, space, mystisch, synthwave, chiptune, mittelalter, chill (Dateien `-2`/`-3`).
  Weitere Titel: einfach `medien/musik/<genre>-4.mp3` usw. ablegen.
- 22.11.2026: „Spielfenster ändert sich nicht“: lokal geprüft – Breite ändert sich sofort. Ursache bei Michael vermutlich Format-Verwechslung (OBS-Quelle quer bzw. ohne -hoch → nimmt Twitch-Reiter) oder alte Version. Studio warnt jetzt im Fenster-Reiter, wenn keine Quelle dieses Formats verbunden ist, und nennt den richtigen Reiter/Adresse.
- 22.11.2026: Quellen-Adressen tippfehler-tolerant (Groß/klein, _ statt -, / am Ende, .html → 302 auf richtige Adresse); unbekannte `/quelle/...` zeigen eine sichtbare Hilfeseite mit allen gültigen Adressen statt leerer 404.
- 22.11.2026: **Modus, Spiel und Musik je Kanal:** beim Kanalwechsel (`/api/profil`) wird `{modus, spiel, musik}` im alten Profil unter `zustand` gemerkt und der Stand des neuen Kanals geladen (Standard: Party, kein Spiel, Standardmusik), dann `modus` + `musik` gesendet. Vorher waren sie global → 3dbymicha zeigte sofort den MichaModus-Spielhintergrund.
  **Spiele-Leiste je Kanal abschaltbar:** Steuerungs-Einstellung `spieleAn` (Studio → Tablet-Steuerung), 3dbymicha-Vorgabe aus.
- 22.11.2026: Studio bekommt die verbundenen Quellen live (SSE `quellen` bei jedem Verbinden/Trennen einer vorne/hinten-Quelle, `quellenListe()`), Warnung im Fenster-Reiter verschwindet sofort, wenn die passende Quelle verbunden wird (vorher veraltete Liste vom Seitenaufruf).
- 22.11.2026: **StreamPrint getrennt für Hochkant und Quer:** Reiter „StreamPrint – hochkant (TikTok)“ (`sp*`) und „StreamPrint – quer (Twitch)“ (`spQEigen`, `spQWann` (leer = wie hochkant), `spQX/Y/Breite/Hoehe`, Standard rechts 76/12/20/80 %); Overlay `spG()` nimmt in der vorne-quer-Quelle die Q-Werte. Adresse, Rahmen, Ecken gemeinsam.
- 22.11.2026: **Animationen hingen kurz vor Schluss** (OBS/CEF: `ended` kommt nicht immer, Ton ~17 ms länger als Bild) → Absicherung in `next()`: `ontimeupdate` (Rest < 0,12 s → fertig), Wächter alle 250 ms (am Ende oder 1,5 s Stillstand → fertig), Notaus nach `maxAnimSekunden` (15 s); `finish` pausiert und leert die Zeichenfläche. Geprüft mit unterdrücktem `ended`: Knöpfe und 3 Geschenke laufen durch.
- 22.11.2026: **Ruckeln reduziert:** vorne lädt nur neue Videobilder hoch (`requestVideoFrameCallback`, sonst Zeitvergleich) statt 60×/s, Zeichenfläche auf max. 1920 px begrenzt; hinten zeichnet höchstens ~30×/s (außer bei Übergängen). Gemessen (Headless): hinten 30 statt 60 drawImage/s. Tipp an Michael: OBS Einstellungen → Erweitert → „Browserquellen-Hardwarebeschleunigung“ an, Browserquellen-FPS 30.
- 22.11.2026: **Hängen nur im Live** (ohne Live lief es): Animationen waren 6–9 Mbit/s und wurden erst beim Abspielen von Unraid geladen → im Live (Netz durch Stream-Upload belegt) puffert das Video und bleibt stehen.
  Fix: alle `medien/animationen/*.mp4` neu kodiert (H.264 crf 24, max. 2,5 Mbit/s, AAC 128k, faststart, Ton = Bildlänge; 513 MB → 126 MB, SSIM 0,99),
  vordere Quelle lädt beim Start alle aktiven Animationen ihres Formats nacheinander als Blob in den Speicher (`vorladen`, `vorrat`, pausiert während einer Animation, abschaltbar `vorladenAn: false`),
  Medien-Cache 1 Tag. Neue Animationen künftig gleich so kodieren. Geprüft (Headless): nach dem Vorladen 0 Netzanfragen beim Abspielen, läuft bis zum Ende.
- 22.11.2026: **Hängt weiter im Live** → Zeichnen nicht mehr über `requestVideoFrameCallback` (meldet OBS/CEF unter Last nicht zuverlässig: Bild stand, Ton + Zeit liefen weiter, Wächter griff nicht),
  sondern eine dauerhafte rAF-Schleife `schleife()` + zusätzlich `setInterval` 40 ms (falls OBS rAF drosselt); hochgeladen wird nur bei geänderter Videozeit. WebGL-Kontextverlust wird abgefangen und neu aufgebaut.
  **Fehlerprotokoll:** Overlay meldet Stillstand, Kontextverlust, Videofehler, Notaus, Pausen der Browserquelle > 700 ms per `POST /api/diag` → Studio „Letzte Ereignisse“ mit ⚠️. Geprüft (Headless): normal und mit abgeschaltetem rAF läuft die Animation durch.
- 22.11.2026: **„Läuft, aber hakt“** → mitgelieferte Animationen zusätzlich als **WebM mit Alphakanal** (`medien/animationen/<id>(-quer).webm`, VP9 + Opus, ffmpeg
  `lumakey=threshold=0:tolerance=0.13:softness=0.12`, `-b:v 1800k -maxrate 2500k -crf 34 -cpu-used 5 -auto-alt-ref 0`; 126 MB). Overlay spielt sie direkt als `<video class="direkt">`
  (object-fit cover/contain je Format) – kein WebGL-Hochladen je Bild mehr (gemessen 0 texImage2D). Einstellung `alphaVideos` (Standard an); eigene hochgeladene Videos (v_/vq_) laufen weiter über WebGL + „Schwarz entfernen“.
  Neue Animationen: MP4 (wie oben) **und** WebM erzeugen. Geprüft (Headless): hoch + quer durchsichtig, Namenskarte darüber, Ende sauber.
- 22.11.2026: **Hakt weiter, auch Hintergrundfilme im selben Moment** → OBS-Browserquellen teilen sich die Rechenleistung. Hintergrund-Overlay umgebaut: Videos direkt als `<video>` (object-fit cover, Überblendung per opacity,
  Abdunkeln per Div), Fenster-Loch per `clip-path: path(evenodd, …)` auf `#bg` – kein `drawImage` (Full-HD, 30×/s) mehr; Schleife tut nur bei Änderung (`letzterStand`) etwas.
  **Leistungsmodus** `leistungSparen` (Standard an, vorne Bereich Allgemein + hinten Bereich Bild): Leuchtschein am Fenster dreht nicht (drehender blur wurde jedes Bild neu gezeichnet),
  vorne kein fließender Farbverlauf im Banner, kein drehender StreamPrint-Rahmen. Geprüft (Headless): Party/Zocken, Loch voll durchsichtig, Rahmen/Schild wie vorher.
- 23.11.2026: 3dbymicha quer ohne Hintergrund: `medien/hintergrund/werkstatt-quer.mp4` fehlte (Vorgabe verwies darauf). Kostenlos erzeugt als mittiger Ausschnitt aus werkstatt.mp4
  (crop 1080×608 → 1920×1080, lanczos + unsharp, ohne Ton). Alle anderen Hintergründe haben ihre -quer-Fassung (geprüft). Echte 16:9-Neuerzeugung per fal wäre möglich (vorher fragen/Kosten nennen).
- 23.11.2026: **Knopf „Spielfenster ein/aus“** (🪟, Bereich Ansagen in der Steuerung): `/api/aktion {id:'fenster'}` → Server merkt `saved.fensterAus` (an alle Quellen gleich, auch nach Neuladen via `hallo.fensterAus`),
  Hintergrund `want()` = false solange aus → Loch, Rahmen, Schild blenden weich aus/ein; Modus bleibt Zocken (Hintergrund/Musik/OBS-Szene unverändert). Geprüft (Headless) inkl. Neuladen.
- 23.11.2026: **Moduswechsel schaltet OBS-Szene nicht** (WebSocket laut Michael verbunden): `obsRequest` wartet jetzt auf die OBS-Antwort (2 s, Fehlertext aus requestStatus.comment), `/api/modus` liefert das echte Ergebnis ans iPad,
  Fehler auch im Studio-Protokoll (⚠️ obs). Keine Szene eingestellt → automatisch nach Namen (`rateSzene`: zock/gam/spiel/play bzw. party/chat/talk/cam/main); eingestellter Name fehlt → Groß/klein/Leerzeichen tolerant,
  sonst Namens-Raten, sonst Meldung mit Liste der vorhandenen Szenen. Geprüft mit OBS-Nachbau (`obsmock.mjs` im Scratchpad, Port 4466).
- 23.11.2026: **Drucker-Kamera per Tablet zuschalten:** Knopf „📹 Drucker-Kamera ein/aus“ (id `fenster2` → Server `fenster` nr 2). Fensterknöpfe jetzt je Fenster: `saved.fenster {1,2}` = true/false/null
  (null = wie „Fenster zeigen“ im Studio; `fensterSichtbar(nr)` berechnet den aktuellen Stand fürs Umschalten), ersetzt `fensterAus`. Spielfenster-Zwang (1) gilt bis zum nächsten Moduswechsel,
  Drucker-Kamera (2) bleibt über Moduswechsel/Neuladen. iPad zeigt das echte Ergebnis („Drucker-Kamera an“) – `/api/aktion` liefert `label`, Shim-`callCommand` gibt die Antwort zurück. Geprüft (Headless).
- 23.11.2026: **Fenster 3 „🖥️ LIVE VOM SCHREIBTISCH“** (Kopie der f2-Einstellungen als `f3*`/`f3Q*`, Reiter „Fenster 3 – hochkant/quer“, Rahmen türkis/lila; Standard hochkant links neben Fenster 2: X 27, Breite 42; quer X 74 rechts neben Fenster 2),
  Tablet-Knopf „Schreibtisch-Kamera ein/aus“ (`fenster3`, `saved.fenster[3]`, bleibt über Moduswechsel). Schilder werden automatisch kleiner, wenn sie breiter als ihr Fenster sind, und bleiben im Bild. Geprüft (Headless, hoch + quer).
- 23.11.2026: Schilder über den Fenstern hochkant kleiner (Grundgröße 1,7 vh statt 2,6 vh, quer unverändert), Regler `schildGroesse`/`schildGroesseQuer` (50–200 %, Bereich „Hintergrund & Musik“),
  Abstand zum Fenster nach Schildhöhe statt fest 50 px.
- 23.11.2026: **„Alle Fensterknöpfe schalten das Drucker-Fenster“** = alte Hintergrund-Seite in OBS (vor dem Update geladen: damals schaltete jeder Knopf alle Fenster). Fix für die Zukunft:
  Server bildet `STAND` (SHA-1 über app/public), schickt ihn im `hallo`; Shim und Studio laden sich selbst neu, wenn sich der Stand nach einem Update ändert (Neustart ohne Änderung = kein Neuladen). Geprüft (Headless).
- 23.11.2026: **Kacheln „Kameras & Fenster“** am iPad oben rechts neben Kanal/Modus (`.oben` zweispaltig, unter 820 px untereinander): Spielfenster 🪟 / Drucker 🖨️ / Schreibtisch 🖥️, leuchten grün mit „● zu sehen“,
  wenn das Fenster sichtbar ist. Server `fensterSicht()` (alle 3 über `fensterSichtbar`), SSE `fenster` an die Steuerung bei Fensterknopf, Moduswechsel und Einstellungsänderung, Startwert in `/api/settings.fensterSicht`.
  Die drei Fensterknöpfe bei den Ansagen sind entfallen. Geprüft (Headless): Kachelstand folgt Modus und Knöpfen, Hintergrund schaltet das richtige Fenster.
- 23.11.2026: **Wand-Monitor** (Hintergrund, `#monitor`): zeigt im dunklen Bildschirm der Zockerbude die letzten Unterstützer (neueste oben, rutschen von oben rein, nur neue Zeilen animiert).
  Server `monitorEintrag()` aus `fireAlert` (TikTok Geschenk/Follow/Teilen/Superfan/Schatzkiste, Twitch Follow/Sub/Gift-Sub/Bits/Raid/Hype Train; Likes nicht), `letzte` (max. 50) in `saved.letzte` → bleibt über Neustart/Update,
  neue Liste nach `monPauseStd` (6) Std. ohne Ereignis; SSE `letzte` an hinten, Startwert im `hallo`. Tablet-Kachel „📺 Wand-Monitor“ (`/api/aktion {id:'monitor'}`, `saved.monitor`).
  Sichtbar nur wenn an, Spielfenster nicht zu sehen und (`monWann`) im Zockmodus bzw. immer. Einstellungen Reiter „Wand-Monitor“: Titel, Leertext, Anzahl, Schrift, Deckkraft, Tests zeigen, Lage hoch/quer
  (Standard hoch 50/48/45/37 %, quer 52/48/32/34 % = Bildschirm der Zockerbude). Hochkant zweizeilig (Name / Plattform · Angabe), quer einzeilig mit Plattform-Schild. Schrift passt sich Breite und Höhe an. Geprüft (Headless).
- 23.11.2026: Wand-Monitor **perspektivisch** (vermessen: hochkant rechte Seite oben/unten je ~6 % der Höhe kürzer, quer gerade): `matrix3d` aus 4 Ecken (`basis/adj/mul`, transform-origin 0 0),
  Regler `monPerspektive`/`monQPerspektive`, Lage-Vorgaben exakt auf den Bildschirm (hoch 49,75/47,85/44,5/37,3 %, quer 52,15/47,6/31,9/34 %). Schrift nach Breite/Höhe (`W/16` zweizeilig, `W/28` einzeilig), Innenabstand in em.
  iPad-Kacheln nur sichtbar, wenn der Monitor sichtbar sein kann (`monitorMoeglich`: kein Spielfenster + Zockmodus bzw. „immer“). **Zwei Arten:** `saved.monitor` = 'liste' | 'drucker' | false
  (Kacheln „Monitor: Unterstützer“ / „Monitor: Drucker-Kamera“, erneut tippen = aus); 'drucker' schneidet den schrägen Bildschirm als Loch aus (`monLoch` im clip-path) – Drucker-Kamera in OBS darunter legen. Geprüft (Headless).
- 23.11.2026: **Docker-Icon** = Live-Studio-Logo (`medien/logo/live-studio.svg` → `medien/live-studio-icon.png`, 512 px, transparent), ausgeliefert unter `http://<Unraid>:8120/live-studio-icon.png`,
  in `unraid/live-studio.xml` eingetragen (neuer Dateiname, damit Unraid das Icon neu lädt). `/icon.png` (Mikrofon) bleibt App-Icon fürs iPad.
- 23.11.2026: Modus 2 heißt bei **3dbymicha „Printmodus“** (Symbol 🖨️, Fensterschild „🖨️ PRINTMODUS“): Preset + einmalige Umstellung alter gespeicherter Standardwerte. Neues Feld `modus2Ico`
  (Tablet-Steuerung) für das Symbol; Namen (`modus1Name`/`modus2Name`) und Schild (`f1Schild`) waren schon je Kanal einstellbar. Intern bleibt der Modus `zocken`.
- 23.11.2026: Wand-Monitor sah aufgeklebt aus (eigener Rand/Leuchten + hellerer Grund = doppelter Rahmen). Jetzt ohne Kante/Schatten, dunkler halbdurchsichtiger Grund, Ränder per `mask-image` weich auslaufend,
  etwas kleiner für Abstand zur Lichtleiste (hoch 41×34 %, quer 29,5×31 %), Leertext kleiner mit Glühen. Geprüft (Headless, leer + mit Einträgen).
- 23.11.2026: Wand-Monitor-Neigung pixelgenau an der Lichtleiste vermessen: oben fällt sie nach rechts um ~8,5 % der Bildschirmhöhe, unten steigt sie nur ~6 % → getrennte Regler
  `monPerspektive` (oben, Standard 8,5) und `monPerspektiveUnten` (Standard 6; quer `monQ…` 0/0), linke Kante gerade, Lage hoch 49,6/47,6/42/35,5 %. Auch das Drucker-Loch nutzt diese Ecken.
  Gemessene Ecken im Browser stimmen mit der Lichtleiste überein (±2 px). Achtung beim Testen: Testläufe auf demselben Server schalten das Spielfenster hin und her.
- 23.11.2026: Spielfenster-Knopf gilt jetzt dauerhaft (Wunsch Michael): kein Zurücksetzen von `saved.fenster[1]` bzw. `zwang[1]` beim Moduswechsel mehr – aus bleibt aus (auch nach Werkstatt/Party ↔ Zocken und Neuladen), bis man es wieder einschaltet.
- 23.11.2026: **Neues Musik-Genre „Lo-Fi Talk (Loft)“** (`lofi`, 5 Titel `medien/musik/lofi.mp3`, `lofi-2…5.mp3`, je ~2½ min): Stable Audio 2.5 (150 s, guidance 7, Freigabe Michael, ca. 1 $),
  Stille weg, loudnorm I −16, Ein-/Ausblenden, MP3 160k. Talk-Runde nutzt jetzt `lofi` (Vorgabe + Umstellung gespeicherter „chill“). Prompts: Lo-fi/Chillhop, Rhodes, Jazz-Gitarre, Vinyl, Loft/Coffee-Shop, ohne Gesang, 70–85 BPM.
