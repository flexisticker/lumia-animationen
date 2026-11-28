// MichaModus Studio – Verwaltung
const $ = (s, el = document) => el.querySelector(s);
const h = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e[k] = v; else if (v !== undefined && v !== null) e.setAttribute(k, v); }
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k)); return e; };
const post = (url, data, raw) => fetch(url, { method: 'POST', headers: raw ? { 'x-mm': '1' } : { 'content-type': 'application/json', 'x-mm': '1' }, body: raw ? data : JSON.stringify(data) });
let S = null, SCHEMA = null, LIST = [];
const page = { id: location.hash.slice(1) || 'start', tab: {} };

async function load() {
  [S, SCHEMA] = await Promise.all([fetch('/api/settings', { cache: 'no-store' }).then(r => r.json()), fetch('/schema/schema.json').then(r => r.json())]);
  LIST = SCHEMA.liste; document.title = S.kanal + ' Studio'; $('.brand b').textContent = 'Live-Studio'; renderNav(); render();
}
const NAV = [
  ['Live', [['start', '🏠', 'Übersicht'], ['geschenke', '🎁', 'Geschenke'], ['test', '🧪', 'Testen'], ['galerie', '🎬', 'Animationen ansehen']]],
  ['Aussehen', [['vorne', '✨', 'Animationen & Einblendungen'], ['hinten', '🖼️', 'Hintergrund & Kameras'], ['spiele', '🎮', 'Was läuft gerade'], ['aktion', '📱', 'Tablet-Steuerung']]],
  ['Verbindungen', [['lumia', '🔌', 'Lumia'], ['obs', '🎥', 'OBS & Fenster-Quellen'], ['licht', '💡', 'Licht (Hue)'], ['sprache', '🗣️', 'Sprachausgabe'], ['dienste', '🧠', 'Server-Dienste (Stream-Pause)'], ['render', '🖥️', 'Render-Server (NDI)'], ['quellen', '🔗', 'Browserquellen für OBS']]],
];
// Ampel je Verbindung (für Menü und Übersicht): ok | warn | err | aus
function ampel(id) {
  if (!S) return 'aus';
  const q = S.quellenListe || [];
  const m = { verbunden: 'ok', verbinde: 'warn', getrennt: 'err', fehler: 'err' };
  if (id === 'lumia') return S.lumia.an ? m[S.status.status] || 'warn' : 'aus';
  if (id === 'obs') return S.obs.an ? m[(S.obsStatus || {}).status] || 'warn' : 'aus';
  if (id === 'licht') return S.hue && S.hue.an && S.hue.gekoppelt ? (S.hue.status === 'fehler' ? 'err' : S.hue.lampen.length ? 'ok' : 'warn') : 'aus';
  if (id === 'dienste') return !DIENSTE || !DIENSTE.einstellungen.an ? 'aus' : DIENSTE.status === 'verbunden' ? 'ok' : 'err';
  if (id === 'sprache') return S.tts && S.tts.schluessel ? (S.tts.stimme ? 'ok' : 'warn') : 'aus';
  if (id === 'quellen') return q.some(x => x.rolle === 'vorne') && q.some(x => x.rolle === 'hinten') ? 'ok' : q.length ? 'warn' : 'err';
  return '';
}
function go(id) { page.id = id; location.hash = id; renderNav(); render(); scrollTo(0, 0); }
function toast(text, art) {
  let t = $('#toast'); if (!t) { t = h('div', { id: 'toast' }); document.body.append(t); }
  t.textContent = text; t.className = 'show ' + (art || ''); clearTimeout(t.tm); t.tm = setTimeout(() => (t.className = ''), 2200);
}
const vorschau = src => src ? src + (src.includes('#') ? '' : '#t=1.2') : src;   // Vorschaubild aus der Mitte statt schwarzem ersten Bild
function renderNav() {
  const nav = $('#nav'); nav.innerHTML = '';
  nav.append(h('a', { class: 'steuer', href: '/aktion' }, '🎛️ Steuerung öffnen'));
  const sel = h('select', { class: 'kanal', onchange: async e => { await post('/api/profil', { profil: e.target.value }); await reload(); renderNav(); } });
  for (const p of S.profile || []) { const o = h('option', { value: p.id }, 'Kanal: ' + p.name); if (p.id === S.profil) o.selected = true; sel.append(o); }
  nav.append(h('div', { class: 'kanalbox' }, sel, h('small', {}, 'Der Kanal ändert nur Texte (Banner, Slogans, Ansagen, Logo, Modus-Namen). Alles andere – Hintergrund, Musik, Licht – gilt für beide und kommt aus „Was läuft gerade“.')));
  for (const [gruppe, eintraege] of NAV) {
    nav.append(h('div', { class: 'gruppe' }, gruppe));
    for (const [id, ico, label] of eintraege) { const a = ampel(id);
      nav.append(h('button', { class: page.id === id ? 'on' : '', onclick: () => go(id) }, h('span', { class: 'ico' }, ico), h('span', { class: 'txt' }, label), a ? h('i', { class: 'dot ' + a, title: { ok: 'verbunden', warn: 'unvollständig', err: 'Problem', aus: 'aus' }[a] }) : null)); }
  }
}
function status(st) {
  const map = { verbunden: ['ok', 'verbunden'], verbinde: ['warn', 'verbinde …'], getrennt: ['err', 'getrennt'], fehler: ['err', 'Fehler'], aus: ['', 'aus'] };
  const [c, t] = map[st.status] || ['', st.status]; return h('span', { class: 'pill ' + c }, 'Lumia: ' + t);
}
function render() {
  const m = $('#main'); m.innerHTML = '';
  if (S.datenDauerhaft === false) m.append(h('div', { class: 'card warnbox' }, h('b', {}, '⚠ Einstellungen werden nicht dauerhaft gespeichert!'),
    h('p', {}, 'Der Container hat keinen Daten-Ordner. Bei jedem Update gehen alle Einstellungen verloren. In Unraid beim Container auf „Edit“ → „Add another Path, Port, Variable…“ → Config Type „Path“, Container Path ', h('code', {}, '/data'), ', Host Path ', h('code', {}, '/mnt/user/appdata/live-studio'), ' → Speichern. Danach einmal alles einstellen – ab dann bleibt es erhalten.')));
  ({ start, lumia: lumiaPage, vorne: () => settingsPage('vorne', 'Animationen & Einblendungen', 'Alles, was vor dir im Bild erscheint.'),
    galerie, hinten: () => settingsPage('hinten', 'Hintergrund, Modi & Kamera-Fenster', 'Alles hinter dir – Hintergründe für beide Modi, Musik, drei Fenster (Spiel, Drucker-Kamera, Schreibtisch) und der Wand-Monitor, durch die man die OBS-Quelle darunter sieht.'),
    aktion: () => settingsPage('aktion', 'Tablet-Steuerung', 'Was auf dem Tablet zu sehen ist.'), test, quellen, spiele: spielePage, obs: obsPage, licht: lichtPage, geschenke: geschenkePage, sprache: sprachePage, dienste: dienstePage, render: renderPage }[page.id] || start)(m);
}
// ---------- Übersicht ----------
function start(m) {
  m.append(h('h1', {}, 'Übersicht'), h('p', { class: 'hint' }, 'Alles auf einen Blick: Was ist verbunden, was ist gerade zu sehen? Rot oder gelb = dort fehlt noch etwas – einfach auf „Einrichten“ tippen.'));
  const q = S.quellenListe || [], zahl = (r, f) => q.filter(x => x.rolle === r && (!f || x.format === f)).length;
  const kachel = (id, ico, titel, text) => { const a = ampel(id);
    return h('div', { class: 'kachel ' + a }, h('div', { class: 'k-kopf' }, h('span', { class: 'ico' }, ico), h('b', {}, titel), h('i', { class: 'dot ' + a })),
      h('div', { class: 'k-text' }, text), h('button', { class: 'b' + (a === 'ok' ? '' : ' p'), onclick: () => go(id) }, a === 'ok' ? 'Öffnen' : 'Einrichten →')); };
  const L = S.status, O = S.obsStatus || {}, H = S.hue || {};
  m.append(h('div', { class: 'kacheln' },
    kachel('lumia', '🔌', 'Lumia (Alerts)', !S.lumia.an ? 'Aus – ohne Lumia kommen keine TikTok-/Twitch-Ereignisse an.' : L.status === 'verbunden' ? 'Verbunden · ' + (L.ereignisse || 0) + ' Ereignisse seit dem Start' : (L.fehler || 'Nicht verbunden')),
    kachel('obs', '🎥', 'OBS', !S.obs.an ? 'Aus – Szenenwechsel und Quellen schalten gehen nur mit OBS-Kopplung.' : O.status === 'verbunden' ? 'Verbunden · Szene „' + (O.aktuell || '?') + '“' : (O.fehler || 'Nicht verbunden')),
    kachel('licht', '💡', 'Licht (Hue)', !H.gekoppelt ? 'Noch nicht gekoppelt.' : !H.an ? 'Gekoppelt, aber aus.' : H.status === 'fehler' ? H.fehler : (H.lampen || []).length + ' Lampe(n) · ' + (H.live ? 'folgt dem Stream' : 'pausiert')),
    kachel('sprache', '🗣️', 'Sprachausgabe', !(S.tts && S.tts.schluessel) ? 'Kein ElevenLabs-Schlüssel – Danke-Stimme ist aus.' : S.tts.stimme ? 'Stimme: ' + (S.tts.stimmeName || S.tts.stimme) : 'Schlüssel da, aber keine Stimme gewählt.'),
    kachel('quellen', '🔗', 'Browserquellen', 'Vorne: ' + zahl('vorne', 'hoch') + ' hoch / ' + zahl('vorne', 'quer') + ' quer · Hinten: ' + zahl('hinten', 'hoch') + ' hoch / ' + zahl('hinten', 'quer') + ' quer · Tablet: ' + zahl('aktion'))));
  // Was läuft gerade (ersetzt den alten Modus): Schnellwahl nach Kategorien
  m.append(h('h2', {}, 'Was läuft gerade'));
  for (const k of [...(S.kategorien || []), { id: null, name: 'Sonstiges', ico: '✨' }]) {
    const eintraege = (S.spiele || []).filter(g => (k.id === null ? !(S.kategorien || []).some(x => x.id === g.kategorie) : g.kategorie === k.id));
    if (!eintraege.length) continue;
    m.append(h('div', { class: 'row' }, h('span', { class: 'hint', style: 'min-width:9em' }, (k.ico || '') + ' ' + k.name),
      ...eintraege.map(g => h('button', { class: 'b' + (S.spiel === g.id ? ' p' : ''), onclick: async () => {
        const r = await post('/api/modus', { modus: 'zocken', spiel: g.id }); const d = await r.json().catch(() => ({})); S.spiel = g.id; render();
        if (d.obs) toast(String(d.obs).startsWith('OK:') ? 'OBS-Szene: ' + d.obs.slice(3) : d.obs, String(d.obs).startsWith('OK:') ? '' : 'warn'); } }, g.name))));
  }
  // Fenster & Kameras wie am Tablet
  const F = S.fensterSicht || {};
  const fk = [['fenster', 1, '🪟 Spielfenster'], ['fenster2', 2, '🖨️ Drucker'], ['fenster3', 3, '🖥️ Schreibtisch']];
  fk.push(['monitor', 'monitor', '📺 Monitor: Unterstützer'], ['monitor-drucker', 'monitor-drucker', '📺 Monitor: Drucker']);
  if (F.logoMoeglich) fk.push(['logo', 'logo', '🏷️ Logo']);
  fk.push(['chat', 'chat', '💬 Chat']); if (F.streamprintMoeglich) fk.push(['streamprint', 'streamprint', '🧾 Bondrucker']);
  if (F.lichtMoeglich) fk.push(['licht', 'licht', '💡 Licht folgt dem Stream']);
  if (F.diensteMoeglich) fk.push(['dienste', 'dienstePause', '🧠 Server-Dienste pausiert']);
  m.append(h('h2', {}, 'Kameras & Fenster'), h('div', { class: 'row' }, ...fk.map(([id, k, l]) => h('button', { class: 'b schalter' + (F[k] ? ' an' : ''), onclick: async () => {
    const r = await post('/api/aktion', { id, label: l }); const d = await r.json().catch(() => ({})); if (d.label) toast(d.label); } }, l, h('small', {}, F[k] ? 'an' : 'aus')))),
    h('p', { class: 'hint' }, 'Welche OBS-Quelle zu welchem Fenster mitgeschaltet wird, stellst du unter ', h('a', { href: '#obs', onclick: e => { e.preventDefault(); go('obs'); } }, 'OBS & Fenster-Quellen'), ' ein.'));
  m.append(h('h2', {}, 'Ansagen'), h('div', { class: 'row' }, ...[['szene:start', '⏳ Startet gleich'], ['szene:pause', '☕ Pause'], ['szene:gleich', '⏱️ Gleich weiter'], ['szene:weiter', "🚀 Weiter geht's"], ['szene:brb', '🚶 BRB'], ['szene:technik', '🛠️ Technik'], ['szene:ende', '👋 Ende'], ['szene:aus', '✖️ Ansage weg'], ['likes', '💗 Like-Fontäne']]
    .map(([id, l]) => h('button', { class: 'b', onclick: () => { post('/api/aktion', { id, label: l }); toast(l); } }, l))));
  m.append(h('h2', {}, 'Letzte Ereignisse'), h('div', { class: 'card log', id: 'log' }, ...(S.log || []).map(logLine)));
}
const logLine = e => h('div', {}, new Date(e.at).toLocaleTimeString('de-DE') + ' · ' + ({ alert: '🎁', aktion: '👆', modus: '🎮', fehler: '⚠️' }[e.art] || '') + ' ' + (e.alert || '') + ' ' + (e.text || '') + (e.quelle ? ' (' + e.quelle + ')' : ''));
// ---------- Render-Server (OBS auf Unraid rechnet die Browserquellen, NDI zum Stream-PC) ----------
async function renderPage(m) {
  const R = await fetch('/api/render').then(r => r.json()).catch(() => ({ formate: [] }));
  const host = h('input', { type: 'text', value: R.host || '', placeholder: 'z. B. 192.168.1.20 (eigene IP des Containers bei br0)' });
  const port = h('input', { type: 'number', value: R.port || 4455 });
  const pw = h('input', { type: 'password', placeholder: R.passwort ? '•••••••• (gespeichert – nur zum Ändern ausfüllen)' : 'wie in der Unraid-Vorlage „OBS-WebSocket-Passwort“' });
  const url = h('input', { type: 'text', value: R.url || '', placeholder: R.basis + ' (leer = diese Adresse)' });
  const fps = h('input', { type: 'number', min: 10, max: 60, value: R.fps || 30 });
  const NAMEN = { 'vorne-hoch': 'Animationen hochkant (TikTok)', 'hinten-hoch': 'Hintergrund hochkant', 'vorne-quer': 'Animationen quer (Twitch)', 'hinten-quer': 'Hintergrund quer' };
  const boxen = Object.keys(NAMEN).map(f => { const c = h('input', { type: 'checkbox', value: f, ...((R.formate || []).includes(f) ? { checked: '' } : {}) }); return [f, c]; });
  const ausgabe = h('div', { class: 'card log', style: 'display:none' });
  const speichern = () => post('/api/render', { host: host.value, port: port.value, passwort: pw.value, url: url.value, fps: fps.value, formate: boxen.filter(([, c]) => c.checked).map(([f]) => f) });
  m.append(h('h1', {}, 'Render-Server (NDI)'),
    h('p', { class: 'hint' }, 'Statt dass OBS auf deinem PC die Animationen und den Hintergrund berechnet, macht das ein unsichtbares OBS auf dem Unraid-Server (Container „live-studio-renderer“). Es schickt das fertige Bild mit Durchsichtigkeit und Ton per NDI an dein OBS. Dein PC zeigt es nur noch an – das entlastet ihn, wenn ein Spiel die Grafikkarte auslastet.'),
    h('div', { class: 'card' },
      field('Adresse des Render-Servers', host), field('OBS-WebSocket-Port', port), field('Passwort', pw),
      field('Adresse von Live-Studio (aus Sicht des Render-Servers)', url),
      field('Bilder pro Sekunde', fps),
      h('div', {}, h('b', {}, 'Welche Bilder?'), ...boxen.map(([f, c]) => h('label', { class: 'row' }, c, ' ' + NAMEN[f] + ' → NDI „Live-Studio ' + f.replace('-', ' ') + '“'))),
      h('p', { class: 'hint' }, 'Nur anhaken, was du wirklich nutzt – jedes Bild braucht etwa 120–150 Mbit/s im Netzwerk (Kabel, kein WLAN).'),
      h('div', { class: 'row' },
        h('button', { class: 'b', onclick: async () => { await speichern(); pw.value = ''; toast('✓ Gespeichert'); } }, 'Speichern'),
        h('button', { class: 'b p', onclick: async () => { await speichern(); pw.value = ''; ausgabe.style.display = ''; ausgabe.textContent = 'richte ein …';
          const r = await post('/api/render/einrichten', {}).then(x => x.json()); ausgabe.innerHTML = '';
          ausgabe.append(h('div', {}, r.ok ? '✓ Eingerichtet' : '⚠️ ' + r.fehler), ...(r.log || []).map(l => h('div', {}, l))); } }, 'Render-Server einrichten'),
        h('button', { class: 'b', onclick: async () => { const r = await post('/api/render/neuladen', {}).then(x => x.json()); toast(r.ok ? 'Quellen im Render-Server neu geladen' : r.fehler, r.ok ? '' : 'warn'); } }, '↻ Quellen neu laden'),
        h('button', { class: 'b', onclick: async () => { if (!confirm('Render-Server (OBS auf Unraid) neu starten? Das NDI-Bild ist dabei ca. 20 Sekunden weg.')) return;
          const r = await post('/api/render/neustart', {}).then(x => x.json()); toast(r.ok ? 'Render-Server startet neu (ca. 20 s)' : r.fehler, r.ok ? '' : 'warn'); } }, '⟳ Render-Server neu starten'))),
    ausgabe,
    h('h2', {}, 'In deinem OBS (Stream-PC)'),
    h('div', { class: 'card' }, ...[
      '1. Plugin „DistroAV“ installieren (kostenlos, github.com/DistroAV/DistroAV) – es bringt die NDI-Laufzeit mit.',
      '2. Server und PC sind in verschiedenen Netzen: „NDI Access Manager“ (aus den kostenlosen NDI Tools) öffnen → Remote Sources → die Adresse des Render-Servers eintragen.',
      '3. In jeder Szene die Live-Studio-Browserquelle ausblenden und an derselben Stelle eine Quelle „NDI™ Source“ mit dem passenden Namen „… (Live-Studio vorne hoch)“ usw. hinzufügen (gleiche Größe, gleiche Ebene).',
      '4. Ton: Die NDI-Quelle bringt den Ton mit – die alten Browserquellen ausgeblendet lassen, sonst kommt er doppelt.',
      '5. Zurück jederzeit: NDI-Quelle aus-, Browserquelle einblenden.'].map(t => h('p', {}, t))));
}
// ---------- Server-Dienste: während des Streams anhalten ----------
let DIENSTE = null;
fetch('/api/dienste').then(r => r.json()).then(d => { DIENSTE = d; if (S) renderNav(); }).catch(() => {});
function dienstePage(m) {
  const D = DIENSTE || { einstellungen: {}, liste: [] }, E = D.einstellungen || {};
  const an = h('input', { type: 'checkbox', ...(E.an ? { checked: '' } : {}) });
  const docker = h('input', { type: 'text', value: E.docker || '/var/run/docker.sock' });
  const ausl = h('select', {}, ...[['stream', 'Automatisch, wenn OBS streamt'], ['stream+vcam', 'Automatisch, wenn OBS streamt oder die virtuelle Kamera läuft (TikTok LIVE Studio)'], ['hand', 'Nur per Knopf']]
    .map(([v, l]) => h('option', { value: v, ...(E.ausloeser === v ? { selected: '' } : {}) }, l)));
  const auch = h('textarea', { rows: 3 }, (E.auch || []).join('\n'));
  const nie = h('textarea', { rows: 2 }, (E.nie || []).join('\n'));
  const zur = h('input', { type: 'number', min: 0, max: 120, value: E.zurueckMin ?? 2 });
  const speichern = async () => { const r = await post('/api/dienste', { an: an.checked, docker: docker.value, ausloeser: ausl.value, auch: auch.value, nie: nie.value, zurueckMin: zur.value });
    DIENSTE = await r.json(); toast('✓ Gespeichert'); renderNav(); render(); };
  m.append(h('h1', {}, 'Server-Dienste (Stream-Pause)'),
    h('p', { class: 'hint' }, 'Während du streamst, werden Dienste auf dem Server gestoppt, die die Grafikkarte nutzen (z. B. Ollama), und solche, deren Name ein Wort aus der Liste enthält (Mail-Sortierer, Protokoll …). Nach dem Stream startet Live-Studio genau diese wieder. Live-Studio selbst wird nie gestoppt.'),
    h('div', { class: 'card' },
      h('label', { class: 'row' }, an, ' Stream-Pause einschalten'),
      field('Wann anhalten', ausl),
      field('Nach dem Stream wieder starten nach … Minuten', zur),
      field('Zusätzlich stoppen: Container, deren Name eines dieser Wörter enthält (je Zeile eins)', auch),
      field('Nie stoppen (genaue Container-Namen, je Zeile einer)', nie),
      field('Docker-Zugang', docker),
      h('p', { class: 'hint' }, 'In Unraid beim Live-Studio-Container einen Pfad hinzufügen: Container-Pfad und Host-Pfad je /var/run/docker.sock. Live-Studio nutzt ihn nur zum Auflisten, Stoppen und Starten.'),
      h('div', { class: 'row' }, h('button', { class: 'b p', onclick: speichern }, 'Speichern'))),
    h('h2', {}, 'Status'),
    h('div', { class: 'card' },
      h('p', {}, !E.an ? 'Aus.' : D.status === 'verbunden' ? (D.pause ? '⏸️ Dienste sind angehalten' + (D.zurueckUm ? ' – starten wieder um ' + new Date(D.zurueckUm).toLocaleTimeString('de-DE') : '') + '.' : '▶️ Dienste laufen normal.') + (D.obsLive ? ' OBS ist live.' : '') : '⚠️ ' + (D.fehler || 'Docker nicht erreichbar')),
      h('div', { class: 'row' },
        h('button', { class: 'b', onclick: async () => { const r = await post('/api/aktion', { id: 'dienste', an: true }); toast((await r.json()).label); } }, '⏸️ Jetzt anhalten'),
        h('button', { class: 'b', onclick: async () => { const r = await post('/api/aktion', { id: 'dienste', an: false }); toast((await r.json()).label); } }, '▶️ Wieder starten'),
        h('button', { class: 'b', onclick: async () => { DIENSTE = await fetch('/api/dienste').then(r => r.json()); render(); } }, '↻ Neu einlesen')),
      ...(D.liste || []).filter(c => c.stoppen || c.vonUns).map(c => h('div', {}, (c.laeuft ? '🟢 ' : '⚪ ') + c.name + ' · ' + [c.gpu && 'nutzt die Grafikkarte', c.wort && 'Name in der Liste', c.vonUns && 'von Live-Studio gestoppt'].filter(Boolean).join(', '))),
      (D.liste || []).some(c => c.stoppen) || !E.an ? '' : h('p', { class: 'hint' }, 'Kein passender Container gefunden.')));
}
// ---------- Sprachausgabe (ElevenLabs) ----------
function sprachePage(m) {
  const T = S.tts || {};
  m.append(h('h1', {}, 'Sprachausgabe (Danke)'), h('p', { class: 'hint' }, 'Bei Geschenken, Follows, Subs, Bits und Raids sagt eine Stimme „Danke …“ mit dem Namen. Die Stimme kommt von deinem ElevenLabs-Konto. Der Schlüssel bleibt nur auf deinem Server. Die Texte stellst du unter „Animationen & Einblendungen → Sprachausgabe (Danke)“ ein und schaltest sie dort an.'));
  const key = h('input', { type: 'password', placeholder: T.schluessel ? '•••••••• (gespeichert – nur zum Ändern ausfüllen)' : 'API-Schlüssel aus ElevenLabs (Profil → API Keys)' });
  const stimme = h('select', {}, h('option', { value: T.stimme || '' }, T.stimme ? (T.stimmeName || T.stimme) : '– erst Stimmen laden –'));
  const modell = h('select', {}, ...[['eleven_multilingual_v2', 'Multilingual v2 (beste Qualität)'], ['eleven_flash_v2_5', 'Flash v2.5 (schnell, günstig)'], ['eleven_turbo_v2_5', 'Turbo v2.5']]
    .map(([v, l]) => h('option', { value: v, ...(T.modell === v ? { selected: '' } : {}) }, l)));
  const stabil = h('input', { type: 'range', min: 0, max: 100, value: T.stabil ?? 50 }), aehnlich = h('input', { type: 'range', min: 0, max: 100, value: T.aehnlich ?? 75 });
  const info = h('span', { class: 'hint' }, '');
  const probe = h('audio', { controls: '', style: 'width:100%;margin-top:8px' });
  const testText = h('input', { type: 'text', value: 'Danke Sandra für 5 Rosen! Willkommen im MichaModus!' });
  const speichern = () => post('/api/tts/einstellungen', { schluessel: key.value, stimme: stimme.value, stimmeName: stimme.selectedOptions[0] ? stimme.selectedOptions[0].textContent : '', modell: modell.value, stabil: stabil.value, aehnlich: aehnlich.value });
  const laden = async () => { info.textContent = 'lädt …'; if (key.value) await speichern();
    const r = await fetch('/api/tts/stimmen'); const d = await r.json();
    if (!r.ok) { info.textContent = d.fehler || 'Fehler'; return; }
    stimme.innerHTML = ''; d.stimmen.forEach(v => stimme.append(h('option', { value: v.id, ...(v.id === T.stimme ? { selected: '' } : {}) }, v.name + (v.sprache ? ' · ' + v.sprache : '') + (v.art ? ' (' + v.art + ')' : ''))));
    info.textContent = d.stimmen.length + ' Stimmen geladen'; };
  m.append(h('div', { class: 'card' },
    field('ElevenLabs-Schlüssel', key), h('div', { class: 'row' }, h('button', { class: 'b', onclick: laden }, 'Stimmen laden'), info),
    field('Stimme', stimme),
    field('… oder Stimmen-ID von Hand (aus ElevenLabs → Voices → „ID kopieren“)', h('input', { type: 'text', placeholder: 'z. B. 21m00Tcm4TlvDq8ikWAM', oninput: e => { const v = e.target.value.trim(); if (!v) return; let o = [...stimme.options].find(x => x.value === v); if (!o) { o = h('option', { value: v }, 'Eigene ID: ' + v); stimme.append(o); } stimme.value = v; } })),
    field('Modell', modell), field('Stabilität (links = lebendiger)', stabil), field('Ähnlichkeit zur Stimme', aehnlich),
    h('div', { class: 'row', style: 'margin-top:12px' },
      h('button', { class: 'b p', onclick: async () => { await speichern(); key.value = ''; info.textContent = 'gespeichert'; S = await fetch('/api/settings').then(r => r.json()); } }, 'Speichern'),
      T.schluessel ? h('button', { class: 'b', onclick: async () => { if (confirm('Schlüssel löschen?')) { await post('/api/tts/einstellungen', { schluesselLoeschen: true }); await reload(); } } }, 'Schlüssel löschen') : null)),
    h('div', { class: 'card' }, h('b', {}, 'Probe'), field('Text', testText),
      h('div', { class: 'row' }, h('button', { class: 'b', onclick: async () => { await speichern(); key.value = ''; info.textContent = 'erzeugt …';
        const r = await post('/api/tts', { text: testText.value }); const d = await r.json();
        if (!r.ok) { info.textContent = d.fehler || 'Fehler'; return; } info.textContent = ''; probe.src = d.url; probe.play(); } }, '▶ Probe anhören')), probe),
    h('p', { class: 'hint' }, 'Kosten: ElevenLabs rechnet nach Zeichen ab. Gleiche Sätze (z. B. „Danke fürs Folgen, Anna!“) werden zwischengespeichert und nicht erneut berechnet.'));
}
// ---------- Lumia ----------
function lumiaPage(m) {
  const L = S.lumia;
  m.append(h('h1', {}, 'Lumia-Verbindung'), h('p', { class: 'hint' }, 'Das Studio holt sich die TikTok-Ereignisse direkt aus Lumia Stream auf deinem Stream-PC.'));
  const host = h('input', { type: 'text', value: L.host || '', placeholder: 'z. B. 192.168.175.20' });
  const port = h('input', { type: 'number', value: L.port || 39231 });
  const key = h('input', { type: 'password', placeholder: L.schluessel ? '•••••••• (gespeichert – nur zum Ändern ausfüllen)' : 'API-Schlüssel aus Lumia' });
  const an = h('input', { type: 'checkbox' }); an.checked = !!L.an;
  m.append(h('div', { class: 'card' },
    field('Verbindung an', an), field('IP-Adresse des Stream-PCs', host), field('Port', port), field('API-Schlüssel', key),
    h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: 'b p', onclick: async () => {
      await post('/api/lumia', { host: host.value, port: port.value, an: an.checked, schluessel: key.value }); key.value = ''; await reload(); } }, 'Speichern & verbinden'),
      L.schluessel ? h('button', { class: 'b', onclick: async () => { if (confirm('Schlüssel löschen?')) { await post('/api/lumia', { ...L, schluesselLoeschen: true }); await reload(); } } }, 'Schlüssel löschen') : null,
      status(S.status)),
    S.status.fehler ? h('p', { class: 'hint' }, S.status.fehler) : null));
  m.append(h('div', { class: 'card' }, h('b', {}, 'So richtest du Lumia ein'), h('ol', {},
    h('li', {}, 'Lumia → Einstellungen → API → „Enable Developers API“ anhaken und den Schlüssel (Token) kopieren.'),
    h('li', {}, 'Dort den Zugriff aus dem Netzwerk (LAN-Zugriff) erlauben und Lumia neu starten.'),
    h('li', {}, 'In der Windows-Firewall eingehend Port 39231 (TCP) für Lumia erlauben.'),
    h('li', {}, 'Hier IP-Adresse des PCs, Port und Schlüssel eintragen, „Verbindung an“ und speichern. Lumia zeigt dann „MichaModus Studio verbunden“.'))));
}
// ---------- Einstellungsseiten aus dem Schema ----------
function field(label, input, extra) { return h('div', { class: 'f' }, h('label', {}, label), h('div', {}, input, extra || null)); }
let pending = {}, timer = null;
function queueSave(bereich, key, value) {
  (pending[bereich] ||= {})[key] = value; S[bereich][key] = value; $('#save').classList.add('show');
  clearTimeout(timer); timer = setTimeout(async () => { const p = pending; pending = {}; const r = await post('/api/settings', p); $('#save').classList.remove('show'); toast(r.ok ? '✓ Gespeichert' : 'Speichern fehlgeschlagen', r.ok ? '' : 'warn'); }, 600);
}
function control(bereich, key, f) {
  const v = S[bereich][key];
  const set = val => queueSave(bereich, key, val);
  switch (f.type) {
    case 'checkbox': { const i = h('input', { type: 'checkbox' }); i.checked = !!v; i.onchange = () => set(i.checked); return i; }
    case 'textarea': { const i = h('textarea', { rows: f.rows || 4, placeholder: f.placeholder || '' }); i.value = v ?? ''; i.oninput = () => set(i.value); return i; }
    case 'number': { const i = h('input', { type: 'number', value: v ?? '' }); i.oninput = () => set(i.value === '' ? '' : Number(i.value)); return i; }
    case 'colorpicker': { const i = h('input', { type: 'color', value: v || '#ffffff' }); i.oninput = () => set(i.value); return i; }
    case 'dropdown': { const i = h('select'); for (const [k, l] of Object.entries(f.options || {})) { const o = h('option', { value: k }, l); if (k === v) o.selected = true; i.append(o); } i.onchange = () => set(i.value); return i; }
    case 'slider': { const o = f.options || {}; const i = h('input', { type: 'range', min: o.min ?? 0, max: o.max ?? 100, step: o.step ?? 1, value: v ?? 0 });
      const val = h('span', { class: 'val' }, (v ?? 0) + (o.suffix || '')); i.oninput = () => { val.textContent = i.value + (o.suffix || ''); set(Number(i.value)); }; return h('span', {}, i, val); }
    case 'videoupload': case 'soundupload': case 'imageupload': return mediaControl(bereich, key, f, v);
    default: { const i = h('input', { type: 'text', value: v ?? '', placeholder: f.placeholder || '' }); i.oninput = () => set(i.value); return i; }
  }
}
function mediaControl(bereich, key, f, v) {
  const isVideo = f.type === 'videoupload';
  const fallback = bereich !== 'vorne' ? '' : key.startsWith('vq_') ? S.vorne.medienAdresse + key.slice(3) + '-quer.mp4' : key.startsWith('v_') ? S.vorne.medienAdresse + key.slice(2) + '.mp4' : '';
  const src = v || fallback;
  const prev = f.type === 'imageupload' && src ? h('img', { src, alt: '', class: 'bildvor' }) : isVideo && src ? h('video', { src: vorschau(src), muted: '', preload: 'metadata', onclick: e => { e.target.muted = !e.target.muted; e.target.currentTime = 0; e.target.play(); } }) : null;
  const file = h('input', { type: 'file', accept: f.accept || (isVideo ? 'video/*' : f.type === 'imageupload' ? 'image/*' : 'audio/*'), style: 'display:none' });
  const info = h('code', {}, v ? v : (fallback ? 'Standard: ' + fallback : 'keine Datei'));
  file.onchange = async () => { const fl = file.files[0]; if (!fl) return; info.textContent = 'lädt hoch …';
    const r = await post(`/api/upload/${bereich}/${key}?name=${encodeURIComponent(fl.name)}`, fl, true);
    if (r.ok) { await reload(); } else info.textContent = 'Fehler beim Hochladen'; };
  return h('div', { class: 'media' }, prev, info, h('button', { class: 'b', onclick: () => file.click() }, 'Eigene Datei …'),
    v ? h('button', { class: 'b', onclick: async () => { await post('/api/settings', { [bereich]: { [key]: '' } }); await reload(); } }, 'Standard') : null, file);
}
function settingsPage(bereich, title, hint) {
  const m = $('#main'); const schema = SCHEMA[bereich];
  m.append(h('h1', {}, title), h('p', { class: 'hint' }, hint, ' Änderungen gelten sofort in der Browserquelle.'));
  if (bereich === 'hinten' || bereich === 'vorne') {
    // Welche Browserquellen sind gerade verbunden – und in welchem Format? (Hochkant = TikTok, Quer = Twitch)
    const ql = (S.quellenListe || []).filter(q => q.rolle === bereich);
    const hoch = ql.filter(q => q.format === 'hoch').length, quer = ql.filter(q => q.format === 'quer').length;
    const o = location.origin;
    m.append(h('div', { class: 'card' }, h('b', {}, 'Verbundene Quellen „' + bereich + '“: '),
      h('span', { class: 'pill ' + (hoch ? 'ok' : '') }, 'Hochkant (TikTok): ' + hoch), ' ', h('span', { class: 'pill ' + (quer ? 'ok' : '') }, 'Quer (Twitch): ' + quer),
      ...ql.map(q => h('div', { class: 'hint' }, '• ' + q.pfad + ' – ' + q.groesse + ' → ' + (q.format === 'quer' ? 'Quer' : 'Hochkant'))),
      h('p', { class: 'hint' }, 'TikTok-Quelle in OBS/LIVE Studio: ', h('code', {}, o + '/quelle/' + bereich + '-hoch'), ' · Twitch-Quelle: ', h('code', {}, o + '/quelle/' + bereich + '-quer'),
        '. Nur so bekommen beide Quellen ihre eigenen Einstellungen.')));
  }
  const groupField = schema.bereich;
  let fields = Object.entries(schema).filter(([k]) => k !== 'bereich').sort((a, b) => (a[1].order || 0) - (b[1].order || 0));
  if (groupField) {
    const cur = page.tab[bereich] || groupField.value;
    m.append(h('div', { class: 'tabs' }, ...Object.entries(groupField.options).map(([k, l]) => h('button', { class: k === cur ? 'on' : '', onclick: () => { page.tab[bereich] = k; render(); } }, l))));
    fields = fields.filter(([, f]) => !f.visibleIf || [].concat(f.visibleIf.equals).includes(cur));
  }
  // Warnung: Reiter für ein Format, für das gerade keine Quelle verbunden ist (häufigster Grund für „es ändert sich nichts“)
  if (bereich === 'hinten' && /^f[123]q?$/.test(page.tab[bereich] || '')) {
    const t = page.tab[bereich], quer = t.endsWith('q'), ql = (S.quellenListe || []).filter(q => q.rolle === 'hinten');
    const passend = ql.filter(q => q.format === (quer ? 'quer' : 'hoch')).length, andere = ql.length - passend;
    if (!passend) m.append(h('div', { class: 'card warnbox' }, h('b', {}, '⚠ Keine ' + (quer ? 'Quer-' : 'Hochkant-') + 'Quelle verbunden'),
      h('p', {}, 'Änderungen in diesem Reiter siehst du nur in einer Quelle mit der Adresse ', h('code', {}, location.origin + '/quelle/hinten-' + (quer ? 'quer' : 'hoch')), '. ',
        andere ? 'Deine verbundene Quelle ist ' + (quer ? 'hochkant' : 'quer') + ' – stell im Reiter „' + (quer ? t.slice(0, 2) === 'f1' ? 'Spielfenster – TikTok (hochkant)' : 'Fenster 2 – hochkant' : t === 'f1' ? 'Spielfenster – Twitch (quer)' : 'Fenster 2 – quer') + '“ ein oder ändere in OBS die Adresse der Quelle.' : 'Gerade ist gar keine Hintergrund-Quelle verbunden (OBS offen?).')));
  }
  if (bereich === 'hinten' && /^f[123]q?$/.test(page.tab[bereich] || '')) {
    const k = { 1: 'spiel', 2: 'drucker', 3: 'schreibtisch' }[page.tab[bereich][1]], q = String((S.obs.quellen || {})[k] || '').split('\n').filter(Boolean).join(' + ');
    m.append(h('div', { class: 'card info' }, '🎥 OBS-Quelle(n) zu diesem Fenster: ', q ? h('b', {}, q) : h('i', {}, 'keine – Fenster blendet nur den Hintergrund aus'), ' ',
      h('button', { class: 'b', onclick: () => go('obs') }, q ? 'ändern' : 'Quelle zuordnen →')));
  }
  const card = h('div', { class: 'card' }); for (const [k, f] of fields) card.append(field(f.label, control(bereich, k, f)));
  m.append(card, h('div', { class: 'row' }, h('button', { class: 'b', onclick: async () => { if (confirm('Alle Einstellungen dieses Bereichs auf Standard zurücksetzen?')) { await post('/api/settings', { reset: bereich }); await reload(); } } }, 'Alles auf Standard')));
}
// ---------- Spiele & OBS ----------
function obsStatusPill(st) {
  const map = { verbunden: ['ok', 'verbunden'], verbinde: ['warn', 'verbinde …'], getrennt: ['err', 'getrennt'], fehler: ['err', 'Fehler'], aus: ['', 'aus'] };
  const [c, t] = map[(st || {}).status] || ['', '?']; return h('span', { class: 'pill ' + c }, 'OBS: ' + t + (st && st.aktuell ? ' · Szene „' + st.aktuell + '“' : ''));
}
function sceneSelect(value, onchange, leer) {
  const sel = h('select', { onchange: e => onchange(e.target.value) });
  sel.append(h('option', { value: '' }, leer));
  const list = [...new Set([...(S.obsStatus.szenen || []), value].filter(Boolean))];
  for (const n of list) { const o = h('option', { value: n }, n); if (n === value) o.selected = true; sel.append(o); }
  return sel;
}
function obsPage(m) {
  const O = { ...S.obs };
  m.append(h('h1', {}, 'OBS & Fenster-Quellen'), h('p', { class: 'hint' }, 'OBS-Szene wechseln = Modus wechselt automatisch. Modus/Spiel am Tablet = OBS springt in die passende Szene. Und: Fenster auf/zu = die zugehörige OBS-Quelle wird mit ein-/ausgeschaltet.'));
  const host = h('input', { type: 'text', value: O.host || '', placeholder: 'IP des Stream-PCs, z. B. 192.168.175.20' });
  const port = h('input', { type: 'number', value: O.port || 4455 });
  const pw = h('input', { type: 'password', placeholder: O.passwort ? '•••••••• (gespeichert – nur zum Ändern ausfüllen)' : 'Passwort aus OBS' });
  const an = h('input', { type: 'checkbox' }); an.checked = !!O.an;
  const folgen = h('input', { type: 'checkbox' }); folgen.checked = O.folgen !== false;
  const steuern = h('input', { type: 'checkbox' }); steuern.checked = O.steuern !== false;
  let sz = O.szeneZocken || '', sp = O.szeneParty || '';
  const verbunden = (S.obsStatus || {}).status === 'verbunden';
  // 1. Fenster ↔ Quellen (zuerst, weil man das am häufigsten sucht) – speichert sofort
  const qu = { spiel: '', drucker: '', schreibtisch: '', monitor: '', ...(O.quellen || {}) };
  const F = S.fensterSicht || {};
  const dl = h('datalist', { id: 'obs-quellen' }, ...(S.obsStatus.quellen || []).map(n => h('option', { value: n })));
  // Je Fenster mehrere OBS-Quellen (z. B. Hauptbild + eigene Quelle fürs Hochkant-Bild) – alle schalten gemeinsam
  const zeile = (k, ico, name, sicht) => {
    const namen = () => String(qu[k] || '').split('\n').map(x => x.trim()).filter(Boolean);
    const box = h('div', {});
    const speichern = async liste => { qu[k] = liste.join('\n'); const r = await post('/api/obs/quellen', { quellen: { [k]: qu[k] } });
      if (r.ok) { S.obs.quellen = (await r.json()).quellen; toast(liste.length ? name + ': ' + liste.map(x => '„' + x + '“').join(' + ') : name + ': keine OBS-Quelle mehr'); } zeichnen(); };
    const zeichnen = () => {
      box.innerHTML = '';
      const liste = namen(), bekannt = S.obsStatus.quellen || [];
      for (const [j, n] of liste.entries()) {
        const unbekannt = verbunden && bekannt.length && !bekannt.includes(n);
        box.append(h('div', { class: 'row', style: 'gap:6px;align-items:center;margin-bottom:4px' }, h('span', { class: 'pill' + (unbekannt ? '' : ' ok') }, n), j === 0 && k !== 'monitor' ? h('span', { class: 'hint' }, 'Hauptquelle (Lage & Größe)') : null,
          unbekannt ? h('span', { class: 'hint warntext' }, '⚠ gibt es in OBS nicht') : null,
          h('button', { class: 'b', title: 'Entfernen', onclick: () => speichern(liste.filter((_, x) => x !== j)) }, '✕')));
      }
      const i = h('input', { type: 'text', list: 'obs-quellen', placeholder: liste.length ? '+ weitere Quelle (z. B. fürs Hochkant-Bild) …' : (verbunden ? 'Quelle wählen oder Namen tippen …' : 'Namen der OBS-Quelle genau wie in OBS tippen') });
      const dazu = () => { const v = i.value.trim(); if (v && !liste.includes(v)) speichern([...liste, v]); };
      i.onchange = dazu; i.onkeydown = e => { if (e.key === 'Enter') dazu(); };
      box.append(i);
    };
    zeichnen();
    return h('div', { class: 'qzeile' }, h('div', { class: 'qname' }, h('span', { class: 'ico' }, ico), h('b', {}, name), h('span', { class: 'pill ' + (sicht ? 'ok' : '') }, sicht ? 'gerade zu' + ' sehen' : 'zu')), box);
  };
  m.append(h('h2', {}, 'Welche OBS-Quelle gehört zu welchem Fenster?'), h('div', { class: 'card' }, dl,
    h('p', { class: 'hint' }, 'Ist ein Fenster zu, werden alle eingetragenen Quellen in OBS ausgeblendet (in allen Szenen und Gruppen, in denen sie vorkommen) – und beim Öffnen wieder eingeblendet. Mehrere Quellen je Fenster möglich, z. B. Hauptbild + eigene Quelle fürs Hochkant-Bild. Spart Rechenleistung, z. B. bei Kameras. Leer lassen = nicht mitschalten. Wird sofort gespeichert.'),
    h('label', { class: 'row', style: 'gap:8px;align-items:center;margin:6px 0 10px' }, h('input', { type: 'checkbox', ...(S.obs.lage !== false ? { checked: '' } : {}), onchange: async e => { await post('/api/obs/quellen', { lage: e.target.checked }); S.obs.lage = e.target.checked; toast(e.target.checked ? 'Lage & Größe werden in OBS mitgeführt' : 'Lage & Größe nicht mehr mitführen'); } }),
      h('span', {}, h('b', {}, 'Lage & Größe in OBS mitführen'), ' – Spiel, Drucker und Schreibtisch werden in OBS genau in ihr Fenster gesetzt (Breite/Höhe/Mitte aus „Hintergrund & Kameras“). Aus = du stellst die Quellen in OBS selbst ein.')),
    zeile('spiel', '🪟', 'Spielfenster', F[1]), zeile('drucker', '🖨️', 'Drucker-Kamera', F[2]), zeile('schreibtisch', '🖥️', 'Schreibtisch-Kamera', F[3]), zeile('monitor', '📺', 'Drucker im Wand-Monitor', F['monitor-drucker']),
    !verbunden ? h('p', { class: 'hint warntext' }, 'OBS ist gerade nicht verbunden – deshalb gibt es keine Auswahlliste. Du kannst die Namen trotzdem eintippen, geschaltet wird sobald OBS verbunden ist.') : null));
  m.append(h('h2', {}, 'Verbindung & Szenen'), h('div', { class: 'card' },
    field('Verbindung an', an), field('IP-Adresse des Stream-PCs', host), field('Port', port), field('Passwort', pw),
    field('Szene für Hintergründe mit Spielfenster (Spiele, Werkstatt)', sceneSelect(sz, v => (sz = v), '– automatisch (Name enthält „Gaming“, „Zock“ …) –')),
    field('Szene für Hintergründe ohne Spielfenster (Talk, Party, Specials)', sceneSelect(sp, v => (sp = v), '– automatisch (Name enthält „Party“, „Chat“ …) –')),
    field('OBS-Szene schaltet den Hintergrund', folgen), field('Hintergrund schaltet die OBS-Szene', steuern),
    h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: 'b p', onclick: async () => {
      await post('/api/obs', { host: host.value, port: port.value, an: an.checked, passwort: pw.value, szeneZocken: sz, szeneParty: sp, folgen: folgen.checked, steuern: steuern.checked, quellen: qu });
      pw.value = ''; toast('Gespeichert – verbinde mit OBS …'); setTimeout(reload, 1500); } }, 'Speichern & verbinden'), obsStatusPill(S.obsStatus)),
    S.obsStatus.fehler ? h('p', { class: 'hint warntext' }, S.obsStatus.fehler) : null,
    h('p', { class: 'hint' }, 'In OBS: Werkzeuge → WebSocket-Server-Einstellungen → „WebSocket-Server aktivieren“, Port 4455, Passwort festlegen (dort auch „Verbindungsinfo anzeigen“). Die Szenen-Listen füllen sich nach dem Verbinden. Eigene Szene je Spiel stellst du unter „Spiele“ ein.')));
}
function spielePage(m) {
  m.append(h('h1', {}, 'Was läuft gerade'), h('p', { class: 'hint' }, 'Spiele und Themen (z. B. Party-Bühne, Zockerbude, Werkstatt, Weihnachten): je eins mit eigenem Hintergrund für Hoch- und Querformat, Musik, Geräuschen, Hue-Licht und auf Wunsch eigener OBS-Szene. Gilt für beide Kanäle. Tippe einen Eintrag an, um ihn zu bearbeiten.'));
  // Spiele
  const list = S.spiele.map(x => ({ ...x }));
  const kats = (S.kategorien || []).map(k => ({ ...k }));
  const save = async () => { const r = await post('/api/spiele', { spiele: list, kategorien: kats }); const d = await r.json(); if (d.spiele) S.spiele = d.spiele; if (d.kategorien) { S.kategorien = d.kategorien; kats.splice(0, kats.length, ...d.kategorien.map(k => ({ ...k }))); } toast(r.ok ? '✓ Gespeichert' : 'Fehler beim Speichern', r.ok ? '' : 'warn'); };
  // Kategorien: Reihenfolge = Reihenfolge am Tablet
  const katBox = h('details', { class: 'card' }); m.append(katBox);
  const drawKats = () => {
    katBox.innerHTML = '';
    katBox.append(h('summary', {}, h('b', {}, '🗂️ Kategorien'), h('span', { class: 'hint' }, kats.map(k => (k.ico || '') + ' ' + k.name).join(' · '))));
    kats.forEach((k, j) => {
      const anzahl = list.filter(g => g.kategorie === k.id).length;
      katBox.append(h('div', { class: 'row' },
        h('input', { type: 'text', value: k.ico || '', style: 'width:3.2em;text-align:center', title: 'Symbol (Emoji)', onchange: async e => { k.ico = e.target.value; await save(); drawKats(); draw(); } }),
        h('input', { type: 'text', value: k.name, onchange: async e => { k.name = e.target.value; await save(); drawKats(); draw(); } }),
        h('span', { class: 'hint' }, anzahl + ' Einträge'),
        h('button', { class: 'b', disabled: j === 0 ? '' : null, onclick: async () => { kats.splice(j - 1, 0, kats.splice(j, 1)[0]); await save(); drawKats(); draw(); } }, '↑'),
        h('button', { class: 'b', disabled: j === kats.length - 1 ? '' : null, onclick: async () => { kats.splice(j + 1, 0, kats.splice(j, 1)[0]); await save(); drawKats(); draw(); } }, '↓'),
        anzahl ? null : h('button', { class: 'b', title: 'Leere Kategorie entfernen', onclick: async () => { kats.splice(j, 1); await save(); drawKats(); draw(); } }, '✕')));
    });
    katBox.append(h('button', { class: 'b', onclick: async () => { const n = prompt('Name der neuen Kategorie (z. B. „Kreativ“ oder „Musik“):'); if (!n) return; kats.push({ id: n, name: n, ico: '✨' }); await save(); katBox.open = true; drawKats(); draw(); } }, '+ Kategorie'));
  };
  const box = h('div', {}); m.append(box); let offen = -1;
  const draw = () => {
    box.innerHTML = '';
    const reihen = [...kats.map(k => ({ k, eintraege: list.map((g, i) => [g, i]).filter(([g]) => g.kategorie === k.id) })),
      { k: { id: '', name: 'Sonstiges', ico: '✨' }, eintraege: list.map((g, i) => [g, i]).filter(([g]) => !kats.some(k => k.id === g.kategorie)) }];
    reihen.forEach(({ k, eintraege }) => {
    if (!eintraege.length && !k.id) return;
    box.append(h('h2', {}, (k.ico ? k.ico + ' ' : '') + k.name));
    eintraege.forEach(([g, i]) => {
      const name = h('input', { type: 'text', value: g.name, oninput: e => { g.name = e.target.value; } , onchange: save });
      const vid = key => {
        const file = h('input', { type: 'file', accept: 'video/mp4,video/webm', style: 'display:none' });
        const info = h('code', {}, g[key] || 'Standard-Hintergrund');
        file.onchange = async () => { const fl = file.files[0]; if (!fl) return; await save(); info.textContent = 'lädt hoch …';
          const r = await post(`/api/upload-spiel/${S.spiele[i].id}/${key}?name=${encodeURIComponent(fl.name)}`, fl, true);
          if (r.ok) { g[key] = (await r.json()).adresse; info.textContent = g[key]; } else info.textContent = 'Fehler'; };
        return h('div', { class: 'media' }, g[key] ? h('video', { src: vorschau(g[key]), muted: '', preload: 'metadata' }) : null, info, h('button', { class: 'b', onclick: () => file.click() }, 'Video …'), file,
          g[key] ? h('button', { class: 'b', onclick: async () => { g[key] = ''; await save(); draw(); } }, 'Standard') : null);
      };
      const auf = h('details', { class: 'card spiel', ...(offen === i ? { open: '' } : {}) },
        h('summary', {}, h('b', {}, g.name || 'Ohne Namen'), h('span', { class: 'hint' }, [g.video ? '🖼️ eigener Hintergrund' : '', g.musik ? '🎵 ' + ((S.musik.liste.find(x => x.id === g.musik) || {}).name || g.musik) : '', g.szene ? '🎥 ' + g.szene : '', g.ohneFenster ? 'ohne Spielfenster' : ''].filter(Boolean).join(' · ')),
          S.spiel === S.spiele[i].id ? h('span', { class: 'pill ok' }, 'läuft gerade') : null),
        field('Name', name),
        field('Kategorie', h('select', { onchange: async e => { g.kategorie = e.target.value; offen = i; await save(); drawKats(); draw(); } }, ...kats.map(x => h('option', { value: x.id, ...(g.kategorie === x.id ? { selected: '' } : {}) }, (x.ico || '') + ' ' + x.name)))), field('Hintergrund hochkant (TikTok)', vid('video')), field('Hintergrund quer (Twitch)', vid('videoQuer')),
        field('Licht (Hue)', (() => { const E = (S.hue && S.hue.effektListe) || [], v = { ...((S.hue && S.hue.spielLicht && S.hue.spielLicht[g.id]) || {}), ...(g.licht || {}) };
          if (!E.length) return h('span', { class: 'hint' }, 'Hue ist noch nicht eingerichtet (Verbindungen → Licht).');
          const sel = h('select', {}, ...E.map(([id, l]) => h('option', { value: id }, l))); sel.value = v.effekt || 'zweifarbig';
          const f1 = h('input', { type: 'color', value: v.farbe1 || '#ff3d7f', title: 'Farbe 1 (linker Spot)' }), f2 = h('input', { type: 'color', value: v.farbe2 || '#7c4dff', title: 'Farbe 2 (rechter Spot)' });
          const hl = h('input', { type: 'range', min: 5, max: 100, value: v.hell ?? 100 }), hw = h('span', { class: 'val' }, (v.hell ?? 100) + ' %');
          const neu = () => ({ effekt: sel.value, farbe1: f1.value, farbe2: f2.value, hell: Number(hl.value) });
          let t; const los = () => { hw.textContent = hl.value + ' %'; clearTimeout(t); t = setTimeout(async () => { g.licht = neu(); await save(); }, 400); };
          sel.onchange = los; f1.oninput = los; f2.oninput = los; hl.oninput = los;
          return h('div', { class: 'efzeile' }, sel, h('span', { class: 'farben' }, f1, f2), h('span', { class: 'efhell' }, '☀', hl, hw),
            h('button', { class: 'b', title: 'Licht 6 s vorführen', onclick: async () => { await save(); const r = await post('/api/hue/test', { spiel: S.spiele[i].id, licht: neu() }); if (!r.ok) toast((await r.json()).fehler, 'warn'); } }, '▶'));
        })()),
        field('Geräusche (Atmo)', (() => { const file = h('input', { type: 'file', accept: 'audio/mpeg,audio/ogg,audio/wav', style: 'display:none' });
          const name = (g.video || '').match(/\/hintergrund\/(?:spiele\/)?([a-z0-9-]+?)(?:-quer)?\.mp4$/i);
          const info = h('code', {}, g.atmo || (name ? 'passend zum Hintergrund: /atmo/' + name[1] + '.mp3' : 'keine'));
          const probe = h('audio', { controls: '', preload: 'none', src: g.atmo || (name ? '/atmo/' + name[1] + '.mp3' : ''), style: 'height:32px;max-width:220px' });
          file.onchange = async () => { const fl = file.files[0]; if (!fl) return; await save(); info.textContent = 'lädt hoch …';
            const r = await post(`/api/upload-spiel/${S.spiele[i].id}/atmo?name=${encodeURIComponent(fl.name)}`, fl, true);
            if (r.ok) { g.atmo = (await r.json()).adresse; info.textContent = g.atmo; probe.src = g.atmo; toast('Geräusche gespeichert'); } else info.textContent = 'Fehler'; };
          return h('div', { class: 'media' }, probe, info, h('button', { class: 'b', onclick: () => file.click() }, 'Eigene Datei …'), file,
            g.atmo ? h('button', { class: 'b', onclick: async () => { g.atmo = ''; await save(); draw(); } }, 'Standard') : null); })()),
        field('Eigene OBS-Szene (optional)', sceneSelect(g.szene, async v => { g.szene = v; await save(); }, '– Gaming-Szene –')),
        field('Start-Ansage für dieses Spiel (optional, Titel | Unterzeile)', h('input', { type: 'text', value: g.start || '', placeholder: 'z. B. Raid-Abend in Azeroth! | Gleich geht\'s los', onchange: async e => { g.start = e.target.value; await save(); } })),
        field('Ende-Ansage für dieses Spiel (optional)', h('input', { type: 'text', value: g.ende || '', placeholder: 'z. B. GG & gute Nacht! | Morgen wieder', onchange: async e => { g.ende = e.target.value; await save(); } })),
        field('Wand-Monitor möglich (Hintergrund hat den Bildschirm wie die Zockerbude)', h('input', { type: 'checkbox', ...((g.wandMonitor === true || (g.wandMonitor !== false && /zockerbude/i.test((g.video || '') + ' ' + (g.videoQuer || '') + ' ' + g.id))) ? { checked: '' } : {}), onchange: async e => { g.wandMonitor = e.target.checked; await save(); } })),
        field('Kein Spielfenster (z. B. Talk-Runde)', h('input', { type: 'checkbox', ...(g.ohneFenster ? { checked: '' } : {}), onchange: async e => { g.ohneFenster = e.target.checked; await save(); } })),
        field('Musik', h('select', { onchange: async e => { g.musik = e.target.value; await save(); } },
          h('option', { value: '' }, '– Musik nicht wechseln –'), ...(S.musik ? S.musik.liste : []).map(x => h('option', { value: x.id, ...(g.musik === x.id ? { selected: '' } : {}) }, x.name)))),
        h('div', { class: 'row' }, h('button', { class: 'b p', onclick: async () => { await save(); await post('/api/modus', { modus: 'zocken', spiel: S.spiele[i].id }); S.spiel = S.spiele[i].id; toast('Läuft jetzt: ' + g.name); } }, '▶ Jetzt zeigen'),
          h('button', { class: 'b', onclick: async () => { if (confirm('„' + g.name + '“ entfernen?')) { list.splice(i, 1); await save(); draw(); } } }, 'Entfernen')));
      auf.ontoggle = () => { if (auf.open) offen = i; };
      box.append(auf);
    });
    });
    box.append(h('button', { class: 'b', onclick: async () => { list.push({ name: 'Neuer Hintergrund', kategorie: (kats[0] || {}).id || 'spiele', video: '', videoQuer: '', szene: '', musik: '' }); await save(); list.splice(0, list.length, ...S.spiele.map(x => ({ ...x }))); offen = list.length - 1; draw(); } }, '+ Hintergrund hinzufügen'));
  };
  drawKats(); draw();
}
// ---------- Licht (Philips Hue) ----------
function lichtPage(m) {
  const H = S.hue || { lampen: [], lampenListe: [] };
  m.append(h('h1', {}, 'Licht (Philips Hue)'), h('p', { class: 'hint' }, 'Deine Hue-Lampen leuchten in den Farben der laufenden Animation (Rose = rot, Löwe = gold, Galaxie = violett …), kurz pink bei Likes, gedimmt bei BRB/Pause. Sonst Grundlicht je Modus. Läuft direkt über die Bridge im Heimnetz – nichts über die Cloud. Lumia darf trotzdem weiter auf die Bridge zugreifen; stell dort aber keine eigenen Licht-Alerts für dieselben Lampen ein, sonst kämpfen beide.'));
  const fehler = h('p', { class: 'hint warntext' }, H.fehler || '');
  if (!H.gekoppelt) {
    const ip = h('input', { type: 'text', value: H.ip || '', placeholder: 'z. B. 192.168.1.50' });
    const gefunden = h('div', { class: 'row' });
    m.append(h('div', { class: 'card' }, h('b', {}, 'Bridge koppeln (einmalig)'),
      h('ol', {}, h('li', {}, 'Bridge suchen lassen oder die IP-Adresse eintragen (Hue-App → Einstellungen → Bridges → ⓘ).'),
        h('li', {}, 'Den runden Knopf oben auf der Hue Bridge drücken.'), h('li', {}, 'Innerhalb von 30 Sekunden hier auf „Koppeln“ tippen.')),
      h('div', { class: 'row' }, h('button', { class: 'b', onclick: async () => { gefunden.textContent = 'suche …';
        const d = await fetch('/api/hue/suchen').then(r => r.json()); gefunden.innerHTML = '';
        if (!d.bridges.length) gefunden.append(h('span', { class: 'hint' }, d.fehler || 'Keine Bridge gefunden – IP bitte von Hand eintragen.'));
        d.bridges.forEach(b => gefunden.append(h('button', { class: 'b', onclick: () => { ip.value = b.ip; } }, 'Bridge ' + b.ip))); } }, '🔍 Bridge suchen'), gefunden),
      field('IP-Adresse der Bridge', ip),
      h('div', { class: 'row' }, h('button', { class: 'b p', onclick: async () => {
        const r = await post('/api/hue/koppeln', { ip: ip.value.trim() }); const d = await r.json();
        if (!r.ok) { fehler.textContent = d.fehler; toast('Koppeln hat nicht geklappt', 'warn'); return; }
        S.hue = d.hue; toast('✓ Bridge gekoppelt'); render(); } }, '🔗 Koppeln')), fehler));
    return;
  }
  const speichern = async (daten, text) => { const r = await post('/api/hue', daten); const d = await r.json(); if (d.hue) S.hue = d.hue; toast(r.ok ? text || '✓ Gespeichert' : (d.fehler || 'Fehler'), r.ok ? '' : 'warn'); renderNav(); return d; };
  const schalter = (key, label, hinweis) => { const i = h('input', { type: 'checkbox' }); i.checked = H[key] !== false; i.onchange = () => speichern({ [key]: i.checked }); return field(label, i, hinweis ? h('span', { class: 'hint' }, ' ' + hinweis) : null); };
  const regler = (key, label, min, max, einheit, fmt = x => x + einheit) => { const i = h('input', { type: 'range', min, max, value: H[key] }); const v = h('span', { class: 'val' }, fmt(H[key]));
    let t; i.oninput = () => { v.textContent = fmt(i.value); clearTimeout(t); t = setTimeout(() => speichern({ [key]: Number(i.value) }), 300); }; return field(label, h('span', {}, i, v)); };
  m.append(h('div', { class: 'card' }, h('div', { class: 'row' }, h('span', { class: 'pill ' + (H.status === 'verbunden' ? 'ok' : H.status === 'fehler' ? 'err' : '') }, 'Bridge ' + H.ip + ': ' + ({ verbunden: 'verbunden', fehler: 'Fehler', aus: 'bereit' }[H.status] || H.status))), fehler,
    schalter('an', 'Licht-Steuerung an', '(aus = Lampen bekommen ihren vorherigen Zustand zurück)'),
    schalter('live', 'Licht folgt dem Stream', '(auch am Tablet als Kachel „Licht“ schaltbar)')));
  const E = H.effektListe || [], ohneFarbe = ['ambilight', 'ambibunt', 'regenbogen', 'feuer', 'nichts'];
  // Effekt-Zeile: Auswahl + Farben + Dauer/Helligkeit/Blitz (sofort gespeichert)
  const effektZeile = (wert, speichern, opt = {}) => {
    const v = { ...wert };
    const sel = h('select', {}, ...E.map(([id, l]) => h('option', { value: id }, l))); sel.value = v.effekt;
    const f1 = h('input', { type: 'color', value: v.farbe1 || '#ffffff', title: 'Farbe 1 (linker Spot)' }), f2 = h('input', { type: 'color', value: v.farbe2 || v.farbe1 || '#ffffff', title: 'Farbe 2 (rechter Spot)' });
    const farben = h('span', { class: 'farben' }, f1, f2);
    const hell = h('input', { type: 'range', min: 5, max: 100, value: v.hell ?? 100, title: 'Helligkeit' }), hellW = h('span', { class: 'val' }, (v.hell ?? 100) + ' %');
    const dauer = opt.dauer ? h('input', { type: 'number', min: 0, max: 60, value: v.dauer || 0, title: '0 = so lange wie die Animation', class: 'dauer' }) : null;
    const blitz = opt.blitz ? h('label', { class: 'mini' }, h('input', { type: 'checkbox', ...(v.blitz ? { checked: '' } : {}) }), ' Blitz') : null;
    const zeigen = () => { farben.style.visibility = ohneFarbe.includes(sel.value) ? 'hidden' : ''; };
    let t; const neu = () => ({ effekt: sel.value, farbe1: f1.value, farbe2: f2.value, hell: Number(hell.value), ...(dauer ? { dauer: Number(dauer.value) || 0 } : {}), ...(blitz ? { blitz: blitz.querySelector('input').checked } : {}) });
    const los = () => { zeigen(); clearTimeout(t); t = setTimeout(() => speichern(neu()), 350); };
    sel.onchange = los; f1.oninput = los; f2.oninput = los; hell.oninput = () => { hellW.textContent = hell.value + ' %'; los(); }; if (dauer) dauer.oninput = los; if (blitz) blitz.onchange = los;
    zeigen();
    return h('div', { class: 'efzeile' }, sel, farben, h('span', { class: 'efhell' }, '☀', hell, hellW), dauer ? h('span', { class: 'mini' }, dauer, ' s') : null, blitz, opt.test || null);
  };
  // Spots: welche Lampen, welche Seite, eigene Helligkeit
  const spots = h('div', {});
  for (const l of H.lampenListe || []) {
    const an = H.lampen.includes(l.id), sp = (H.spotsAktiv || []).find(x => x.id === l.id) || { seite: 'links', hell: 100 };
    const i = h('input', { type: 'checkbox', ...(an ? { checked: '' } : {}), ...(l.farbig ? {} : { disabled: '' }) });
    i.onchange = () => { const neu = i.checked ? [...new Set([...H.lampen, l.id])] : H.lampen.filter(x => x !== l.id); H.lampen = neu; speichern({ lampen: neu }, i.checked ? '„' + l.name + '“ macht mit' : '„' + l.name + '“ macht nicht mehr mit').then(render); };
    const seite = h('select', { onchange: e => speichern({ spots: { [l.id]: { seite: e.target.value } } }, '„' + l.name + '“: ' + e.target.selectedOptions[0].textContent) },
      ...[['links', 'steht links (linke Bildhälfte)'], ['rechts', 'steht rechts (rechte Bildhälfte)'], ['mitte', 'Mitte (Hauptfarbe)']].map(([v, t]) => h('option', { value: v, ...(sp.seite === v ? { selected: '' } : {}) }, t)));
    const hl = h('input', { type: 'range', min: 5, max: 100, value: sp.hell ?? 100 }), hw = h('span', { class: 'val' }, (sp.hell ?? 100) + ' %'); let tm;
    hl.oninput = () => { hw.textContent = hl.value + ' %'; clearTimeout(tm); tm = setTimeout(() => speichern({ spots: { [l.id]: { hell: Number(hl.value) } } }, 'Helligkeit „' + l.name + '“'), 350); };
    spots.append(h('div', { class: 'spot' + (l.farbig ? '' : ' grau') }, h('label', { class: 'lampe' }, i, ' 💡 ', h('b', {}, l.name), l.farbig ? '' : h('span', { class: 'hint' }, ' (kann keine Farben)'), l.modell ? h('span', { class: 'hint' }, ' · ' + l.modell) : '', l.erreichbar === false ? h('span', { class: 'hint', style: 'color:#ff6b6b' }, ' · nicht erreichbar (Strom/Funk?)') : ''),
      an ? h('div', { class: 'row' }, seite, h('span', { class: 'efhell' }, '☀', hl, hw)) : null));
  }
  m.append(h('h2', {}, '1. Spots'), h('div', { class: 'card' }, h('p', { class: 'hint' }, 'Haken = macht mit. Die Seite bestimmt beim Ambilight, welche Bildhälfte der Spot nachleuchtet, und bei zweifarbigen Effekten, welche Farbe er bekommt (links = Farbe 1, rechts = Farbe 2).'),
    spots.childNodes.length ? spots : h('p', { class: 'hint' }, 'Keine Lampen geladen.'),
    h('button', { class: 'b', onclick: async () => { const d = await fetch('/api/hue/lampen').then(r => r.json()); S.hue = d.hue; render(); toast('Lampenliste neu geladen'); } }, '↻ Lampen neu laden')));
  // Grundlicht kommt jetzt vom gewählten Hintergrund
  m.append(h('h2', {}, '2. Grundlicht'), h('div', { class: 'card' }, h('p', { class: 'hint' }, 'Das Grundlicht (solange kein Alert läuft) gehört jetzt zum jeweiligen Hintergrund: Was läuft gerade → Eintrag aufklappen → „Licht (Hue)“.'),
    h('button', { class: 'b', onclick: () => go('spiele') }, '→ Was läuft gerade')));
  // Effekte je Ereignis
  const gruppen = {};
  for (const k of H.kategorien || []) (gruppen[k.gruppe] ||= []).push(k);
  const ef = h('div', { class: 'card' }, h('p', { class: 'hint' }, 'Je Ereignis ein eigener Licht-Effekt. „Dauer 0“ = so lange wie die Animation. „Blitz“ = kurzer weißer Blitz zum Start. Ambilight folgt den Farben der laufenden Animation – linker Spot linke Bildhälfte, rechter Spot rechte. ▶ spielt nur das Licht vor.'));
  for (const [gr, liste] of Object.entries(gruppen)) {
    ef.append(h('h3', {}, gr));
    for (const k of liste) ef.append(field(k.label, effektZeile(k, v => speichern({ effekte: { [k.id]: v } }, k.label + ': gespeichert'),
      { dauer: !k.id.startsWith('a-'), blitz: !k.id.startsWith('a-') && k.id !== 'likes', test: h('button', { class: 'b', title: 'Licht vorführen', onclick: async () => { const r = await post('/api/hue/test', { kat: k.id }); if (!r.ok) toast((await r.json()).fehler, 'warn'); } }, '▶') })));
  }
  m.append(h('h2', {}, '3. Effekte je Ereignis'), ef);
  m.append(h('h2', {}, 'Allgemein'), h('div', { class: 'card' },
    schalter('alerts', 'Licht bei Alerts und Aktionsknöpfen'), schalter('likes', 'Licht bei Likes', '(höchstens alle 3 s)'), schalter('szenen', 'Licht bei Ansagen'),
    regler('helligkeit', 'Gesamt-Helligkeit', 5, 100, ' %'),
    h('div', { class: 'row', style: 'margin-top:10px' }, h('button', { class: 'b', onclick: async () => { if (confirm('Alle Licht-Effekte und das Grundlicht dieses Kanals auf die Vorschläge zurücksetzen?')) { await speichern({ effekteZurueck: true }, 'Vorschläge wiederhergestellt'); render(); } } }, 'Effekte auf Vorschläge zurücksetzen'))));
  m.append(h('h2', {}, 'Ausprobieren mit Animation'), h('div', { class: 'card' }, h('div', { class: 'row' },
    ...[['rose', '🌹 Rose'], ['einhorn', '🦄 Einhorn'], ['feuerwerk', '🎆 Feuerwerk'], ['galaxie', '🌌 Galaxie'], ['wal', '🐋 Wal']].map(([id, l]) => h('button', { class: 'b', onclick: async () => { const r = await post('/api/hue/test', { anim: id }); if (!r.ok) toast((await r.json()).fehler, 'warn'); } }, l))),
    h('p', { class: 'hint' }, 'Spielt nur das Licht ab (wie ein Geschenk mit 1.000 Münzen) – im Stream passiert nichts. Zum Testen mit Bild: Seite „Geschenke“ → „Im Stream testen“.')),
    h('div', { class: 'row' }, h('button', { class: 'b', onclick: async () => { if (confirm('Bridge entkoppeln? Danach musst du neu koppeln.')) { await speichern({ entkoppeln: true }, 'Bridge entkoppelt'); render(); } } }, 'Bridge entkoppeln')));
}
// ---------- Geschenke: welches Münz-Geschenk zeigt welche Animation? ----------
let GESCHENKE = null, gFilter = 'alle', gSuche = '', gQuer = false;
const gNorm = x => String(x || '').toLowerCase().replace(/\s+/g, ' ').trim();
function zuordnungen() { const m = new Map(); for (const l of gNorm(S.vorne.eigeneZuordnung).split('\n')) { const [g, id] = l.split('=').map(x => x && x.trim()); if (g && id) m.set(g, id); } return m; }
// gleiche Regeln wie die vordere Quelle (overlay giftAnim): eigene Zuordnung › passende Animation › Stufe nach Münzen
function geschenkAnim(g) {
  const n = gNorm(g.name), eigen = zuordnungen().get(n), byId = id => LIST.find(a => a.id === id);
  if (eigen && byId(eigen)) return { a: byId(eigen), art: 'eigen' };
  const direkt = LIST.find(a => a.gruppe === 'geschenk' && (a.match || []).some(x => gNorm(x) === n));
  if (direkt && S.vorne['an_' + direkt.id] !== false) return { a: direkt, art: 'passend' };
  const stufen = LIST.filter(a => a.gruppe === 'stufe').map(a => ({ a, ab: Number(S.vorne['ab_' + a.id] ?? a.ab) || 0 })).sort((x, y) => y.ab - x.ab);
  const t = stufen.find(t => (g.muenzen || 1) >= t.ab);
  return t ? { a: t.a, art: 'stufe', aus: direkt && S.vorne['an_' + direkt.id] === false } : { a: null, art: 'keine' };
}
function animSrc(a) { if (!a) return ''; return (gQuer && (S.vorne['vq_' + a.id] || (!S.vorne['v_' + a.id] && a.quer && S.vorne.medienAdresse + a.quer))) || S.vorne['v_' + a.id] || S.vorne.medienAdresse + a.datei; }
function vorspielen(a, titel) {
  const zu = () => box.remove();
  const v = h('video', { src: animSrc(a), autoplay: '', controls: '', playsinline: '' });
  const box = h('div', { class: 'vorspiel', onclick: e => { if (e.target === box) zu(); } }, h('div', { class: 'vs-inhalt' + (gQuer ? ' quer' : '') }, h('div', { class: 'row' }, h('b', {}, titel), h('button', { class: 'b', onclick: zu }, '✕ Schließen')), v));
  document.body.append(box); v.play().catch(() => {});
}
async function geschenkePage(m) {
  m.append(h('h1', {}, 'Geschenke'), h('p', { class: 'hint' }, 'Alle Münz-Geschenke, sortiert nach Münzen: welche Animation läuft, wenn jemand es schickt. Gelb = noch keine eigene Animation, es läuft eine Stufe. Geschenke, die im Live ankommen, kommen automatisch dazu. Münzwerte der Startliste sind ungefähr.'));
  if (!GESCHENKE) { m.append(h('p', { class: 'hint' }, 'lädt …')); GESCHENKE = (await fetch('/api/geschenke').then(r => r.json())).geschenke; if (page.id === 'geschenke') render(); return; }
  const liste = GESCHENKE.map(g => ({ ...g, z: geschenkAnim(g) }));
  const n = { alle: liste.length, stufe: liste.filter(g => g.z.art === 'stufe' || g.z.art === 'keine').length, live: liste.filter(g => g.gesehen).length };
  const such = h('input', { type: 'text', placeholder: 'Geschenk suchen …', value: gSuche, oninput: e => { gSuche = e.target.value; zeichne(); } });
  m.append(h('div', { class: 'card' }, h('div', { class: 'row' },
    h('div', { class: 'tabs', style: 'margin:0' }, ...[['alle', 'Alle'], ['stufe', 'Ohne eigene Animation'], ['live', 'Im Live gesehen']].map(([k, l]) => h('button', { class: gFilter === k ? 'on' : '', onclick: () => { gFilter = k; render(); } }, l + ' (' + n[k] + ')'))),
    h('div', { class: 'tabs', style: 'margin:0' }, h('button', { class: gQuer ? '' : 'on', onclick: () => { gQuer = false; render(); } }, 'Vorschau hochkant'), h('button', { class: gQuer ? 'on' : '', onclick: () => { gQuer = true; render(); } }, 'quer'))),
    h('div', { style: 'margin-top:10px' }, such)));
  const box = h('div', { class: 'gliste' }); m.append(box);
  const optionen = () => { const grp = { geschenk: 'Geschenk-Animationen', stufe: 'Stufen', knopf: 'Aktionsknöpfe', ereignis: 'Ereignisse' };
    return [h('option', { value: '' }, 'automatisch'), ...Object.entries(grp).map(([g, l]) => h('optgroup', { label: l }, ...LIST.filter(a => a.gruppe === g).map(a => h('option', { value: a.id }, a.label || a.id))))]; };
  const zuweisen = (g, id) => {
    const zeilen = String(S.vorne.eigeneZuordnung || '').split('\n').filter(l => l.trim() && gNorm(l.split('=')[0]) !== gNorm(g.name));
    if (id) zeilen.push(gNorm(g.name) + ' = ' + id);
    queueSave('vorne', 'eigeneZuordnung', zeilen.join('\n')); zeichne();
  };
  function zeichne() {
    box.innerHTML = '';
    let l = GESCHENKE.map(g => ({ ...g, z: geschenkAnim(g) }));
    if (gFilter === 'stufe') l = l.filter(g => g.z.art === 'stufe' || g.z.art === 'keine'); else if (gFilter === 'live') l = l.filter(g => g.gesehen).sort((a, b) => (b.anzahl || 0) - (a.anzahl || 0));
    if (gSuche.trim()) { const q = gNorm(gSuche); l = l.filter(g => gNorm(g.name).includes(q) || gNorm(g.z.a && (g.z.a.label || g.z.a.id)).includes(q)); }
    if (!l.length) box.append(h('p', { class: 'hint' }, 'Nichts gefunden.'));
    for (const g of l) {
      const { a, art } = g.z, eigen = zuordnungen().get(gNorm(g.name));
      const sel = h('select', { onchange: e => zuweisen(g, e.target.value) }, ...optionen()); sel.value = eigen && LIST.some(x => x.id === eigen) ? eigen : '';
      box.append(h('div', { class: 'gzeile ' + art },
        a ? h('video', { class: 'gvor' + (gQuer ? ' quer' : ''), src: vorschau(animSrc(a)), muted: '', preload: 'metadata', title: 'Abspielen mit Ton', onclick: () => vorspielen(a, g.name + ' → ' + (a.label || a.id)) }) : h('div', { class: 'gvor leer' }, '–'),
        h('div', { class: 'ginfo' },
          h('div', { class: 'gname' }, g.bild ? h('img', { src: g.bild, alt: '', referrerpolicy: 'no-referrer' }) : null, h('b', {}, g.name),
            h('span', { class: 'muenzen' }, '🪙 ' + (g.muenzen ? g.muenzen.toLocaleString('de-DE') : '?')),
            g.gesehen ? h('span', { class: 'pill ok' }, (g.anzahl || 0) + '× im Live') : null),
          h('div', { class: 'hint' }, art === 'eigen' ? '✔ Eigene Zuordnung: ' + (a.label || a.id) : art === 'passend' ? '✔ Eigene Animation: ' + (a.label || a.id)
            : art === 'stufe' ? '⚠ Keine eigene Animation – es läuft „' + (a.label || a.id) + '“' + (g.z.aus ? ' (eigene Animation ist ausgeschaltet)' : '') : '⚠ Wird nicht gezeigt (unter der Mindest-Münzzahl)')),
        h('div', { class: 'gaktion' }, field('Animation', sel),
          h('div', { class: 'row' }, a ? h('button', { class: 'b', onclick: () => vorspielen(a, g.name + ' → ' + (a.label || a.id)) }, '▶ Ansehen') : null,
            h('button', { class: 'b', onclick: async () => { await post('/api/test', { alert: 'tiktok-gift', extraSettings: { username: 'Test', giftName: g.name, coins: g.muenzen || 1, giftAmount: 1, avatar: '/icon.png' } }); toast('„' + g.name + '“ läuft im Stream'); } }, 'Im Stream testen'),
            g.gesehen && !g.katalog ? h('button', { class: 'b', title: 'Aus der Liste entfernen', onclick: async () => { if (!confirm('„' + g.name + '“ aus der Liste entfernen?')) return; GESCHENKE = (await (await post('/api/geschenke/vergessen', { name: g.name })).json()).geschenke; zeichne(); } }, '🗑') : null))));
    }
  }
  zeichne();
  m.append(h('p', { class: 'hint' }, 'Hinweis: Schickt jemand mehrere Geschenke auf einmal, entscheidet bei den Stufen die Summe der Münzen. Eigene Zuordnungen stehen auch unter „Animationen & Einblendungen → Allgemein“.'));
}
// ---------- Galerie ----------
let galQuer = false;
function galerie(m) {
  const umsch = h('div', { class: 'tabs row' }, h('button', { class: 'b' + (galQuer ? '' : ' on'), onclick: () => { galQuer = false; render(); } }, 'Hochkant 9:16'), h('button', { class: 'b' + (galQuer ? ' on' : ''), onclick: () => { galQuer = true; render(); } }, 'Quer 16:9'));
  m.append(h('h1', {}, 'Animationen ansehen'), h('p', { class: 'hint' }, 'Klick aufs Video = mit Ton abspielen. „Im Stream zeigen“ spielt die Animation live in allen Browserquellen (hochkant und quer, jede in ihrem Format).'), umsch);
  const NAMES = { geschenk: 'TikTok-Geschenke', stufe: 'TikTok-Stufen (alle anderen Geschenke)', ereignis: 'TikTok-Ereignisse', twitch: 'Twitch', knopf: 'Aktionsknöpfe' };
  for (const [g, name] of Object.entries(NAMES)) {
    const items = LIST.filter(a => a.gruppe === g); if (!items.length) continue;
    m.append(h('h2', {}, name), h('div', { class: 'anims' }, ...items.map(a => {
      const src = (galQuer && (S.vorne['vq_' + a.id] || (!S.vorne['v_' + a.id] && a.quer && S.vorne.medienAdresse + a.quer))) || S.vorne['v_' + a.id] || S.vorne.medienAdresse + a.datei;
      return h('div', { class: 'anim' }, h('video', { src: vorschau(src), preload: 'metadata', muted: '', onclick: e => { e.target.muted = false; e.target.currentTime = 0; e.target.play(); } }),
        h('div', { class: 'm' }, h('b', {}, a.label + (S.vorne['an_' + a.id] === false ? ' (aus)' : '')), h('button', { class: 'b', onclick: () => post('/api/aktion', { id: a.id, label: a.label, name: 'Test' }) }, 'Im Stream zeigen')));
    })));
  }
}
// ---------- Testen ----------
function test(m) {
  m.append(h('h1', {}, 'Testen'), h('p', { class: 'hint' }, 'Löst echte TikTok-Ereignisse aus, wie sie von Lumia kommen würden – inkl. Name, Zähler und Zuordnung.'));
  const name = h('input', { type: 'text', value: 'Testnutzer' });
  m.append(h('div', { class: 'card' }, field('Name', name)));
  const send = (alert, extra) => post('/api/test', { alert, extraSettings: { username: name.value, avatar: '/icon.png', ...extra } });
  const chatText = h('input', { type: 'text', value: 'Hallo zusammen, wie geht\'s? 😄' });
  m.append(h('div', { class: 'card' }, h('b', {}, 'Chat testen'), field('Nachricht', chatText), h('div', { class: 'row' },
    ...[['tiktok', 'TikTok'], ['twitch', 'Twitch'], ['youtube', 'YouTube']].map(([pf, l]) => h('button', { class: 'b', onclick: () => post('/api/test-chat', { plattform: pf, name: name.value, text: chatText.value }) }, 'Chat ' + l)))));
  const gifts = [['Rose', 1], ['GG', 1], ['TikTok', 1], ['Finger Heart', 5], ['Heart Me', 1], ['Doughnut', 30], ['Perfume', 20], ['Hand Hearts', 100], ['Sunglasses', 199], ['Money Gun', 500], ['Corgi', 299], ['Baby Chicks', 500], ['Galaxy', 1000], ['Lion', 29999], ['Universe', 34999], ['Blumenstrauß (Stufe)', 30], ['Teures Geschenk (Stufe)', 5000]];
  m.append(h('h2', {}, 'Geschenke'), h('div', { class: 'row' }, ...gifts.map(([g, c]) => h('button', { class: 'b', onclick: () => send('tiktok-gift', { giftName: g.replace(/ \(Stufe\)$/, ''), coins: c, giftAmount: 1 }) }, g))),
    h('h2', {}, 'Ereignisse'), h('div', { class: 'row' }, ...[['tiktok-follower', 'Neuer Follower'], ['tiktok-share', 'Teilen'], ['tiktok-superFan', 'Superfan'], ['tiktok-treasureChest', 'Schatzkiste'], ['tiktok-totalLikes', 'Like-Ziel'], ['tiktok-battleEnd', 'Battle-Ende']]
      .map(([a, l]) => h('button', { class: 'b', onclick: () => send(a, {}) }, l))),
    h('h2', {}, 'Twitch'), h('div', { class: 'row' }, ...[['twitch-follower', 'Follow', {}], ['twitch-subscriber', 'Sub', { subPlan: '1000' }], ['twitch-subscriber', 'Prime-Sub', { subPlan: 'Prime' }],
      ['twitch-subscriber', 'Resub 12 Monate', { subPlan: '1000', subMonths: 12 }], ['twitch-giftSubscription', '5 Geschenk-Subs', { giftAmount: 5, amount: 5 }],
      ['twitch-bits', '50 Bits', { amount: 50 }], ['twitch-bits', '500 Bits', { amount: 500 }], ['twitch-bits', '2000 Bits', { amount: 2000 }], ['twitch-bits', '10000 Bits', { amount: 10000 }],
      ['twitch-hypetrainStarted', 'Hype Train Start', {}], ['twitch-hypetrainLevelProgressed', 'Hype Train Level 3', { level: 3 }], ['twitch-hypetrainEnded', 'Hype Train Ende', { level: 4 }], ['twitch-raid', 'Raid 42', { viewers: 42 }]]
      .map(([a, l, x]) => h('button', { class: 'b', onclick: () => send(a, x) }, l))),
    h('h2', {}, 'YouTube'), h('div', { class: 'row' }, ...[['youtube-subscriber', 'Abo', {}], ['youtube-member', 'Mitglied', {}], ['youtube-member', 'Mitglied 6 Monate', { months: 6 }],
      ['youtube-giftMembership', '5 Mitgliedschaften verschenkt', { giftAmount: 5 }], ['youtube-superchat', 'Super Chat 2 €', { amount: 2, currency: 'EUR', message: 'Grüße aus dem Chat!' }],
      ['youtube-superchat', 'Super Chat 10 €', { amount: 10, currency: 'EUR', message: 'Weiter so!' }], ['youtube-superchat', 'Super Chat 50 €', { amount: 50, currency: 'EUR' }],
      ['youtube-superchat', 'Super Chat 100 €', { amount: 100, currency: 'EUR' }], ['youtube-supersticker', 'Super Sticker 5 €', { amount: 5, currency: 'EUR' }]]
      .map(([a, l, x]) => h('button', { class: 'b', onclick: () => send(a, x) }, l))),
    h('h2', {}, 'Likes'), h('div', { class: 'row' }, ...[10, 50, 200, 1000].map(n => h('button', { class: 'b', onclick: () => send('tiktok-like', { amount: n }) }, n + ' Likes'))));
}
// ---------- Browserquellen ----------
function quellen(m) {
  const o = location.origin;
  const copyRow = (label, url, text) => h('div', { class: 'card' }, h('b', {}, label), h('p', { class: 'hint' }, text),
    h('div', { class: 'copy' }, h('code', {}, url), h('button', { class: 'b', onclick: e => copy(url, e.target) }, 'Kopieren')));
  m.append(h('h1', {}, 'Browserquellen für OBS / TikTok LIVE Studio'), h('p', { class: 'hint' }, 'Einmal einrichten, danach steuerst du alles hier und am Tablet. Hochkant (TikTok): Quellen in 1080 × 1920. Quer (Twitch): die …-quer-Adressen in 1920 × 1080 – dort kommen die 16:9-Animationen und Hintergründe. Beide Formate laufen gleichzeitig, jeder Alert erscheint in allen Quellen.'),
    copyRow('0. Ganz unten: Spielaufnahme und/oder Drucker-Kamera', '–', 'Als normale OBS-Quellen (Spielaufnahme, Videoaufnahmegerät, Medienquelle/RTSP). Sie sind durch Fenster 1 und 2 sichtbar – Lage und Größe stellst du unter „Hintergrund & Kameras“ ein und schiebst die Quelle in OBS passend darunter.'),
    copyRow('1. Hinten – hochkant (1080 × 1920)', o + '/quelle/hinten-hoch', 'Hintergrund (beide Modi), Musik und die Fenster für Spiel und Kamera.'),
    copyRow('1. Hinten – quer (1920 × 1080)', o + '/quelle/hinten-quer', 'Dasselbe im Querformat für Twitch.'),
    copyRow('2. Deine Kamera (freigestellt)', '–', 'Deine Kamera mit Hintergrund-Entfernung kommt zwischen die beiden Quellen.'),
    copyRow('3. Vorne – hochkant (1080 × 1920)', o + '/quelle/vorne-hoch', 'Animationen, Spendername, Banner, Like-Fontäne, Ansagen.'),
    copyRow('3. Vorne – quer (1920 × 1080)', o + '/quelle/vorne-quer', 'Dieselben Alerts als 16:9-Animationen für Twitch.'),
    copyRow('Tablet-Steuerung', o + '/aktion', 'Auf dem Tablet öffnen und „Zum Startbildschirm hinzufügen“.'),
    h('div', { class: 'card' }, h('b', {}, 'Wichtig in OBS'), h('ul', {}, h('li', {}, '„Audio über OBS steuern“ anhaken, damit Sounds und Musik im Stream landen.'), h('li', {}, '„Quelle herunterfahren, wenn nicht sichtbar“ AUS lassen.'))));
}
function copy(text, btn) {
  const done = () => { const t = btn.textContent; btn.textContent = 'Kopiert ✓'; setTimeout(() => (btn.textContent = t), 1500); };
  const old = () => { const ta = h('textarea'); ta.value = text; document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove(); done(); };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, old); else old();
}
async function reload() { S = await fetch('/api/settings', { cache: 'no-store' }).then(r => r.json()); document.title = S.kanal + ' Studio'; $('.brand b').textContent = 'Live-Studio'; render(); }
// Live: Status und Ereignisse
const es = new EventSource('/api/events?rolle=studio');
es.addEventListener('hallo', e => { const d = JSON.parse(e.data); if (d.stand) { if (window.MM_STAND && window.MM_STAND !== d.stand) location.reload(); window.MM_STAND = d.stand; } });
es.addEventListener('lumia', e => { if (!S) return; S.status = JSON.parse(e.data); renderNav(); if (['start', 'lumia'].includes(page.id)) render(); });
es.addEventListener('log', e => { if (!S) return; const l = JSON.parse(e.data); S.log = [l, ...(S.log || [])].slice(0, 50); const box = $('#log'); if (box) box.prepend(logLine(l)); });
es.addEventListener('quellen', e => { if (!S) return; S.quellenListe = JSON.parse(e.data);
  if ((page.id === 'hinten' || page.id === 'vorne') && !document.activeElement.matches('input,select,textarea')) { const y = scrollY; render(); scrollTo(0, y); } });
