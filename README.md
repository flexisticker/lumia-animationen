# MichaModus – Live-Animationen für Lumia Stream

Vollbild-Animationen mit Party-Sound für den TikTok-Kanal **MichaModus**, als Custom Overlays für
[Lumia Stream](https://lumiastream.com). Alles ist in Lumia unter **Configs** ein-/ausschaltbar und änderbar.

## Was drin ist

| Overlay | Wo | Inhalt |
|---|---|---|
| **MichaModus – Animationen** | vor dir (oberste Ebene) | 31 Animationen (5 s, mit Ton) für Geschenke, Stufen nach Münzwert, Ereignisse und Aktionsknöpfe · animierter Spendername mit Profilbild und × Zähler · Banner „MichaModus“ mit wechselnden Slogans · Like-Fontäne · Ansagen (Startet gleich, Pause, Gleich geht's weiter, Weiter geht's, Ende) |
| **MichaModus – Hintergrund** | hinter dir (unterste Ebene) | Party-Hintergrund als Schleife + Musikschleife |
| **MichaModus – Aktionszentrale** | auf dem Tablet im Browser | große Knöpfe für Ansagen, Gimmicks, Like-Fontäne, Test aller Geschenke; Namensfeld (z. B. Gewinner) |

Dateien: `medien/animationen/*.mp4` (Animationen), `medien/hintergrund/party-schleife.mp4`, `medien/musik/party-schleife-1.mp3`.
Die fertigen Lumia-Inhalte liegen in `lumia/<overlay>/` – je Reiter eine Datei (1-html, 2-css, 3-js, 4-configs, 5-data).

## Einrichten in Lumia (einmalig)

1. **Overlay anlegen:** Lumia → Overlays → neues Overlay (Hochformat 1080 × 1920) → Ebene **Custom Overlay** hinzufügen.
2. Den Inhalt von `lumia/animationen/1-html.html` in den Reiter **HTML** kopieren, `2-css.css` in **CSS**, `3-js.js` in **JS**,
   `4-configs.json` in **Configs** und `5-data.json` in **Data**. Speichern.
3. Dasselbe für `lumia/hintergrund/` (eigene Ebene **unter** der Kamera) und `lumia/aktionszentrale/` (eigenes Overlay, nur fürs Tablet).
4. **Videos zuordnen** – eine von zwei Möglichkeiten:
   - in den Configs bei jeder Animation „eigenes Video“ die passende Datei aus `medien/animationen/` hochladen, **oder**
   - die Dateien an eine Adresse legen, die der Browser erreicht, und unter *Allgemein & Ton → Adresse der Videos* eintragen
     (Ordner mit `/` am Ende; Dateiname = `<id>.mp4`).
   Im Hintergrund-Overlay Video und Musik hochladen.
5. **Befehl für die Knöpfe:** Lumia → Commands → neuer Chat-Befehl **`mm-aktion`** mit der Aktion
   *Overlay → Inhalt an Custom Overlay senden* (Ziel: Ebene „MichaModus – Animationen“, Inhalt **`{{aktion}}`**).
   Die Aktionszentrale ruft diesen Befehl auf; derselbe Befehl geht auch per Stream Deck oder Lumia-App.
6. **Tablet:** Vorschau-Link des Aktionszentrale-Overlays (`https://overlays.lumiastream.com/overlay/…`) auf dem Tablet öffnen,
   „Zum Startbildschirm hinzufügen“.
7. In OBS bzw. TikTok LIVE Studio die Overlays als Browserquelle einbinden: Hintergrund ganz unten, Kamera (freigestellt), Animationen oben.

## Inhalte, die die Knöpfe senden

`{{aktion}}` ist JSON, z. B. `{"id":"airhorn"}` oder `{"id":"verlosung","name":"Paul"}`.
- Animation: `id` = Name aus `animationen.json` (z. B. `airhorn`, `torjubel`, `rose`, `loewe`)
- Ansagen: `szene:start`, `szene:pause`, `szene:gleich`, `szene:weiter`, `szene:ende`, `szene:aus`
- Like-Fontäne: `likes` (optional `"anzahl": 50`)

## TikTok-Ereignisse

Geschenk (`tiktok-gift`, zuerst nach Name, sonst Stufe nach Münzen × Anzahl), Like (`tiktok-like` → Fontäne),
Follower, Teilen, Superfan, Schatzkiste, Like-Ziel (`tiktok-totalLikes`), Battle-Ende.
Weitere Geschenke ohne eigene Animation: *Allgemein & Ton → Eigene Zuordnung* (`geschenkname = id`).

## Ändern / Erweitern

- Neue Animation: Eintrag in `animationen.json`, Video als `medien/animationen/<id>.mp4`, dann `node werkzeuge/build.mjs`.
- Quelltexte: `overlay/<overlay>/`, nie direkt in `lumia/` ändern (wird überschrieben).
- Lokaler Test: `python3 -m http.server` im Repo, dann `test/harness-animationen.html` bzw. `test/harness-aktion.html`.

Videos und Musik: erzeugt mit fal.ai (MiniMax H3 Max, LTX 2.5, ElevenLabs Music), eigene Motive ohne TikTok-Logos.

## Videos auf Unraid bereitstellen (statt einzeln in Lumia hochladen)

1. Ordner `medien/` dieses Repos nach `\\PowerServer\appdata\michamodus\medien` kopieren.
2. Vorlage `unraid/michamodus-medien.xml` als Container anlegen (Befehl siehe unten), Port 8099.
3. Weil Lumia-Overlays über **https** laufen, braucht der Container eine https-Adresse: in NPM einen Proxy-Host
   (z. B. `medien.flexisticker.de` → `192.168.1.10:8099`, Let's Encrypt, Access List „Nur Heimnetz“) anlegen.
4. In Lumia (Animationen → Allgemein & Ton) **Adresse der Videos** = `https://medien.flexisticker.de/animationen/`;
   Hintergrund-Video/Musik: `https://medien.flexisticker.de/hintergrund/party-schleife.mp4`, `…/musik/party-schleife-1.mp3`.
