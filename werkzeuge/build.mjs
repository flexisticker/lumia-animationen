// Baut aus animationen.json und den Quelldateien die fertigen Lumia-Overlays in lumia/
// Aufruf: node werkzeuge/build.mjs
import fs from 'node:fs';
const R = new URL('..', import.meta.url).pathname;
const read = p => fs.readFileSync(R + p, 'utf8');
const list = JSON.parse(read('animationen.json')).liste;
const GROUP = { geschenk: 'Geschenke', stufe: 'Stufen (alle anderen Geschenke)', ereignis: 'Ereignisse', knopf: 'Aktionsknöpfe' };
const LABEL = {
  rose: 'Rose', gg: 'GG', tiktok: 'TikTok', fingerherz: 'Fingerherz', teamherz: 'Teamherz', donut: 'Donut', parfuem: 'Parfüm',
  handherzen: 'Hand-Herzen', sonnenbrille: 'Sonnenbrille', kanone: 'Konfetti-Kanone', corgi: 'Corgi', kueken: 'Küken',
  galaxie: 'Galaxie', loewe: 'Löwe', universum: 'Universum', 'stufe-klein': 'Stufe klein', 'stufe-mittel': 'Stufe mittel',
  'stufe-gross': 'Stufe groß', 'stufe-episch': 'Stufe episch', folgen: 'Neuer Follower', teilen: 'Live geteilt',
  superfan: 'Superfan', schatzkiste: 'Schatzkiste', likeziel: 'Like-Ziel', 'battle-sieg': 'Battle-Ende', airhorn: 'Airhorn',
  torjubel: 'Torjubel', trommelwirbel: 'Trommelwirbel', applaus: 'Applaus', konfetti: 'Konfetti', verlosung: 'Verlosung',
  fanfare: 'Fanfare', lacher: 'Lacher', wow: 'Wow', rimshot: 'Ba-dum-tss', herzregen: 'Herzregen', partyalarm: 'Party-Alarm'
};
const ICON = { airhorn: '📯', torjubel: '⚽', trommelwirbel: '🥁', applaus: '👏', konfetti: '🎉', verlosung: '🎡', fanfare: '🎺',
  lacher: '😂', wow: '🤩', rimshot: '🥁', herzregen: '💖', partyalarm: '🚨' };
const available = new Set(fs.readdirSync(R + 'medien/animationen').map(f => f.replace(/\.mp4$/, '')));
const items = list.filter(a => available.has(a.id)).map(a => ({ ...a, label: LABEL[a.id] || a.id, datei: a.id + '.mp4' }));

const SLOGANS = [
  'Werde Teil von MichaModus!', 'Folgen & dabei sein 💜', 'Like-Herzen an – wir wollen das Ziel!',
  'Teilen = Liebe zeigen 🔁', 'Willkommen im MichaModus!', 'Hier wird gedruckt, gelacht & gefeiert',
  'Neu hier? Sag Hallo im Chat 👋', 'Jede Rose zählt 🌹', 'MichaModus – einmal drin, nie mehr raus',
];

// ---------- Overlay 1: Animationen ----------
let order = 0;
const cfg = {};
const add = (key, f) => { cfg[key] = { order: ++order, ...f }; };
add('bereich', { type: 'dropdown', label: 'Einstellungen für', value: 'allgemein', options: {
  allgemein: 'Allgemein & Ton', banner: 'Banner & Slogans', name: 'Namens-Einblendung', likes: 'Like-Fontäne', szenen: 'Ansagen (Pause, Weiter …)', geschenk: 'Geschenke',
  stufe: 'Stufen (alle anderen Geschenke)', ereignis: 'Ereignisse', knopf: 'Aktionsknöpfe' } });
const vis = b => ({ visibleIf: { key: 'bereich', equals: [b] } });
add('lautstaerke', { type: 'slider', label: 'Lautstärke gesamt', value: 80, options: { min: 0, max: 100, step: 5, suffix: '%' }, ...vis('allgemein') });
add('medienAdresse', { type: 'input', label: 'Adresse der Videos (Ordner, endet mit /)', value: '', placeholder: 'leer = nur hochgeladene Videos', ...vis('allgemein') });
add('schwarzStaerke', { type: 'slider', label: 'Schwarz entfernen – Stärke', value: 12, options: { min: 0, max: 60, step: 1 }, ...vis('allgemein') });
add('minMuenzen', { type: 'number', label: 'Geschenke erst ab … Münzen zeigen', value: 1, ...vis('allgemein') });
add('comboZusammen', { type: 'checkbox', label: 'Gleiche Geschenke zusammenfassen (× Zähler)', value: true, ...vis('allgemein') });
add('maxWarteschlange', { type: 'number', label: 'Max. Animationen in der Warteschlange', value: 30, ...vis('allgemein') });
add('pauseMs', { type: 'number', label: 'Pause zwischen Animationen (ms)', value: 250, ...vis('allgemein') });
add('eigeneZuordnung', { type: 'textarea', label: 'Eigene Zuordnung (je Zeile: geschenkname = animation)', value: '', rows: 5,
  placeholder: 'lion = loewe\nmoney gun = kanone', ...vis('allgemein') });

