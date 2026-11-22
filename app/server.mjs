// MichaModus Studio – Server
// Verwaltung (/studio), Aktionszentrale (/aktion), Browserquellen (/quelle/vorne, /quelle/hinten).
// Empfängt TikTok-Ereignisse von Lumia Stream (WebSocket) und verteilt alles live per Server-Sent Events.
// Keine Abhängigkeiten außer Node ≥ 22 (eingebauter WebSocket-Client).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const PUBLIC = path.join(ROOT, 'public');
const MEDIA = process.env.MEDIA_DIR || path.join(ROOT, 'medien');
const DATA = process.env.DATA_DIR || '/data';
const UPLOADS = path.join(DATA, 'uploads');
const PORT = Number(process.env.PORT || 8080);
fs.mkdirSync(UPLOADS, { recursive: true });

// ---------- Einstellungen ----------
const DEFAULTS = {
  vorne: JSON.parse(fs.readFileSync(path.join(PUBLIC, 'schema/vorne-data.json'), 'utf8')),
  hinten: JSON.parse(fs.readFileSync(path.join(PUBLIC, 'schema/hinten-data.json'), 'utf8')),
  aktion: JSON.parse(fs.readFileSync(path.join(PUBLIC, 'schema/aktion-data.json'), 'utf8')),
};
DEFAULTS.vorne.medienAdresse = '/animationen/';
Object.assign(DEFAULTS.hinten, { video: '/hintergrund/party-schleife.mp4', zockVideo: '/hintergrund/zockerbude.mp4', musik: '/musik/party-schleife-1.mp3' });
const SETTINGS_FILE = path.join(DATA, 'einstellungen.json');
const SECRET_FILE = path.join(DATA, 'geheim.json');
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const writeJson = (f, v) => { const t = f + '.tmp'; fs.writeFileSync(t, JSON.stringify(v, null, 2)); fs.renameSync(t, f); };
let saved = readJson(SETTINGS_FILE, { vorne: {}, hinten: {}, aktion: {}, lumia: { host: '', port: 39231, an: false }, modus: 'party' });
for (const k of ['vorne', 'hinten', 'aktion']) saved[k] ||= {};
saved.lumia ||= { host: '', port: 39231, an: false };
let secret = readJson(SECRET_FILE, {});
const settingsFor = k => ({ ...DEFAULTS[k], ...saved[k] });
const saveSettings = () => writeJson(SETTINGS_FILE, saved);

// ---------- Live-Verteilung (SSE) ----------
const clients = new Set();
function broadcast(type, data, roles) {
  const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) if (!roles || roles.includes(c.role)) c.res.write(msg);
}
setInterval(() => { for (const c of clients) c.res.write(': ping\n\n'); }, 20000);
const log = [];
function remember(entry) { log.unshift({ at: new Date().toISOString(), ...entry }); log.length = Math.min(log.length, 50); broadcast('log', log[0], ['studio']); }

function fireAlert(alert, source) {
  if (!alert || typeof alert.alert !== 'string') return;
  broadcast('alert', alert, ['vorne']);
  const s = alert.extraSettings || {};
  remember({ art: 'alert', quelle: source, alert: alert.alert, text: [s.username, s.giftName, s.giftAmount && '× ' + s.giftAmount, s.amount && !s.giftName ? s.amount : ''].filter(Boolean).join(' ') });
}

// ---------- Lumia-Verbindung ----------
const lumia = { status: 'aus', fehler: '', seit: null, ereignisse: 0 };
let ws = null, retry = null;
function lumiaStatus() { broadcast('lumia', lumia, ['studio']); }
function lumiaConnect() {
  clearTimeout(retry);
  if (ws) { try { ws.onclose = null; ws.close(); } catch {} ws = null; }
  const { host, port, an } = saved.lumia;
  if (!an || !host || !secret.lumiaToken) { Object.assign(lumia, { status: 'aus', fehler: an ? 'Adresse oder Schlüssel fehlt' : '' }); return lumiaStatus(); }
  Object.assign(lumia, { status: 'verbinde', fehler: '' }); lumiaStatus();
  try {
    ws = new WebSocket(`ws://${host}:${Number(port) || 39231}/api?token=${encodeURIComponent(secret.lumiaToken)}&name=MichaModus%20Studio`);
  } catch (e) { Object.assign(lumia, { status: 'fehler', fehler: String(e.message || e) }); lumiaStatus(); retry = setTimeout(lumiaConnect, 10000); return; }
  ws.onopen = () => { Object.assign(lumia, { status: 'verbunden', fehler: '', seit: new Date().toISOString() }); lumiaStatus(); };
  // Achtung: Lumia führt jede gesendete Nachricht als Befehl aus – wir senden NICHTS.
  ws.onmessage = (m) => {
    let e; try { e = JSON.parse(typeof m.data === 'string' ? m.data : m.data.toString()); } catch { return; }
    if (e && e.type === 'alert' && e.event) {
      lumia.ereignisse++;
      const d = e.data || {};
      fireAlert({ alert: e.event, origin: e.origin, dynamic: d.dynamic || {}, extraSettings: d.extraSettings || {} }, 'lumia');
    }
  };
  ws.onerror = () => {};
  ws.onclose = (ev) => {
    Object.assign(lumia, { status: 'getrennt', fehler: ev && ev.code === 1006 ? 'Keine Verbindung – Adresse, Schlüssel und LAN-Zugriff in Lumia prüfen' : '' });
    lumiaStatus(); retry = setTimeout(lumiaConnect, 5000);
  };
}

