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
- 23.11.2026: Wand-Monitor: unterer Teil bleibt frei (dort sitzt Michael davor, Schrift schien durch): `monFrei` (hoch, Standard 30 %) / `monQFrei` (quer 15 %), Liste nur im oberen Bereich,
  Schrift danach berechnet, `.mon-liste` mit max-height + weichem Ausblenden unten (mask). Geprüft (Headless, 8 Einträge).
- 23.11.2026: **Spielfenster einschalten schaltet Drucker, Schreibtisch und Wand-Monitor aus** (`saved.fenster[2/3] = false`, `saved.monitor = false`), Server schickt SSE `fensterstand` (kompletter Stand) an hinten,
  Shim leitet als `fenster:` + `letzte {monitor}` weiter (Monitor-Liste bleibt dabei erhalten). Ausschalten des Spielfensters ändert die anderen nicht. Geprüft (Headless, auch nach Neuladen).
- 24.11.2026: Funky Groove +2 Titel (`funk-2.mp3` Slap-Bass/Wah-Wah/Bläser 112 BPM, `funk-3.mp3` Disco-Funk/Clavinet 118 BPM; Stable Audio 2.5, ca. 0,40 $, gleiche Nachbearbeitung). Playlist jetzt 3 Titel.
- 24.11.2026: **OBS-Quellen mit den Fenstern schalten:** `saved.obs.quellen {spiel, drucker, schreibtisch, monitor}` (Studio → Spiele & OBS, Auswahl aus `obs.quellen` = GetInputList, aktualisiert bei Input-Ereignissen).
  `obsQuellenSync()` (aus `fensterMelden` und nach dem Verbinden): Soll-Zustand aus `fensterSicht()` (monitor = Drucker im Wand-Monitor sichtbar), gleiche Quelle für mehrere Fenster = an, wenn eines offen ist;
  `GetSceneItemList` über alle Szenen → `SetSceneItemEnabled` je Vorkommen; nur bei Änderung (`quellenStand`), Fehler „in keiner Szene gefunden“ ins Protokoll. `obsRequest` liefert jetzt `data` (responseData).
  Geprüft mit OBS-Nachbau (Quellen in 2 Szenen). Verschachtelte Gruppen/Szenen werden nicht durchsucht.
- 24.11.2026: **12 neue Geschenk-Animationen** (hoch + quer, je MP4 + Alpha-WebM, ca. 4,60 $): Daumen hoch, Lebkuchenherz, Herz, Eiswaffel, Freundschaftskette, Kappe, Hut & Schnurrbart, Schwan,
  Papierkranich, Ich liebe dich, Mikrofon, Zug (`animationen.json`, Gruppe geschenk, `match` mit englischen + deutschen Namen). Prompt-Vorlage wie bisher („Full-frame celebration effect … PURE BLACK …“, Quer-Zusatz
  „in a wide 16:9 landscape composition“). **minimax/h3-max verlangt jetzt `prompt_expansion_mode`** (genutzt: `balanced`). Kappe zeigt ein „NY“-Baseball-Logo (Modell hielt sich nicht an „no logos“) – ggf. neu erzeugen.
  Geprüft (Headless): Thumbs Up/Lebkuchenherz/Train/Ice Cream Cone spielen die eigene WebM in hoch und quer.
- 25.11.2026: **StreamModus für den Windows-Stream-PC** (`windows/StreamModus/`, fertiges `windows/StreamModus.zip`): `Stream-Start.bat`/`Stream-Stop.bat` (Desktop) + Ordner `StreamModus` (PowerShell 5.1, UTF-8 mit BOM, CRLF).
  Start (normaler Benutzer): Google Drive/OneDrive (`/shutdown`)/Nextcloud (`--quit`) beenden, Pfade in `%LOCALAPPDATA%\StreamModus\zustand.json` merken; `System-Anpassung.ps1 -Modus Start` per UAC (merkt Stand in
  `C:\ProgramData\StreamModus\system.json`: Dienste wuauserv/UsoSvc/BITS/DoSvc deaktivieren+stoppen, Store AutoDownload=2, NetworkThrottlingIndex=ffffffff, SystemResponsiveness=10, QoS DSCP 46 für obs64.exe, Energieplan Höchstleistung);
  dann Discord → OBS (Arbeitsordner!) → Lumia → TikTok LIVE Studio → Streamer.bot (Pfade aus `Einstellungen.ps1` oder Startmenü-Verknüpfung, Streamer.bot ggf. Pfad eintragen); Fenster wartet, bis OBS zu ist → Stop.
  Stop: Programme schließen, System wiederherstellen (ohne Stand: Windows-Standardwerte), Clouds neu starten; `stop.lock` verhindert doppeltes Aufräumen. **Nicht getestet** (kein Windows/PowerShell in der Sandbox, pwsh-Download nicht erlaubt).