add('bannerAn', { type: 'checkbox', label: 'Banner oben anzeigen', value: true, ...vis('banner') });
add('bannerText', { type: 'input', label: 'Banner-Text', value: 'MichaModus', ...vis('banner') });
add('bannerGroesse', { type: 'slider', label: 'Banner-Größe', value: 7, options: { min: 3, max: 14, step: 0.5, suffix: ' vh' }, ...vis('banner') });
add('bannerAbstand', { type: 'slider', label: 'Abstand von oben', value: 3, options: { min: 0, max: 30, step: 0.5, suffix: ' vh' }, ...vis('banner') });
add('bannerFarbe1', { type: 'colorpicker', label: 'Farbe 1', value: '#ff3d7f', ...vis('banner') });
add('bannerFarbe2', { type: 'colorpicker', label: 'Farbe 2', value: '#7c4dff', ...vis('banner') });
add('bannerFarbe3', { type: 'colorpicker', label: 'Farbe 3', value: '#ffd54f', ...vis('banner') });
add('slogansAn', { type: 'checkbox', label: 'Slogans im Wechsel zeigen', value: true, ...vis('banner') });
add('slogans', { type: 'textarea', label: 'Slogans (je Zeile einer)', value: SLOGANS.join('\n'), rows: 8, ...vis('banner') });
add('sloganSekunden', { type: 'number', label: 'Wechsel alle … Sekunden', value: 8, ...vis('banner') });

add('nameAn', { type: 'checkbox', label: 'Namen animiert einblenden', value: true, ...vis('name') });
add('profilbildAn', { type: 'checkbox', label: 'Profilbild zeigen', value: true, ...vis('name') });
add('geschenkText', { type: 'input', label: 'Text unter dem Namen', value: 'schickt {GESCHENK}', ...vis('name') });
add('namePosition', { type: 'slider', label: 'Höhe der Einblendung', value: 62, options: { min: 20, max: 85, step: 1, suffix: ' %' }, ...vis('name') });
add('nameFarbe1', { type: 'colorpicker', label: 'Farbe 1', value: '#ff3d7f', ...vis('name') });
add('nameFarbe2', { type: 'colorpicker', label: 'Farbe 2', value: '#ffb347', ...vis('name') });
add('anzeigeSekunden', { type: 'number', label: 'Dauer ohne Video (Sekunden)', value: 5, ...vis('name') });

add('likeAn', { type: 'checkbox', label: 'Like-Fontäne an', value: true, ...vis('likes') });
add('likePosition', { type: 'dropdown', label: 'Fontäne kommt von', value: 'rechts', options: { links: 'links', mitte: 'Mitte', rechts: 'rechts' }, ...vis('likes') });
add('likeMenge', { type: 'slider', label: 'Herzen je Like', value: 1.5, options: { min: 0.2, max: 5, step: 0.1 }, ...vis('likes') });
add('likeMax', { type: 'number', label: 'Max. Herzen je Schwall', value: 60, ...vis('likes') });
add('likeFarben', { type: 'input', label: 'Farben (Komma-getrennt)', value: '#ff2e63,#ff6fa5,#ff9ec7,#ffd54f,#b388ff', ...vis('likes') });
add('szeneAbdunkeln', { type: 'checkbox', label: 'Bei Pause/Startet gleich/Ende abdunkeln', value: true, ...vis('szenen') });
for (const [k, l, v] of [['szeneStart', 'Live startet gleich', "Live startet gleich! | Schnapp dir was zu trinken"],
  ['szenePause', 'Kurze Pause', "Kurze Pause | Bleib dran – gleich geht's weiter"], ['szeneGleich', "Gleich geht's weiter", "Gleich geht's weiter | Nicht weggehen"],
  ['szeneWeiter', "Weiter geht's", "Weiter geht's! | Schön, dass du noch da bist"], ['szeneEnde', 'Ende', 'Danke & bis bald! | Folg MichaModus, dann verpasst du nichts']])
  add(k, { type: 'input', label: `${l} (Titel | Unterzeile)`, value: v, ...vis('szenen') });
