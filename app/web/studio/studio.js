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
const PAGES = [
  ['start', 'Übersicht'], ['lumia', 'Lumia-Verbindung'], ['vorne', 'Animationen & Einblendungen'], ['galerie', 'Animationen ansehen'],
  ['hinten', 'Hintergrund & Kameras'], ['spiele', 'Spiele & OBS'], ['aktion', 'Tablet-Steuerung'], ['test', 'Testen'], ['quellen', 'Browserquellen für OBS'],
];
function renderNav() {
  const nav = $('#nav'); nav.innerHTML = '';
  nav.append(h('a', { class: 'steuer', href: '/aktion' }, '🎛️ Steuerung öffnen'));
  const sel = h('select', { class: 'kanal', onchange: async e => { await post('/api/profil', { profil: e.target.value }); await reload(); renderNav(); } });
  for (const p of S.profile || []) { const o = h('option', { value: p.id }, 'Kanal: ' + p.name); if (p.id === S.profil) o.selected = true; sel.append(o); }
  nav.append(h('div', { class: 'kanalbox' }, sel, h('small', {}, 'Alle Einstellungen gelten für den gewählten Kanal. Umschalten wechselt auch die Browserquellen.')));
  for (const [id, label] of PAGES) nav.append(h('button', { class: page.id === id ? 'on' : '', onclick: () => { page.id = id; location.hash = id; renderNav(); render(); } }, label));
}
function status(st) {
  const map = { verbunden: ['ok', 'verbunden'], verbinde: ['warn', 'verbinde …'], getrennt: ['err', 'getrennt'], fehler: ['err', 'Fehler'], aus: ['', 'aus'] };
  const [c, t] = map[st.status] || ['', st.status]; return h('span', { class: 'pill ' + c }, 'Lumia: ' + t);
}
function render() {
  const m = $('#main'); m.innerHTML = '';
  ({ start, lumia: lumiaPage, vorne: () => settingsPage('vorne', 'Animationen & Einblendungen', 'Alles, was vor dir im Bild erscheint.'),
    galerie, hinten: () => settingsPage('hinten', 'Hintergrund, Modi & Kamera-Fenster', 'Alles hinter dir – Hintergründe für beide Modi, Musik und bis zu zwei Fenster (z. B. Spiel und Drucker-Kamera), durch die man die OBS-Quelle darunter sieht.'),
    aktion: () => settingsPage('aktion', 'Tablet-Steuerung', 'Was auf dem Tablet zu sehen ist.'), test, quellen, spiele: spielePage }[page.id] || start)(m);
}
// ---------- Übersicht ----------
function start(m) {
  m.append(h('h1', {}, 'Übersicht'), h('p', { class: 'hint' }, 'Hier siehst du, ob alles verbunden ist, und schaltest den Modus um.'));
  const q = S.quellen || {};
  m.append(h('div', { class: 'card' }, h('div', { class: 'row' }, status(S.status),
    h('span', { class: 'pill ' + (q.vorne ? 'ok' : 'warn') }, 'Quelle vorne: ' + (q.vorne || 0)),
    h('span', { class: 'pill ' + (q.hinten ? 'ok' : 'warn') }, 'Quelle hinten: ' + (q.hinten || 0)),
    h('span', { class: 'pill' }, 'Tablet: ' + (q.aktion || 0))),
    S.status.fehler ? h('p', { class: 'hint' }, S.status.fehler) : null));
  m.append(h('h2', {}, 'Modus'), h('div', { class: 'row' },
    ...[['party', '🎉 ' + (S.aktion.modus1Name || 'Party')], ['zocken', '🎮 ' + (S.aktion.modus2Name || 'Zockmodus')]].map(([v, l]) => h('button', { class: 'b' + (S.modus === v ? ' p' : ''), onclick: async () => { await post('/api/modus', { modus: v }); S.modus = v; render(); } }, l))));
  m.append(h('h2', {}, 'Ansagen'), h('div', { class: 'row' }, ...[['szene:start', 'Startet gleich'], ['szene:pause', 'Pause'], ['szene:gleich', 'Gleich weiter'], ['szene:weiter', "Weiter geht's"], ['szene:ende', 'Ende'], ['szene:aus', 'Ansage weg'], ['likes', 'Like-Fontäne']]
    .map(([id, l]) => h('button', { class: 'b', onclick: () => post('/api/aktion', { id, label: l }) }, l))));
  m.append(h('h2', {}, 'Letzte Ereignisse'), h('div', { class: 'card log', id: 'log' }, ...(S.log || []).map(logLine)));
}
const logLine = e => h('div', {}, new Date(e.at).toLocaleTimeString('de-DE') + ' · ' + ({ alert: '🎁', aktion: '👆', modus: '🎮' }[e.art] || '') + ' ' + (e.alert || '') + ' ' + (e.text || '') + (e.quelle ? ' (' + e.quelle + ')' : ''));
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
  clearTimeout(timer); timer = setTimeout(async () => { const p = pending; pending = {}; await post('/api/settings', p); $('#save').classList.remove('show'); }, 600);
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
  const fallback = bereich === 'vorne' && key.startsWith('v_') ? S.vorne.medienAdresse + key.slice(2) + '.mp4' : '';
  const src = v || fallback;
  const prev = isVideo && src ? h('video', { src, muted: '', preload: 'metadata', onclick: e => { e.target.muted = !e.target.muted; e.target.currentTime = 0; e.target.play(); } }) : null;
  const file = h('input', { type: 'file', accept: f.accept || (isVideo ? 'video/*' : 'audio/*'), style: 'display:none' });
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
  const groupField = schema.bereich;
  let fields = Object.entries(schema).filter(([k]) => k !== 'bereich').sort((a, b) => (a[1].order || 0) - (b[1].order || 0));
  if (groupField) {
    const cur = page.tab[bereich] || groupField.value;
    m.append(h('div', { class: 'tabs' }, ...Object.entries(groupField.options).map(([k, l]) => h('button', { class: k === cur ? 'on' : '', onclick: () => { page.tab[bereich] = k; render(); } }, l))));
    fields = fields.filter(([, f]) => !f.visibleIf || [].concat(f.visibleIf.equals).includes(cur));
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
function spielePage(m) {
  const O = { ...S.obs };
  m.append(h('h1', {}, 'Spiele & OBS'), h('p', { class: 'hint' }, 'OBS-Szene wechseln = Modus wechselt automatisch. Spiel am Tablet wählen = OBS springt in die Gaming-Szene und der passende Hintergrund läuft.'));
  const host = h('input', { type: 'text', value: O.host || '', placeholder: 'IP des Stream-PCs, z. B. 192.168.175.20' });
  const port = h('input', { type: 'number', value: O.port || 4455 });
  const pw = h('input', { type: 'password', placeholder: O.passwort ? '•••••••• (gespeichert – nur zum Ändern ausfüllen)' : 'Passwort aus OBS' });
  const an = h('input', { type: 'checkbox' }); an.checked = !!O.an;
  const folgen = h('input', { type: 'checkbox' }); folgen.checked = O.folgen !== false;
  const steuern = h('input', { type: 'checkbox' }); steuern.checked = O.steuern !== false;
  let sz = O.szeneZocken || '', sp = O.szeneParty || '';
  m.append(h('h2', {}, 'OBS-Verbindung'), h('div', { class: 'card' },
    field('Verbindung an', an), field('IP-Adresse des Stream-PCs', host), field('Port', port), field('Passwort', pw),
    field('Gaming-Szene (Modus 2)', sceneSelect(sz, v => (sz = v), '– keine –')),
    field('Normale Szene (Modus 1)', sceneSelect(sp, v => (sp = v), '– keine –')),
    field('OBS-Szene schaltet den Modus', folgen), field('Modus/Spiel schaltet die OBS-Szene', steuern),
    h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: 'b p', onclick: async () => {
      await post('/api/obs', { host: host.value, port: port.value, an: an.checked, passwort: pw.value, szeneZocken: sz, szeneParty: sp, folgen: folgen.checked, steuern: steuern.checked });
      pw.value = ''; setTimeout(reload, 1500); } }, 'Speichern & verbinden'), obsStatusPill(S.obsStatus)),
    S.obsStatus.fehler ? h('p', { class: 'hint' }, S.obsStatus.fehler) : null,
    h('p', { class: 'hint' }, 'In OBS: Werkzeuge → WebSocket-Server-Einstellungen → „WebSocket-Server aktivieren“, Port 4455, Passwort festlegen (dort auch „Verbindungsinfo anzeigen“). Die Szenen-Listen füllen sich nach dem Verbinden.')));
  // Spiele
  const list = S.spiele.map(x => ({ ...x }));
  const save = async () => { const r = await post('/api/spiele', { spiele: list }); const d = await r.json(); if (d.spiele) S.spiele = d.spiele; };
  m.append(h('h2', {}, 'Spiele'), h('p', { class: 'hint' }, 'Je Spiel ein eigener Hintergrund (Schleife) für Hoch- und Querformat. Ohne eigenes Video läuft der Zockmodus-Hintergrund. Eigene OBS-Szene je Spiel ist optional.'));
  const box = h('div', {}); m.append(box);
  const draw = () => {
    box.innerHTML = '';
    list.forEach((g, i) => {
      const name = h('input', { type: 'text', value: g.name, oninput: e => { g.name = e.target.value; } , onchange: save });
      const vid = key => {
        const file = h('input', { type: 'file', accept: 'video/mp4,video/webm', style: 'display:none' });
        const info = h('code', {}, g[key] || 'Standard (Zockmodus-Hintergrund)');
        file.onchange = async () => { const fl = file.files[0]; if (!fl) return; await save(); info.textContent = 'lädt hoch …';
          const r = await post(`/api/upload-spiel/${S.spiele[i].id}/${key}?name=${encodeURIComponent(fl.name)}`, fl, true);
          if (r.ok) { g[key] = (await r.json()).adresse; info.textContent = g[key]; } else info.textContent = 'Fehler'; };
        return h('div', { class: 'media' }, g[key] ? h('video', { src: g[key], muted: '', preload: 'metadata' }) : null, info, h('button', { class: 'b', onclick: () => file.click() }, 'Video …'), file,
          g[key] ? h('button', { class: 'b', onclick: async () => { g[key] = ''; await save(); draw(); } }, 'Standard') : null);
      };
      box.append(h('div', { class: 'card' },
        field('Spiel', name), field('Hintergrund hochkant (TikTok)', vid('video')), field('Hintergrund quer (Twitch)', vid('videoQuer')),
        field('Eigene OBS-Szene (optional)', sceneSelect(g.szene, async v => { g.szene = v; await save(); }, '– Gaming-Szene –')),
        h('div', { class: 'row' }, h('button', { class: 'b p', onclick: async () => { await save(); await post('/api/modus', { modus: 'zocken', spiel: S.spiele[i].id }); } }, '🎮 Jetzt zocken'),
          h('button', { class: 'b', onclick: async () => { if (confirm('„' + g.name + '“ entfernen?')) { list.splice(i, 1); await save(); draw(); } } }, 'Entfernen'))));
    });
    box.append(h('button', { class: 'b', onclick: async () => { list.push({ name: 'Neues Spiel', video: '', videoQuer: '', szene: '' }); await save(); list.splice(0, list.length, ...S.spiele.map(x => ({ ...x }))); draw(); } }, '+ Spiel hinzufügen'));
  };
  draw();
}
// ---------- Galerie ----------
function galerie(m) {
  m.append(h('h1', {}, 'Animationen ansehen'), h('p', { class: 'hint' }, 'Klick aufs Video = mit Ton abspielen. „Im Stream zeigen“ spielt die Animation live in der Browserquelle.'));
  const NAMES = { geschenk: 'TikTok-Geschenke', stufe: 'TikTok-Stufen (alle anderen Geschenke)', ereignis: 'TikTok-Ereignisse', twitch: 'Twitch', knopf: 'Aktionsknöpfe' };
  for (const [g, name] of Object.entries(NAMES)) {
    const items = LIST.filter(a => a.gruppe === g); if (!items.length) continue;
    m.append(h('h2', {}, name), h('div', { class: 'anims' }, ...items.map(a => {
      const src = S.vorne['v_' + a.id] || S.vorne.medienAdresse + a.datei;
      return h('div', { class: 'anim' }, h('video', { src, preload: 'metadata', muted: '', onclick: e => { e.target.muted = false; e.target.currentTime = 0; e.target.play(); } }),
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
  const gifts = [['Rose', 1], ['GG', 1], ['TikTok', 1], ['Finger Heart', 5], ['Heart Me', 1], ['Doughnut', 30], ['Perfume', 20], ['Hand Hearts', 100], ['Sunglasses', 199], ['Money Gun', 500], ['Corgi', 299], ['Baby Chicks', 500], ['Galaxy', 1000], ['Lion', 29999], ['Universe', 34999], ['Blumenstrauß (Stufe)', 30], ['Teures Geschenk (Stufe)', 5000]];
  m.append(h('h2', {}, 'Geschenke'), h('div', { class: 'row' }, ...gifts.map(([g, c]) => h('button', { class: 'b', onclick: () => send('tiktok-gift', { giftName: g.replace(/ \(Stufe\)$/, ''), coins: c, giftAmount: 1 }) }, g))),
    h('h2', {}, 'Ereignisse'), h('div', { class: 'row' }, ...[['tiktok-follower', 'Neuer Follower'], ['tiktok-share', 'Teilen'], ['tiktok-superFan', 'Superfan'], ['tiktok-treasureChest', 'Schatzkiste'], ['tiktok-totalLikes', 'Like-Ziel'], ['tiktok-battleEnd', 'Battle-Ende']]
      .map(([a, l]) => h('button', { class: 'b', onclick: () => send(a, {}) }, l))),
    h('h2', {}, 'Twitch'), h('div', { class: 'row' }, ...[['twitch-follower', 'Follow', {}], ['twitch-subscriber', 'Sub', { subPlan: '1000' }], ['twitch-subscriber', 'Prime-Sub', { subPlan: 'Prime' }],
      ['twitch-subscriber', 'Resub 12 Monate', { subPlan: '1000', subMonths: 12 }], ['twitch-giftSubscription', '5 Geschenk-Subs', { giftAmount: 5, amount: 5 }],
      ['twitch-bits', '50 Bits', { amount: 50 }], ['twitch-bits', '500 Bits', { amount: 500 }], ['twitch-bits', '2000 Bits', { amount: 2000 }], ['twitch-bits', '10000 Bits', { amount: 10000 }],
      ['twitch-hypetrainStarted', 'Hype Train Start', {}], ['twitch-hypetrainLevelProgressed', 'Hype Train Level 3', { level: 3 }], ['twitch-hypetrainEnded', 'Hype Train Ende', { level: 4 }], ['twitch-raid', 'Raid 42', { viewers: 42 }]]
      .map(([a, l, x]) => h('button', { class: 'b', onclick: () => send(a, x) }, l))),
    h('h2', {}, 'Likes'), h('div', { class: 'row' }, ...[10, 50, 200, 1000].map(n => h('button', { class: 'b', onclick: () => send('tiktok-like', { amount: n }) }, n + ' Likes'))));
}
// ---------- Browserquellen ----------
function quellen(m) {
  const o = location.origin;
  const copyRow = (label, url, text) => h('div', { class: 'card' }, h('b', {}, label), h('p', { class: 'hint' }, text),
    h('div', { class: 'copy' }, h('code', {}, url), h('button', { class: 'b', onclick: e => copy(url, e.target) }, 'Kopieren')));
  m.append(h('h1', {}, 'Browserquellen für OBS / TikTok LIVE Studio'), h('p', { class: 'hint' }, 'Einmal einrichten, danach steuerst du alles hier und am Tablet. Größe der Quellen: 1080 × 1920.'),
    copyRow('0. Ganz unten: Spielaufnahme und/oder Drucker-Kamera', '–', 'Als normale OBS-Quellen (Spielaufnahme, Videoaufnahmegerät, Medienquelle/RTSP). Sie sind durch Fenster 1 und 2 sichtbar – Lage und Größe stellst du unter „Hintergrund & Kameras“ ein und schiebst die Quelle in OBS passend darunter.'),
    copyRow('1. Hinten', o + '/quelle/hinten', 'Hintergrund (beide Modi), Musik und die Fenster für Spiel und Kamera.'),
    copyRow('2. Deine Kamera (freigestellt)', '–', 'Deine Kamera mit Hintergrund-Entfernung kommt zwischen die beiden Quellen.'),
    copyRow('3. Vorne (ganz oben)', o + '/quelle/vorne', 'Animationen, Spendername, Banner, Like-Fontäne, Ansagen.'),
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
es.addEventListener('lumia', e => { if (!S) return; S.status = JSON.parse(e.data); if (['start', 'lumia'].includes(page.id)) render(); });
es.addEventListener('log', e => { if (!S) return; const l = JSON.parse(e.data); S.log = [l, ...(S.log || [])].slice(0, 50); const box = $('#log'); if (box) box.prepend(logLine(l)); });
es.addEventListener('obs', e => { if (!S) return; S.obsStatus = JSON.parse(e.data); if (page.id === 'spiele' && !document.activeElement.matches('input,select')) render(); });
es.addEventListener('profil', async () => { if (!S) return; await reload(); renderNav(); });
es.addEventListener('modus', e => { if (!S) return; S.modus = JSON.parse(e.data).modus; if (page.id === 'start') render(); });
load();