- 25.11.2026: **Philips Hue** (lokale Bridge, API v1, kein Cloud-Weg): `saved.hue {an, live, ip, lampen[], helligkeit, uebergang, alerts, likes, szenen, grund[kanal][modus], vorher}`, Bridge-Benutzer nur in `geheim.json` (`hueUser`).
  Koppeln `/api/hue/suchen` (discovery.meethue.com) + `/api/hue/koppeln` (Knopf auf der Bridge), `/api/hue/lampen`, `/api/hue` (speichern), `/api/hue/test`. Farbverlauf je Animation aus
  `medien/animationen/farben.json` (erzeugt mit `werkzeuge/farben.py`: je 0,5 s zwei Hauptfarben; bei neuen Animationen neu laufen lassen). Vordere Quelle meldet den Start `POST /api/hue/anim {id}`
  (hoch + quer → 2 s entprellt), Server spielt den Verlauf ab (hex → CIE xy, je Lampe nur neuester Wunsch, ~110 ms Abstand), danach Grundlicht je Kanal/Modus. Likes = kurzes Pink (max. alle 3 s),
  Ansagen: BRB/Pause/Gleich gedimmt, Technik rot, Start/Ende hell. Ausschalten (Studio oder Tablet-Kachel „Licht (Hue)“ = `/api/aktion {id:'licht'}`, `saved.hue.live`) setzt den gemerkten Lampenzustand zurück.
  Getestet nur mit Bridge-Nachbau (Scratchpad `huemock.mjs`). Lumia darf parallel auf die Bridge – dort keine eigenen Licht-Alerts für dieselben Lampen.
- 25.11.2026: **Studio bedienbarer:** Menü gruppiert (Live / Aussehen / Verbindungen) mit Symbolen und Ampel-Punkten, Übersicht mit Status-Kacheln (Lumia, OBS, Licht, Sprache, Browserquellen + „Einrichten →“),
  Fenster/Kameras/Licht-Schalter wie am Tablet, Toast „✓ Gespeichert“ bei jeder Änderung, Video-Vorschauen ab 1,2 s (nicht mehr schwarz). „Spiele & OBS“ getrennt: neue Seite **„OBS & Fenster-Quellen“**
  (`obs`) mit Tabelle Fenster → OBS-Quelle zuerst (Freitext + Auswahlliste, speichert sofort über `/api/obs/quellen` ohne Neuverbinden, Warnung bei unbekanntem Namen), Spiele als aufklappbare Karten.
  Fenster-Reiter unter „Hintergrund & Kameras“ zeigen die zugeordnete OBS-Quelle mit Link. Studio bekommt SSE `fenster` und `hue`.
- 25.11.2026: **10 weitere Geschenk-Animationen** (hoch + quer, MP4 + Alpha-WebM, ca. 3,80 $): Feuerwerk (Fireworks), Wal (Whale diving), Motorrad, Privatjet, Sportwagen (ohne Marken-Emblem),
  Einhorn (Unicorn Fantasy), Interstellar, Rosa Nebel (Rosa Nebula), Falke (Falcon), Weltraum-Shuttle (TikTok Shuttle, auch „Rocket“). Gleiche Prompt-Vorlage und Kodierung wie 24.11.,
  `farben.json` neu erzeugt (72 Animationen). Geprüft (Headless): alle 10 Geschenknamen spielen die eigene WebM in hoch und quer.