es.addEventListener('obs', e => { if (!S) return; S.obsStatus = JSON.parse(e.data); renderNav(); if (['obs', 'start'].includes(page.id) && !document.activeElement.matches('input,select')) render(); });
es.addEventListener('fenster', e => { if (!S) return; S.fensterSicht = JSON.parse(e.data); if (page.id === 'start' || page.id === 'obs') { if (!document.activeElement.matches('input,select,textarea')) render(); } });
es.addEventListener('hue', e => { if (!S) return; S.hue = JSON.parse(e.data); renderNav(); if (page.id === 'start' || (page.id === 'licht' && !document.activeElement.matches('input,select'))) render(); });
es.addEventListener('dienste', e => { DIENSTE = JSON.parse(e.data); if (!S) return; renderNav(); if (page.id === 'dienste' && !document.activeElement.matches('input,select,textarea')) render(); });
es.addEventListener('geschenke', e => { if (!S) return; GESCHENKE = JSON.parse(e.data); if (page.id === 'geschenke' && !document.activeElement.matches('input,select')) render(); });
es.addEventListener('profil', async () => { if (!S) return; await reload(); renderNav(); });
es.addEventListener('modus', e => { if (!S) return; S.modus = JSON.parse(e.data).modus; if (page.id === 'start') render(); });
load();