for (const a of items) {
  add('an_' + a.id, { type: 'checkbox', label: `${a.label}: an`, value: true, ...vis(a.gruppe) });
  add('v_' + a.id, { type: 'videoupload', label: `${a.label}: eigenes Video`, value: '', accept: 'video/mp4,video/webm', ...vis(a.gruppe) });
  add('l_' + a.id, { type: 'slider', label: `${a.label}: Lautstärke`, value: 100, options: { min: 0, max: 150, step: 5, suffix: '%' }, ...vis(a.gruppe) });
  if (a.gruppe === 'stufe') add('ab_' + a.id, { type: 'number', label: `${a.label}: ab … Münzen`, value: a.ab, ...vis('stufe') });
}
const data = Object.fromEntries(Object.entries(cfg).map(([k, f]) => [k, f.value ?? '']));
const mmList = items.map(({ id, gruppe, match, ab, datei, label }) => ({ id, gruppe, match, ab, datei, label }));

const out = R + 'lumia/';
fs.mkdirSync(out + 'animationen', { recursive: true });
fs.mkdirSync(out + 'aktionszentrale', { recursive: true });
fs.mkdirSync(out + 'hintergrund', { recursive: true });
const banner = '// Erzeugt von werkzeuge/build.mjs – nicht von Hand ändern\n';
fs.writeFileSync(out + 'animationen/1-html.html', read('overlay/animationen/overlay.html'));
fs.writeFileSync(out + 'animationen/2-css.css', read('overlay/animationen/overlay.css'));
fs.writeFileSync(out + 'animationen/3-js.js', banner + 'window.MM_LIST = ' + JSON.stringify(mmList) + ';\n' + read('overlay/animationen/overlay.js'));
fs.writeFileSync(out + 'animationen/4-configs.json', JSON.stringify(cfg, null, 2));
fs.writeFileSync(out + 'animationen/5-data.json', JSON.stringify(data, null, 2));

// ---------- Overlay 2: Aktionszentrale ----------
const knoepfe = items.filter(a => a.gruppe === 'knopf' || a.gruppe === 'ereignis' || a.gruppe === 'geschenk');
const acfg = {};
let ao = 0;
const aadd = (k, f) => { acfg[k] = { order: ++ao, ...f }; };
aadd('befehl', { type: 'input', label: 'Lumia-Befehl, der die Animation sendet', value: 'mm-aktion' });
aadd('titel', { type: 'input', label: 'Überschrift', value: 'MichaModus · Aktionszentrale' });
aadd('knoepfe', { type: 'textarea', rows: 14, label: 'Knöpfe (je Zeile: Animation | Beschriftung | Symbol)', value:
  knoepfe.filter(a => a.gruppe === 'knopf').map(a => `${a.id} | ${a.label} | ${ICON[a.id] || '✨'}`).join('\n') });
aadd('testKnoepfe', { type: 'checkbox', label: 'Test-Knöpfe für Geschenke und Ereignisse zeigen', value: true });
aadd('nameFeld', { type: 'checkbox', label: 'Feld für Namen (z. B. Gewinner) zeigen', value: true });
fs.writeFileSync(out + 'aktionszentrale/1-html.html', read('overlay/aktionszentrale/overlay.html'));
fs.writeFileSync(out + 'aktionszentrale/2-css.css', read('overlay/aktionszentrale/overlay.css'));
fs.writeFileSync(out + 'aktionszentrale/3-js.js', banner + 'window.MM_TESTS = ' + JSON.stringify(knoepfe.filter(a => a.gruppe !== 'knopf').map(a => ({ id: a.id, label: a.label }))) + ';\n' + read('overlay/aktionszentrale/overlay.js'));
fs.writeFileSync(out + 'aktionszentrale/4-configs.json', JSON.stringify(acfg, null, 2));
fs.writeFileSync(out + 'aktionszentrale/5-data.json', JSON.stringify(Object.fromEntries(Object.entries(acfg).map(([k, f]) => [k, f.value])), null, 2));

// ---------- Overlay 3: Hintergrund ----------
for (const [i, f] of [['1-html.html', 'overlay.html'], ['2-css.css', 'overlay.css'], ['3-js.js', 'overlay.js'], ['4-configs.json', 'configs.json']].map(x => x))
  fs.writeFileSync(out + 'hintergrund/' + i, read('overlay/hintergrund/' + f));
const hcfg = JSON.parse(read('overlay/hintergrund/configs.json'));
fs.writeFileSync(out + 'hintergrund/5-data.json', JSON.stringify(Object.fromEntries(Object.entries(hcfg).map(([k, f]) => [k, f.value ?? ''])), null, 2));
console.log(`Fertig: ${items.length} Animationen, ${Object.keys(cfg).length} Einstellungen`);