- 25.11.2026: **Studio-Seite „Geschenke“** (`geschenke`, Menü Live): alle Münz-Geschenke nach Münzen sortiert mit der Animation, die wirklich läuft (gleiche Regel wie `giftAnim` im Overlay:
  `eigeneZuordnung` › passende Geschenk-Animation (wenn an) › Stufe nach Münzen). Gelb = nur Stufe. Je Zeile Vorschau mit Ton (Fenster, hoch/quer), „Im Stream testen“ (`/api/test`),
  Animation zuweisen (schreibt Zeile `name = id` in vorne `eigeneZuordnung`, automatisch = Zeile weg). Startliste `GESCHENK_KATALOG` im Server (43 Geschenke, Münzwerte ungefähr),
  dazu lernt der Server jedes echte Geschenk (`saved.geschenke[name] {name, muenzen, anzahl, zuletzt, bild}`, nicht aus Tests, max. 500, SSE `geschenke`), Bild-Link nur falls Lumia einen
  https-Link schickt (Feldname unbekannt: giftPictureUrl/giftPicture/giftImage/giftIcon/image). `GET /api/geschenke`, `POST /api/geschenke/vergessen`.
- 25.11.2026: **Hue-Effekte je Spot und Ereignis** (Michael hat Hue eingerichtet, 2 Spots): `farben.json` jetzt je 0,5 s `[links, rechts, Hauptfarbe, Zweitfarbe]` (linke/rechte Bildhälfte, `farben.py`).
  Spots `saved.hue.spots[id] {seite links|rechts|mitte, hell}` (Standard 1. links, 2. rechts). Effekte `HUE_EFFEKTE`: ambilight (Bildhälfte je Spot), ambibunt, farbe, zweifarbig (links Farbe 1, rechts Farbe 2),
  atmen (gegenläufig), pulsieren, wechsel (links↔rechts 0,5 s), regenbogen (180° versetzt), feuer, funkeln, kurz, nichts. Kategorien `HUE_KAT` (Geschenk klein/mittel/groß/episch nach Münzen 100/1000/10000,
  Follow, Teilen, Superfan, Schatzkiste, Like-Ziel, Battle, Likes, Twitch Sub/Bits/Hype/Raid, Knöpfe, Ansagen a-start/a-pause/a-brb/a-technik/a-ende) je {effekt, farbe1, farbe2, dauer (0 = Animationslänge), hell, blitz}
  in `saved.hue.effekte`, Grundlicht je Kanal/Modus als Effekt in `saved.hue.grund[kanal][modus]` (alte Einzelfarben werden umgestellt). Motor: Takt 250 ms (`hueTick`), Schicht Alert › Ansage › Grundlicht,
  sendet nur Änderungen. Overlay meldet bei `/api/hue/anim` zusätzlich alert/gruppe/muenzen → `hueKat`. Test `/api/hue/test {kat}`. Studio-Seite Licht: 1. Spots, 2. Grundlicht, 3. Effekte je Ereignis (▶ je Zeile).
  Geprüft mit Bridge-Nachbau (atmen gegenläufig, Einhorn links blau/rechts gold, Raid wechselt). Mit echten Lampen ungeprüft.
- 26.11.2026: **Animiertes Logo statt Banner-Text** (Wunsch Michael für 3dbymicha): vorne-Bereich „Banner & Slogans“ neue Felder `logoBild` (imageupload png/webp/jpg), `logoAnimation`
  (alles = Schweben + Glanz + Wackeln | schweben | wackeln | pulsieren | drehen (3D) | glanz | aus), `logoGroesse` (vh), `logoX`, `logoY`, `logoSlogans` (Slogans laufen kleiner unter dem Logo statt Titel),
  `logoHype` (hüpft bei Alerts). CSS `.logo` mit Glanz per mask auf das Logo selbst. 3dbymicha-Vorgabe nimmt `/logo/3dbymicha.png`, sobald die Datei unter `medien/logo/` liegt.
  Slogans 3dbymicha um „3D-Druck · Textilveredelung · Werbetassen“ + „Dein Motiv auf Shirt, Tasse oder als 3D-Druck“ ergänzt (einmalige Umstellung gespeicherter Slogans).
  **Offen:** Michaels Logo-Datei (kam nur als Chat-Bild, nicht als Datei) – Untertitel soll „3D-Druck · Textilveredelung · Werbetassen“ werden. Geprüft mit Platzhalter-Logo (Headless, hoch + quer).