// ---------- HTTP ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
function sendFile(req, res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('Nicht gefunden'); }
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const head = { 'content-type': type, 'access-control-allow-origin': '*', 'accept-ranges': 'bytes',
      'cache-control': /\.(mp4|webm|mp3|png|jpg)$/i.test(file) ? 'public, max-age=3600' : 'no-cache' };
    const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
    if (range) {
      const start = range[1] ? Number(range[1]) : 0, end = range[2] ? Math.min(Number(range[2]), st.size - 1) : st.size - 1;
      if (start >= st.size || start > end) { res.writeHead(416, { 'content-range': `bytes */${st.size}` }); return res.end(); }
      res.writeHead(206, { ...head, 'content-range': `bytes ${start}-${end}/${st.size}`, 'content-length': end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...head, 'content-length': st.size });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}
function safeJoin(base, rel) { const p = path.normalize(path.join(base, rel)); return p.startsWith(base + path.sep) || p === base ? p : null; }
function body(req, limit = 1e6) {
  return new Promise((ok, fail) => { let n = 0; const parts = [];
    req.on('data', c => { n += c.length; if (n > limit) { fail(new Error('zu groß')); req.destroy(); } else parts.push(c); });
    req.on('end', () => ok(Buffer.concat(parts))); req.on('error', fail); });
}
const json = (res, code, v) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(v)); };
const ROLES = ['vorne', 'hinten', 'studio', 'aktion'];
const PAGES = { '/': 'studio/index.html', '/studio': 'studio/index.html', '/aktion': 'aktion/index.html', '/quelle/vorne': 'quelle/vorne.html', '/quelle/hinten': 'quelle/hinten.html' };
const UPLOAD_EXT = /^\.(mp4|webm|mp3|ogg|wav|png|jpg)$/i;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = decodeURIComponent(url.pathname);
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD' && p.startsWith('/api/') && req.headers['x-mm'] !== '1') return json(res, 403, { fehler: 'Kopf X-MM fehlt' });
    if (p === '/api/events') {
      const role = ROLES.includes(url.searchParams.get('rolle')) ? url.searchParams.get('rolle') : 'studio';
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
      const c = { res, role }; clients.add(c); req.on('close', () => clients.delete(c));
      res.write(`event: hallo\ndata: ${JSON.stringify({ modus: saved.modus })}\n\n`);
      if (role === 'studio') { res.write(`event: lumia\ndata: ${JSON.stringify(lumia)}\n\n`); }
      return;
    }
    if (p === '/api/settings' && req.method === 'GET') return json(res, 200, {
      vorne: settingsFor('vorne'), hinten: settingsFor('hinten'), aktion: settingsFor('aktion'), modus: saved.modus,
      lumia: { ...saved.lumia, schluessel: !!secret.lumiaToken }, status: lumia, log,
      quellen: [...clients].reduce((a, c) => (a[c.role] = (a[c.role] || 0) + 1, a), {}) });
    if (p === '/api/settings' && req.method === 'POST') {
      const b = JSON.parse((await body(req)).toString() || '{}');
      for (const k of ['vorne', 'hinten', 'aktion']) if (b[k] && typeof b[k] === 'object') {
        for (const [key, v] of Object.entries(b[k])) {
          if (!(key in DEFAULTS[k]) || !['string', 'number', 'boolean'].includes(typeof v)) continue;
          if (v === DEFAULTS[k][key]) delete saved[k][key]; else saved[k][key] = typeof v === 'string' ? v.slice(0, 5000) : v;
        }
        broadcast('settings', { bereich: k, werte: settingsFor(k) }, [k === 'vorne' ? 'vorne' : k === 'hinten' ? 'hinten' : 'aktion']);
      }
      if (b.reset && ['vorne', 'hinten', 'aktion'].includes(b.reset)) { saved[b.reset] = {}; broadcast('settings', { bereich: b.reset, werte: settingsFor(b.reset) }, [b.reset]); }
      saveSettings(); return json(res, 200, { ok: true });
    }
    if (p === '/api/lumia' && req.method === 'POST') {
      const b = JSON.parse((await body(req)).toString() || '{}');
      saved.lumia = { host: String(b.host || '').trim().slice(0, 100), port: Number(b.port) || 39231, an: !!b.an };
      if (typeof b.schluessel === 'string' && b.schluessel.trim()) { secret.lumiaToken = b.schluessel.trim(); writeJson(SECRET_FILE, secret); }
      if (b.schluesselLoeschen) { delete secret.lumiaToken; writeJson(SECRET_FILE, secret); }
      saveSettings(); lumiaConnect(); return json(res, 200, { ok: true });
    }
    // Ausweichweg: Lumia (oder anderes) schickt Ereignisse per HTTP
    if (p === '/api/ereignis' && req.method === 'POST') {
      const b = JSON.parse((await body(req)).toString() || '{}');
      const e = b.type === 'alert' ? { alert: b.event, dynamic: b.data?.dynamic, extraSettings: b.data?.extraSettings } : b;
      fireAlert(e, 'http'); return json(res, 200, { ok: true });
    }
    if (p === '/api/test' && req.method === 'POST') { const b = JSON.parse((await body(req)).toString() || '{}'); fireAlert(b, 'test'); return json(res, 200, { ok: true }); }
    if (p === '/api/aktion' && req.method === 'POST') {
      const raw = (await body(req, 4000)).toString();
      let a; try { a = JSON.parse(raw); } catch { return json(res, 400, { fehler: 'ungültig' }); }
      broadcast('aktion', a, ['vorne', 'hinten']); remember({ art: 'aktion', quelle: 'knopf', text: a.label || a.id });
      return json(res, 200, { ok: true });
    }
    if (p === '/api/modus' && req.method === 'POST') {
      const b = JSON.parse((await body(req)).toString() || '{}');
      saved.modus = b.modus === 'zocken' ? 'zocken' : 'party'; saveSettings();
      broadcast('modus', { modus: saved.modus }); remember({ art: 'modus', quelle: 'knopf', text: saved.modus });
      return json(res, 200, { ok: true });
    }
    if (p.startsWith('/api/upload/') && req.method === 'POST') {
      const [, , , bereich, key] = p.split('/');
      const name = String(url.searchParams.get('name') || '');
      const ext = path.extname(name).toLowerCase();
      if (!['vorne', 'hinten'].includes(bereich) || !(key in DEFAULTS[bereich]) || !UPLOAD_EXT.test(ext)) return json(res, 400, { fehler: 'Feld oder Dateityp ungültig' });
      const data = await body(req, 300e6);
      const file = `${bereich}-${key}-${crypto.randomBytes(4).toString('hex')}${ext}`;
      fs.writeFileSync(path.join(UPLOADS, file), data);
      const old = saved[bereich][key];
      saved[bereich][key] = '/uploads/' + file; saveSettings();
      if (old && old.startsWith('/uploads/')) fs.rm(path.join(UPLOADS, path.basename(old)), () => {});
      broadcast('settings', { bereich, werte: settingsFor(bereich) }, [bereich]);
      return json(res, 200, { ok: true, adresse: saved[bereich][key] });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 404, { fehler: 'unbekannt' });
    if (PAGES[p]) return sendFile(req, res, path.join(PUBLIC, PAGES[p]));
    if (p.startsWith('/uploads/')) { const f = safeJoin(UPLOADS, p.slice(9)); return f ? sendFile(req, res, f) : json(res, 400, {}); }
    const pub = safeJoin(PUBLIC, p.slice(1));
    if (pub && fs.existsSync(pub) && fs.statSync(pub).isFile()) return sendFile(req, res, pub);
    const med = safeJoin(MEDIA, p.slice(1));
    if (med) return sendFile(req, res, med);
    json(res, 404, {});
  } catch (e) { json(res, 500, { fehler: 'Interner Fehler' }); console.error(e); }
});
server.listen(PORT, () => { console.log(`MichaModus Studio läuft auf Port ${PORT}`); lumiaConnect(); });