- 26.11.2026: **Ende-Ansage zeigte bei 3dbymicha „Folg MichaModus“** (fester Text). Jetzt Platzhalter `{KANAL}` (= `bannerText` des Kanals) in `szeneEnde`, 3dbymicha-Vorgabe
  „Danke & bis bald! | Folg 3dbymicha – 3D-Druck, Textil & Werbetassen“; gespeicherte szene*-Texte anderer Kanäle werden beim Start von „MichaModus“ auf `{KANAL}` umgestellt. Banner-HTML startet leer. Geprüft (Headless) für beide Kanäle.
- 26.11.2026: **Atmo-Geräusche zum Hintergrund** (Wunsch Michael: WoW Forever ohne Kaminknistern/Luftzug). Hintergrund-Overlay spielt eine Geräusch-Schleife passend zum sichtbaren Video
  (`atmoWahl`: Spiel-`atmo` › `atmoParty`/`atmoZocken` › `/atmo/<videoname>.mp3`, z. B. wow-forever.mp4 → medien/atmo/wow-forever.mp3), zwei `<audio>` mit 1,5–2 s Überblendung, fehlende Datei = still.
  Einstellungen hinten Bereich Bild: `atmoAn`, `atmoLautstaerke` (30), `atmoParty`, `atmoZocken`; je Spiel Upload „Geräusche (Atmo)“ (`/api/upload-spiel/<id>/atmo`, mp3/ogg/wav, `spiel.atmo`).
  Prompts für 13 Hintergründe in `werkzeuge/atmo-prompts.json` (ElevenLabs SFX v3, 30 s, loop). **Noch nicht erzeugt:** fal-Guthaben leer (balance_exhausted) – nach Aufladen + Freigabe erzeugen
  und nach `medien/atmo/` legen. Geprüft (Headless) mit Ersatz-Dateien: Wechsel Party → WoW → Star Citizen (fehlt → still) → Party.
- 26.11.2026: **Atmo-Dateien erzeugt** (Freigabe Michael, fal aufgeladen): 13 Hintergründe + Weihnachten als `medien/atmo/<name>.mp3` (ElevenLabs SFX v3, 30 s loop, auf ca. −28 dB mittlere Lautstärke angeglichen, alimiter).
  **Weihnachts-Stream** (Spiel-Vorgabe `weihnachten`, ohne Spielfenster): Hintergrund `medien/hintergrund/spiele/weihnachten(-quer).mp4` (nano-banana-2 Weihnachtsstube mit Baum/Kamin/Schneefenster → LTX 2.5 Pro 10 s Schleife,
  crf 22), Musik-Genre `weihnachten` (3 Titel Stable Audio 2.5: Lo-Fi-Glöckchen, festlich-orchestral, Jazz am Kamin; loudnorm −16, Fades), Atmo Kaminfeuer + Wind + ferne Schlittenglöckchen,
  eigene Start/Ende-Texte, **Jingle** beim Wechsel aufs Thema (`spiel.jingle` = /sounds/weihnachten.mp3, vordere Quelle spielt ihn bei Spielwechsel, nicht beim Laden). Neuer reiner Sound-Knopf
  `sound:<name>` (vorne spielt /sounds/<name>.mp3), am Tablet „🎅 Ho ho ho!“ (/sounds/hohoho.mp3). Kosten zusammen ca. 3 $. Geprüft (Headless): Hintergrund, Musik, Atmo, Jingle, Ho-ho-ho.
- 26.11.2026: **Kanäle unterscheiden sich nur noch in Texten** (Wunsch Michael): `KANAL_TEXTE` (vorne bannerText/slogans/szene*/logoBild/geschenkText, hinten f1–3Schild, aktion titel/modus1Name/modus2Name/modus2Ico)
  liegen je Kanal in `saved.profile[kanal]`, alles andere gemeinsam in `saved.profile.michamodus` (`zielProfil`, `settingsFor`, `nurTexte`/`ohneTexte`). 3dbymicha-Preset nur noch Texte.
  Kanalwechsel behält Modus, Spiel und Musik (kein `zustand` je Kanal mehr). Hintergründe kommen über **„Was läuft gerade“** (Studio-Menü, früher „Spiele & OBS“): neue Vorgaben
  `werkstatt` (3D-Druck-Werkstatt, Musik chill), `party-buehne` (ohne Fenster), `zockerbude`; `SPIEL_VORGABEN` erlaubt absolute Bildpfade (`/hintergrund/…`).
  **Hue je Thema:** `HUE_SPIEL_LICHT` (Vorgaben je Thema, z. B. WoW Kamin-Flackern orange/blau, Weihnachten warm flackernd), je Thema änderbar (`spiel.licht {effekt, farbe1, farbe2, hell}`, Studio-Feld „Licht (Hue)“ mit ▶ = `/api/hue/test {spiel, licht}` 6 s).
  `hueGrundDef` nimmt im Zockmodus das Themen-Licht, sonst `saved.hue.grund.alle` (Grundlicht gilt für beide Kanäle). Neuer Effekt `flackern` (zwei Farben, Kamin/Kerzen). Mit Bridge-Nachbau geprüft.
- 26.11.2026: **Mehr Musik** (Freigabe Michael, ca. 2,40 $): je 1 Titel mehr für alle Genres (hype-2, funk-4, chill-4, lofi-6, fantasy-4, space-4, synthwave-4, chiptune-4, mittelalter-4, mystisch-4) + weihnachten-4/-5 (Stable Audio 2.5, gleiche Nachbearbeitung).
  **Weihnachts-Gimmicks:** Sounds `medien/sounds/{schlitten,glocken,schneeball,geschenk,prost,elfen}.mp3` (ElevenLabs SFX, loudnorm −14) und 5 Animationen `xmas-schlitten|schnee|geschenke|baum|schneemann` (hoch + quer, MP4 + Alpha-WebM, ca. 1,90 $, gruppe knopf).
  Tablet: eigener Bereich „🎄 Weihnachten“ (Animationen aus `MM_LIST` mit `xmas-`-Präfix + `XMAS_SOUNDS` als `sound:<name>`), abschaltbar `weihnachtAn` (Tablet-Steuerung); xmas-* stehen nicht in den Standard-Gimmick-Knöpfen. `mmList` trägt jetzt `ico`.
  **Logo 3dbymicha weiter offen** (Datei fehlt im Repo).
- 27.11.2026: **Weihnachten Runde 2** (Wunsch Michael „je 5“, ca. 5 $): Musik `weihnachten-6…10` (Swing-Jazz, Winterwunderland-Orchester, Xmas-Pop, Akustik, Chiptune; jetzt 10 Titel),
  Sounds `rentier, zauber, knallbonbon, engel, knusper` (Tablet-Bereich „🎄 Weihnachten“, `XMAS_SOUNDS`), Knopf-Animationen `xmas-rentier|lebkuchen|kugeln|sternschnuppe|elfen`,
  **Weihnachts-Alerts** `xa-folgen|teilen|superfan|likeziel|stufe-klein` (gruppe `weihnachten`, Studio-Bereich „Weihnachts-Alerts“): Overlay `festlich(anim)` ersetzt eine Animation durch `xa-<id>`
  (Twitch-Follow über `XA_MAP` → xa-folgen), wenn `weihnachtAlerts` = immer oder (Standard `thema`) Zockmodus + Thema mit „weihnacht“ in ID/Name; Geschenke mit eigener Animation bleiben.
  **Kaminfeuer hörbar:** `medien/atmo/weihnachten.mp3` neu (ElevenLabs SFX, nahes knisterndes Kaminfeuer, 30 s loop, mittlere Lautstärke −22,6 dB statt −28 → deutlich lauter als andere Atmos).
  **Hue-Effekt `kaminfeuer`** (Glut Farbe 1 ↔ Flamme Farbe 2): je Spot eigenes weiches Rauschen aus 3 Schwingungen + Zufall + seltenes Auflodern, heller = gelber, tt 200 ms; Vorgabe Weihnachten #ff3000/#ffb040.
  Geprüft (Headless + Bridge-Nachbau): Follow/kleines Geschenk/Twitch-Follow im Weihnachts-Thema → xa-*, bei WoW normal; 22 Weihnachts-Knöpfe; Lampen flackern unabhängig.
- 27.11.2026: **3dbymicha-Logo eingebaut** (Michael hat es als Bild geschickt; Original `medien/logo/3dbymicha-original.jpg`): weißer Rand per Flood-Fill freigestellt, Unterzeile
  „3D-Druck & Textilveredelung“ ersetzt durch „3D-Druck · Textilveredelung / & Werbetassen“ (Poppins Bold aus @fontsource/poppins, Gelb #facc3a, Band #01081a), 973×1000 PNG → `medien/logo/3dbymicha.png` (Preset nimmt es).
  **Logo zu-/abschaltbar:** Tablet-Knopf „🏷️ Logo ein/aus“ (`/api/aktion {id:'logo'}` → `saved.logoAus`, gilt für alle Quellen, im `hallo` → bleibt nach Neuladen), Overlay `setLogo(an)` (aus = Schriftzug-Banner).
  Kanal ohne Logo → Meldung „Kein Logo für diesen Kanal eingestellt“. Geprüft (Headless, hoch + quer, Neuladen).
- 27.11.2026: **Hue: ein Spot rötlich, der andere weiß** (Michael, Kaminfeuer). Ursache nicht sicher (kein Zugriff aufs Heimnetz). Gebaut: Farbe je Lampe in ihren Farbraum ziehen
  (`xyImGamut`, Gamut aus `capabilities.control.colorgamut` bzw. `colorgamuttype` A/B/C, sonst C) – fremde Lampen (z. B. IKEA/Innr) zeigen bei Farben außerhalb oft Weiß;
  Antwort der Bridge wird ausgewertet, Fehler je Lampe einmal ins Studio-Protokoll („Hue: <Lampe> – …“); Studio-Licht zeigt je Spot Hersteller/Modell und „nicht erreichbar“.
  Weitere mögliche Ursachen bei Michael: Hue-App-Automation/„Natürliches Licht“, Lumia oder Hue Sync steuern dieselbe Lampe. Geprüft mit Bridge-Nachbau (Gamut B, Fehlerantwort).
- 27.11.2026: **Modus entfällt in der Bedienung, „Was läuft gerade“ nach Kategorien** (Wunsch Michael): `saved.kategorien` [{id, name, ico}] (Standard Spiele, Talk, Werkstatt, Party, Specials & Feiertage;
  Reihenfolge = Tablet; im Studio umbenennen/sortieren/neu anlegen, leere löschen), `spiel.kategorie` (Vorgabe `KAT_VORGABE`, bestehende Einträge beim Start einsortiert). Intern bleibt `saved.modus`,
  ist aber immer `zocken` mit gewähltem Thema (Start ohne Thema → Party-Bühne); `setModus('party')` von außen (alte Lumia-Variable, OBS-Party-Szene) → Party-Bühne bzw. erstes Party-Thema.
  „party“-Bedingungen (Chat/StreamPrint `*Wann`, Fenster `f*Wann`, Wand-Monitor) gelten jetzt über `artJetzt()` = Thema ohne Spielfenster → party, sonst zocken (Overlays vorne + hinten).
  Tablet: Modus-Knöpfe ausgeblendet, Themen gruppiert (`MM_KATEGORIEN`, Emoji am Namensanfang wird Symbol). Studio: Übersicht mit Schnellwahl nach Kategorien statt Modus, Seite „Was läuft gerade“ gruppiert
  mit Kategorie je Eintrag + Kategorien-Karte; Licht-Seite: Grundlicht kommt vom Thema; OBS-Szenen heißen „mit/ohne Spielfenster“. Weihnachts-Alerts brauchen keinen Zockmodus mehr.
  Geprüft (Headless, alte Daten ohne Kategorien): Einsortierung, Tablet-Gruppen, WoW → Fensterloch, Talk → kein Loch, Studio-Seiten ohne Fehler.
- 27.11.2026: **Kameras überlappend = Bild teilweise verdeckt** (Michael: „Drucker/Schreibtisch nicht richtig einstellbar“): Fensterlöcher wurden per `clip-path: path(evenodd …)` geschnitten → wo sich
  zwei Fenster überlappen (Standard hochkant: Drucker X72 B46 und Schreibtisch X27 B42 überlappen bei 34–48 %), war das Loch wieder zu. Jetzt SVG-Maske (`mask-image` data-URL mit `<mask>`,
  Löcher schwarz → Vereinigung), nur bei Änderung neu gesetzt. Lage/Größe-Einstellungen selbst wirkten (geprüft). Geprüft (Headless, Alpha): Überlappung durchsichtig, außerhalb deckend.
  **Logo-Schalter als Kachel** oben bei „Kameras & Fenster“ (Tablet + Studio-Übersicht), Zustand in `fensterSicht().logo`/`logoMoeglich` (nur wenn Kanal ein Logo hat); Knopf bei den Ansagen entfernt.
- 27.11.2026: **„Fenstereinstellungen (Schreibtisch etc.) verloren“** = Folge von „Kanäle nur Texte“: Nicht-Text-Werte, die früher im Kanal 3dbymicha eingestellt waren, lagen noch in
  `saved.profile['3dbymicha']`, wurden aber ignoriert. Einmalige Übernahme beim Start (`saved.kanalUebernahme1`): fehlt der Wert bei MichaModus → übernehmen; beide gesetzt → Kameras `f2*`/`f3*`
  vom anderen Kanal, Rest bleibt MichaModus; ersetzte Werte in `saved.kanalUebernahmeSicherung`, Liste in `saved.kanalUebernahmeListe` + Container-Log. Geprüft mit nachgebautem Altstand.
- 27.11.2026: **Wand-Monitor ging nicht** (nach Modus-Umbau): Server `monitorMoeglich` prüfte `saved.modus === 'zocken'` (jetzt immer wahr), Overlay prüfte `artJetzt()` → Tablet bot Monitor z. B. auf der Party-Bühne an,
  Overlay zeigte ihn nie. Jetzt gebunden an Hintergründe mit Wand-Bildschirm: `hatBildschirm(sp)` = `sp.wandMonitor` (Studio-Häkchen „Wand-Monitor möglich“) bzw. automatisch bei „zockerbude“ in Video/ID;
  `spielInfo().wandMonitor` → Overlay. `monWann` „zocken“ heißt jetzt „nur bei Hintergründen mit Wand-Bildschirm“. Spielfenster muss aus sein (verdeckt den Bildschirm). Geprüft (Headless).
- 27.11.2026: **Gesamtprüfung nach Modus-Umbau** (Wunsch Michael „alles logisch durchchecken“), Test liegt jetzt im Repo: `werkzeuge/test/` (LIESMICH, OBS-/Hue-Nachbau, `gesamttest.cjs`, 70 Prüfungen). Behoben:
  Server-`fensterSichtbar` nutzte noch `saved.modus` (→ jetzt gleiche Regel wie Overlay: Thema ohne Spielfenster = party); Hintergrundwechsel hart geschnitten (→ `wechselVideo`: zweites `<video id=bgNeu>` 0,8 s einblenden, dann übernehmen);
  Hintergrund ohne eigene Musik behielt Musik des vorigen Themas (→ Standardmusik, wenn `vonSpiel`); OBS-Gaming-Szene bei Talk blieb Talk (→ `saved.letztesMitFenster` bzw. Zockerbude);
  OBS-Echo-Schutz schluckte echte Rückschaltung innerhalb 5 s (→ Echo nur einmal); Tablet-Markierung folgte Umschaltungen von Studio/OBS nicht (→ `spiel:`-Nachricht aktualisiert `.active`).
  Persistenz nach Neustart geprüft (Thema, Musik, Kamera-Knopf, Fensterwerte, Kategorien).
