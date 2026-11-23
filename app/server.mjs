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
// Programmstand (Prüfsumme der Oberflächen-Dateien): ändert er sich nach einem Update, laden sich alle Quellen/Seiten selbst neu
const STAND = (() => { const h = crypto.createHash('sha1'); const lauf = d => { for (const f of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const q = path.join(d, f.name); if (f.isDirectory()) lauf(q); else h.update(f.name).update(fs.readFileSync(q)); } };
  try { lauf(PUBLIC); } catch {} return h.digest('hex').slice(0, 12); })();
const MEDIA = process.env.MEDIA_DIR || path.join(ROOT, 'medien');
const DATA = process.env.DATA_DIR || '/data';
const UPLOADS = path.join(DATA, 'uploads');
const PORT = Number(process.env.PORT || 8080);
fs.mkdirSync(UPLOADS, { recursive: true });
const TTS_DIR = path.join(DATA, 'tts'); fs.mkdirSync(TTS_DIR, { recursive: true });

// ---------- Einstellungen ----------
const DEFAULTS = {
  vorne: JSON.parse(fs.readFileSync(path.join(PUBLIC, 'schema/vorne-data.json'), 'utf8')),
  hinten: JSON.parse(fs.readFileSync(path.join(PUBLIC, 'schema/hinten-data.json'), 'utf8')),
  aktion: JSON.parse(fs.readFileSync(path.join(PUBLIC, 'schema/aktion-data.json'), 'utf8')),
};
DEFAULTS.vorne.medienAdresse = '/animationen/';
Object.assign(DEFAULTS.vorne, { likeSound: '/sounds/likes.mp3', sound_start: '/sounds/start.mp3', sound_pause: '/sounds/pause.mp3', sound_gleich: '/sounds/gleich.mp3', sound_weiter: '/sounds/weiter.mp3', sound_ende: '/sounds/ende.mp3' });
// BRB/Technik: eigene Sounds und Schleifen, sobald sie im Image liegen (sonst Pause-Sound bzw. Spiel-Hintergrund)
{ const ex = f => fs.existsSync(path.join(MEDIA, f)) ? '/' + f : '';
  Object.assign(DEFAULTS.vorne, { sound_brb: ex('sounds/brb.mp3') || '/sounds/pause.mp3', sound_technik: ex('sounds/technik.mp3') || '/sounds/gleich.mp3',
    brbVideo: ex('hintergrund/brb.mp4'), brbVideoQuer: ex('hintergrund/brb-quer.mp4'), technikVideo: ex('hintergrund/technik.mp4'), technikVideoQuer: ex('hintergrund/technik-quer.mp4') }); }
Object.assign(DEFAULTS.hinten, { video: '/hintergrund/party-schleife.mp4', zockVideo: '/hintergrund/zockerbude.mp4', videoQuer: '/hintergrund/party-schleife-quer.mp4', zockVideoQuer: '/hintergrund/zockerbude-quer.mp4', modusSound: '/sounds/modus.mp3', musik: '/musik/party-schleife-1.mp3' });
// Kanäle (Profile): ein Programm, umschaltbar in Verwaltung und Steuerung; jeder Kanal hat eigene Einstellungen
const PRESETS = {
  michamodus: { name: 'MichaModus', vorne: {}, hinten: {}, aktion: { titel: 'MichaModus · Steuerung' } },
  '3dbymicha': { name: '3dbymicha',
    vorne: { bannerText: '3dbymicha', slogans: ['Werde Teil von 3dbymicha!', 'Live aus der Druckwerkstatt 🖨️', 'Folgen & zusehen, wie es entsteht',
      'Like-Herzen an – wir drucken weiter!', 'Hier wird gedruckt, getüftelt & gelacht 😄', 'Wünsch dir ein Modell im Chat 💬', 'Jede Rose zählt 🌹', 'Neu hier? Sag Hallo 👋'].join('\n'),
      bannerFarbe1: '#ff7a00', bannerFarbe2: '#00c2ff', bannerFarbe3: '#ffd54f' },
    hinten: { video: '/hintergrund/werkstatt.mp4', videoQuer: '/hintergrund/werkstatt-quer.mp4', f2Wann: 'immer', f1Y: 56, f1Hoehe: 30, f1Schild: '🖨️ PRINTMODUS' },
    aktion: { titel: '3dbymicha · Steuerung', modus1Name: 'Werkstatt', modus2Name: 'Printmodus', modus2Ico: '🖨️', spieleAn: false } },
};
const BEREICHE = ['vorne', 'hinten', 'aktion'];
const defaultsFor = (profil, k) => ({ ...DEFAULTS[k], ...((PRESETS[profil] || {})[k] || {}) });
const SETTINGS_FILE = path.join(DATA, 'einstellungen.json');
const SECRET_FILE = path.join(DATA, 'geheim.json');
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const writeJson = (f, v) => { const t = f + '.tmp'; fs.writeFileSync(t, JSON.stringify(v, null, 2)); fs.renameSync(t, f); };
// Prüfen, ob /data wirklich ein Ordner vom Server ist (Unraid-Pfad) – sonst gehen Einstellungen bei jedem Update verloren
const datenDauerhaft = (() => {
  if (process.env.NODE_ENV !== 'production') return true;
  try {
    const mi = fs.readFileSync('/proc/self/mountinfo', 'utf8').split('\n').map(l => l.split(' '));
    const m = mi.find(x => x[4] === path.resolve(DATA));
    if (!m) return false;
    const quelle = m[3] || '';
    // anonymes Docker-Volume liegt unter …/docker/volumes/<hash>/_data
    return !/\/volumes\/[0-9a-f]{20,}\/_data/.test(quelle);
  } catch { return true; }
})();
if (!datenDauerhaft) console.warn('ACHTUNG: ' + DATA + ' ist nicht als Ordner eingebunden – Einstellungen gehen beim Update verloren!');
let saved = readJson(SETTINGS_FILE, {});
saved.profile ||= {};
// Übernahme aus der Einzel-Kanal-Version (vor 22.11.2026 abends): alte Werte gehören zum Kanal aus KANAL
if (saved.vorne || saved.hinten || saved.aktion) {
  const alt = String(process.env.KANAL || 'michamodus').toLowerCase();
  saved.profile[alt] = { vorne: saved.vorne || {}, hinten: saved.hinten || {}, aktion: saved.aktion || {} };
  delete saved.vorne; delete saved.hinten; delete saved.aktion;
}
for (const p of Object.keys(PRESETS)) { saved.profile[p] ||= {}; for (const k of BEREICHE) saved.profile[p][k] ||= {}; }
saved.profil = PRESETS[saved.profil] ? saved.profil : (PRESETS[String(process.env.KANAL || '').toLowerCase()] ? String(process.env.KANAL).toLowerCase() : 'michamodus');
saved.lumia ||= { host: '', port: 39231, an: false };
saved.modus ||= 'party';
saved.spiele ||= [{ id: 'standard', name: 'Allgemein', video: '', videoQuer: '', szene: '' }];
// Musik-Bibliothek (medien/musik, erzeugt mit fal.ai / ElevenLabs Music) – „standard“ = Musik aus den Hintergrund-Einstellungen
const MUSIK = [
  { id: 'standard', name: 'Party (Standard)', datei: '' }, { id: 'hype', name: 'EDM Hype', datei: '/musik/hype.mp3' }, { id: 'funk', name: 'Funky Groove', datei: '/musik/funk.mp3' },
  { id: 'chill', name: 'Lo-Fi Chill', datei: '/musik/chill.mp3' }, { id: 'lofi', name: 'Lo-Fi Talk (Loft)', datei: '/musik/lofi.mp3' }, { id: 'fantasy', name: 'Fantasy-Abenteuer', datei: '/musik/fantasy.mp3' }, { id: 'space', name: 'Weltraum', datei: '/musik/space.mp3' },
  { id: 'synthwave', name: 'Synthwave Retro', datei: '/musik/synthwave.mp3' }, { id: 'chiptune', name: '8-Bit Jump & Run', datei: '/musik/chiptune.mp3' },
  { id: 'mittelalter', name: 'Mittelalter-Dorf', datei: '/musik/mittelalter.mp3' }, { id: 'mystisch', name: 'Mystisch', datei: '/musik/mystisch.mp3' },
].filter(x => !x.datei || fs.existsSync(path.join(MEDIA, x.datei)));
// Playlist je Genre: <genre>.mp3 + <genre>-2.mp3, -3.mp3 … (alles, was im Medienordner liegt)
for (const x of MUSIK) {
  x.dateien = x.datei ? [x.datei] : [];
  if (!x.datei) continue;
  const base = x.datei.replace(/\.mp3$/, '');
  for (let i = 2; i <= 30; i++) { const f = `${base}-${i}.mp3`; if (fs.existsSync(path.join(MEDIA, f))) x.dateien.push(f); }
}
saved.musik ||= { titel: 'standard', lautstaerke: null, vonSpiel: false };
// Vorgabe-Spiele (22.11.2026): werden einmalig ergänzt, gelöschte kommen nicht wieder
const SPIEL_VORGABEN = [
  ['wow-forever', 'WoW Forever', 'wow-forever', 'fantasy'], ['star-citizen', 'Star Citizen', 'star-citizen', 'space'], ['skerrion', 'Skerrion', 'skerrion', 'mystisch'],
  ['retro', 'Retro-Games', 'retro', 'synthwave'], ['rpg', 'RPG (allgemein)', 'rpg', 'fantasy'], ['scifi', 'Sci-Fi (allgemein)', 'scifi', 'space'],
  ['jumprun', 'Jump & Run', 'jumprun', 'chiptune'], ['pagonia', 'Pioneers of Pagonia', 'aufbau', 'mittelalter'], ['siedler4', 'Die Siedler 4', 'aufbau', 'mittelalter'],
  ['aufbau-strategie', 'Aufbau & Strategie', 'strategie', 'mittelalter'], ['talk', 'Talk-Runde', 'talk', 'lofi', true],
];
saved.spieleVorgaben ||= [];
for (const [id, name, bild, musik, ohneFenster] of SPIEL_VORGABEN) {
  if (saved.spieleVorgaben.includes(id)) continue;
  saved.spieleVorgaben.push(id);
  if (saved.spiele.some(x => x.id === id)) continue;
  const v = `/hintergrund/spiele/${bild}.mp4`, q = `/hintergrund/spiele/${bild}-quer.mp4`;
  saved.spiele.push({ id, name, video: fs.existsSync(path.join(MEDIA, v)) ? v : '', videoQuer: fs.existsSync(path.join(MEDIA, q)) ? q : '', szene: '', musik, ohneFenster: !!ohneFenster,
    ...(id === 'talk' ? { start: 'Talk-Runde startet gleich! | Hol dir einen Kaffee und quatsch mit', ende: 'Danke für die Talk-Runde! | Bis zum nächsten Mal' } : {}) });
}
// Vorgabe-Videos, die erst später ins Image kamen (z. B. Talk-Runde), nachtragen, solange das Spiel noch keins hat
for (const [id, , bild] of SPIEL_VORGABEN) {
  const sp = saved.spiele.find(x => x.id === id); if (!sp) continue;
  const v = `/hintergrund/spiele/${bild}.mp4`, q = `/hintergrund/spiele/${bild}-quer.mp4`;
  if (!sp.video && fs.existsSync(path.join(MEDIA, v))) sp.video = v;
  if (!sp.videoQuer && fs.existsSync(path.join(MEDIA, q))) sp.videoQuer = q;
}
saved.spiel ||= '';
saved.obs ||= { host: '', port: 4455, an: false, szeneZocken: '', szeneParty: '', folgen: true, steuern: true };
// 23.11.2026: Modus 2 heißt bei 3dbymicha „Printmodus“ (alte gespeicherte Standardwerte umstellen)
{ const p3 = saved.profile && saved.profile['3dbymicha'];
  if (p3) { if (p3.aktion && p3.aktion.modus2Name === 'Zockmodus') p3.aktion.modus2Name = 'Printmodus'; if (p3.hinten && p3.hinten.f1Schild === '🎮 ZOCKMODUS') p3.hinten.f1Schild = '🖨️ PRINTMODUS'; } }
// 23.11.2026: Talk-Runde bekommt die neue Lo-Fi-Talk-Playlist (nur wenn noch die alte Vorgabe „chill“ eingestellt ist)
for (const sp of saved.spiele || []) if (sp.id === 'talk' && sp.musik === 'chill') sp.musik = 'lofi';
// Slogan-Korrektur 22.11.2026: MichaModus = Gaming & Spaß, Drucken gehört zu 3dbymicha
for (const p of Object.keys(saved.profile)) { const v = saved.profile[p].vorne; if (v && typeof v.slogans === 'string') v.slogans = v.slogans.replace('Hier wird gedruckt, gelacht & gefeiert', p === '3dbymicha' ? 'Hier wird gedruckt, getüftelt & gelacht 😄' : 'Hier wird gezockt, gelacht & gefeiert 🎮'); }
let secret = readJson(SECRET_FILE, {});
// Sprachausgabe (ElevenLabs): Schlüssel nur in geheim.json, Stimme/Modell in den Einstellungen, fertige Sätze im Zwischenspeicher /data/tts
saved.tts ||= { stimme: '', stimmeName: '', modell: 'eleven_multilingual_v2', stabil: 50, aehnlich: 75 };
const TTS_BASE = process.env.NODE_ENV !== 'production' && process.env.TTS_BASE ? process.env.TTS_BASE : 'https://api.elevenlabs.io';
const ttsLaufend = new Map(); let ttsMinute = 0, ttsZaehler = 0;
// ElevenLabs-Fehler verständlich machen (z. B. fehlende Berechtigung beim API-Schlüssel statt pauschal „ungültig“)
async function elFehler(r) {
  let d = {}; try { d = JSON.parse(await r.text()); } catch {}
  const det = d.detail || {}, st = String(det.status || det.code || ''), msg = String(det.message || (typeof d.detail === 'string' ? d.detail : '') || '');
  if (/missing_permissions/.test(st) || /permission/i.test(msg)) {
    const perm = (msg.match(/permission[s]?\s+([a-z_]+)/i) || [])[1] || '';
    return 'ElevenLabs: Dem API-Schlüssel fehlt eine Berechtigung' + (perm ? ' („' + perm + '“)' : '') + '. In ElevenLabs unter Developers → API Keys beim Schlüssel „Text to Speech“ und „Voices: Lesen“ erlauben (oder „Uneingeschränkt“).';
  }
  if (/invalid_api_key|unauthorized/i.test(st) || r.status === 401) return 'ElevenLabs: Schlüssel wird nicht akzeptiert (' + (st || r.status) + (msg ? ': ' + msg.slice(0, 120) : '') + '). Bitte neu kopieren – ohne Leerzeichen.';
  if (/quota|credits/i.test(st + msg)) return 'ElevenLabs: Kontingent/Zeichen aufgebraucht (' + msg.slice(0, 120) + ')';
  return 'ElevenLabs ' + r.status + (st ? ' ' + st : '') + (msg ? ': ' + msg.slice(0, 160) : '');
}
async function tts(text) {
  text = String(text || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220);
  if (!text) throw Object.assign(new Error('Kein Text'), { code: 400 });
  if (!secret.elevenlabsKey || !saved.tts.stimme) throw Object.assign(new Error('Sprachausgabe nicht eingerichtet'), { code: 409 });
  const t = saved.tts, hash = crypto.createHash('sha256').update([t.stimme, t.modell, t.stabil, t.aehnlich, text].join('|')).digest('hex').slice(0, 32);
  const file = path.join(TTS_DIR, hash + '.mp3'), url = '/tts/' + hash + '.mp3';
  if (fs.existsSync(file)) return url;
  if (ttsLaufend.has(hash)) return ttsLaufend.get(hash);
  const min = Math.floor(Date.now() / 60000); if (min !== ttsMinute) { ttsMinute = min; ttsZaehler = 0; }
  if (++ttsZaehler > 40) throw Object.assign(new Error('Zu viele Sprachausgaben pro Minute'), { code: 429 });
  const job = (async () => {
    const r = await fetch(`${TTS_BASE}/v1/text-to-speech/${encodeURIComponent(t.stimme)}?output_format=mp3_44100_128`, {
      method: 'POST', headers: { 'xi-api-key': secret.elevenlabsKey, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: t.modell || 'eleven_multilingual_v2', voice_settings: { stability: (Number(t.stabil) || 50) / 100, similarity_boost: (Number(t.aehnlich) || 75) / 100 } }),
      signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw Object.assign(new Error(await elFehler(r)), { code: 502 });
    const buf = Buffer.from(await r.arrayBuffer()); fs.writeFileSync(file + '.tmp', buf); fs.renameSync(file + '.tmp', file);
    // Zwischenspeicher klein halten: höchstens 500 Sätze
    const alle = fs.readdirSync(TTS_DIR).filter(f => f.endsWith('.mp3')).map(f => ({ f, t: fs.statSync(path.join(TTS_DIR, f)).mtimeMs })).sort((a, b) => a.t - b.t);
    for (const x of alle.slice(0, Math.max(0, alle.length - 500))) fs.rm(path.join(TTS_DIR, x.f), () => {});
    return url;
  })().finally(() => ttsLaufend.delete(hash));
  ttsLaufend.set(hash, job); return job;
}
const cur = () => saved.profile[saved.profil];
const settingsFor = (k, profil = saved.profil) => ({ ...defaultsFor(profil, k), ...saved.profile[profil][k] });
const profilListe = () => Object.entries(PRESETS).map(([id, p]) => ({ id, name: p.name }));
const saveSettings = () => writeJson(SETTINGS_FILE, saved);
const quellenListe = () => [...clients].filter(c => c.role === 'vorne' || c.role === 'hinten').map(c => ({ rolle: c.role, format: c.format, pfad: c.pfad, groesse: c.groesse }));
function broadcastAll() { for (const k of BEREICHE) broadcast('settings', { bereich: k, werte: settingsFor(k) }, [k]); fensterMelden(); }

// ---------- Live-Verteilung (SSE) ----------
const clients = new Set();
function broadcast(type, data, roles) {
  const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) if (!roles || roles.includes(c.role)) c.res.write(msg);
}
setInterval(() => { for (const c of clients) c.res.write(': ping\n\n'); }, 20000);
const log = [];
function remember(entry) { log.unshift({ at: new Date().toISOString(), ...entry }); log.length = Math.min(log.length, 50); broadcast('log', log[0], ['studio']); }

// StreamPrint: Lumia-Ereignis in dessen /event-Format übersetzen
function toStreamPrint(a) {
  const s = a.extraSettings || {}, d = a.dynamic || {}, n = (x, y = 0) => Number(x) || y;
  const base = { user: s.displayname || s.username || '', avatar: s.avatar || '', text: s.message || '', hide_amount: true };
  const map = {
    'tiktok-gift': () => ({ event: 'gift', platform: 'tiktok', diamonds: n(s.coins, n(s.diamonds, 1)) * n(s.giftAmount, 1), gift_name: s.giftName, gift_id: String(s.giftId || ''), count: n(s.giftAmount, 1), icon: s.giftPictureUrl || s.contentImage || '' }),
    'tiktok-follower': () => ({ event: 'follow', platform: 'tiktok' }),
    'tiktok-subscriber': () => ({ event: 'sub', platform: 'tiktok' }),
    'twitch-follower': () => ({ event: 'follow', platform: 'twitch' }),
    'twitch-bits': () => ({ event: 'bits', platform: 'twitch', bits: n(s.amount, n(d.value)) }),
    'twitch-subscriber': () => ({ event: 'sub', platform: 'twitch', months: n(s.subMonths, 1), sub_tier: /3000/.test(s.subPlan) ? 3 : /2000/.test(s.subPlan) ? 2 : 1, prime: /prime/i.test(String(s.subPlan)) }),
    'twitch-giftSubscription': () => ({ event: 'subgift', platform: 'twitch', gifts: n(s.giftAmount, n(s.amount, 1)) }),
    'twitch-raid': () => ({ event: 'raid', platform: 'twitch', viewers: n(s.viewers, n(s.amount)) }),
  };
  return map[a.alert] ? { ...base, ...map[a.alert]() } : null;
}
function forwardStreamPrint(a, source) {
  const v = settingsFor('vorne');
  if (!v.spWeiterleiten || !/^https?:\/\//.test(v.spEventUrl || '')) return;
  const ev = toStreamPrint(a); if (!ev) return;
  if (source === 'test') ev._demo = true; // Testereignisse nie auf Papier
  fetch(v.spEventUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(ev), signal: AbortSignal.timeout(4000) })
    .catch(e => remember({ art: 'fehler', quelle: 'streamprint', text: 'StreamPrint nicht erreichbar: ' + (e.message || e) }));
}
// ---------- Chat (gemischt aus allen Plattformen, die Lumia liefert) ----------
const chatLog = [];
const PLATTFORMEN = ['tiktok', 'twitch', 'youtube', 'kick', 'facebook', 'trovo'];
function chatIn(e, quelle) {
  const d = e.data || {}, x = d.extraSettings || d;
  if (d.shouldRemove || x.shouldRemove) { broadcast('chat', { entfernen: String(d.shouldRemove || x.shouldRemove) }, ['vorne']); return; }
  const plattform = String(e.origin || x.platform || x.origin || '').toLowerCase();
  const text = String(x.message ?? x.text ?? d.message ?? '').slice(0, 300);
  const name = String(x.displayname || x.displayName || x.username || d.username || '').slice(0, 40);
  if (!text || !name) return;
  const m = { id: String(x.id || x.messageId || d.id || crypto.randomBytes(6).toString('hex')).slice(0, 80), plattform: PLATTFORMEN.includes(plattform) ? plattform : (plattform || 'chat'),
    name, text, avatar: /^https?:\/\//.test(x.avatar || '') ? String(x.avatar).slice(0, 400) : '', farbe: /^#[0-9a-f]{3,8}$/i.test(x.userColor || '') ? x.userColor : '', quelle, at: Date.now() };
  chatLog.push(m); if (chatLog.length > 40) chatLog.shift();
  broadcast('chat', m, ['vorne', 'studio']);
}
// Wand-Monitor im Hintergrund: die letzten Unterstützer (Follows, Geschenke, Subs, Bits, Raids …)
// bleibt den ganzen Stream erhalten (auch über Neustart/Update), neuer Stream = nach mehr als `monPauseStd` (6) Stunden ohne Ereignis
const letzte = Array.isArray(saved.letzte) ? saved.letzte : [];
const streamPause = () => (Number(settingsFor('hinten').monPauseStd) || 6) * 3600e3;
function monitorEintrag(a, source) {
  const s = a.extraSettings || {}, d = a.dynamic || {}, n = x => Number(x) || 0;
  const name = String(s.displayname || s.username || '').slice(0, 40), al = a.alert;
  const tw = al.startsWith('twitch-'), plan = String(s.subPlan || s.tier || '');
  let icon = '', text = '';
  if (al === 'tiktok-gift') { const m = n(s.giftAmount) || 1; icon = /rose/i.test(s.giftName || '') ? '🌹' : '🎁'; text = (m > 1 ? m + '× ' : '') + (s.giftName || 'Geschenk'); }
  else if (al === 'tiktok-follower' || al === 'twitch-follower') { icon = '➕'; text = 'folgt jetzt'; }
  else if (al === 'tiktok-share') { icon = '🔁'; text = 'hat das Live geteilt'; }
  else if (al === 'tiktok-superFan') { icon = '⭐'; text = 'ist jetzt Superfan'; }
  else if (al === 'tiktok-treasureChest') { icon = '💰'; text = 'öffnet eine Schatzkiste'; }
  else if (al === 'twitch-subscriber') { icon = '💜'; const mo = n(s.subMonths || d.subMonths); text = /prime/i.test(plan) ? 'abonniert mit Prime' : mo > 1 ? mo + ' Monate Abo' : 'abonniert'; }
  else if (al === 'twitch-giftSubscription') { icon = '🎁'; text = 'verschenkt ' + (n(s.giftAmount || s.amount || d.value) || 1) + ' Sub(s)'; }
  else if (al === 'twitch-bits') { icon = '💎'; text = (n(s.amount || d.value) || 1) + ' Bits'; }
  else if (al === 'twitch-raid') { icon = '🚀'; text = 'Raid mit ' + (n(s.viewers || s.amount || d.value) || 1); }
  else if (al === 'twitch-hypetrainStarted') { icon = '🚂'; text = 'Hype Train gestartet'; }
  else return;
  if (!name && !al.startsWith('twitch-hypetrain')) return;
  if (letzte.length && Date.now() - letzte[0].at > streamPause()) letzte.length = 0; // neuer Stream → neue Liste
  letzte.unshift({ id: crypto.randomBytes(4).toString('hex'), at: Date.now(), plattform: tw ? 'twitch' : 'tiktok', icon, name: name || 'Hype Train', text: String(text).slice(0, 60), test: source === 'test' });
  letzte.length = Math.min(letzte.length, 50);
  saved.letzte = letzte; saveSettings();
  broadcast('letzte', letzte, ['hinten']);
}
function fireAlert(alert, source) {
  if (!alert || typeof alert.alert !== 'string') return;
  broadcast('alert', alert, ['vorne']);
  monitorEintrag(alert, source);
  forwardStreamPrint(alert, source);
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
    ws = new WebSocket(`ws://${host}:${Number(port) || 39231}/api?token=${encodeURIComponent(secret.lumiaToken)}&name=${encodeURIComponent('Live-Studio')}`);
  } catch (e) { Object.assign(lumia, { status: 'fehler', fehler: String(e.message || e) }); lumiaStatus(); retry = setTimeout(lumiaConnect, 10000); return; }
  ws.onopen = () => { Object.assign(lumia, { status: 'verbunden', fehler: '', seit: new Date().toISOString() }); lumiaStatus(); };
  // Achtung: Lumia führt jede gesendete Nachricht als Befehl aus – wir senden NICHTS.
  ws.onmessage = (m) => {
    let e; try { e = JSON.parse(typeof m.data === 'string' ? m.data : m.data.toString()); } catch { return; }
    if (e && e.type === 'chat') { lumia.ereignisse++; return chatIn(e, 'lumia'); }
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

// ---------- Modus, Spiel, OBS ----------
const spielInfo = () => { const sp = saved.spiele.find(x => x.id === saved.spiel); return sp ? { id: sp.id, name: sp.name, video: sp.video || '', videoQuer: sp.videoQuer || '', ohneFenster: !!sp.ohneFenster, start: sp.start || '', ende: sp.ende || '' } : null; };
// Musik: Titel + Lautstärke für alle hinteren Quellen (Lautstärke null = Wert aus den Hintergrund-Einstellungen)
const musikInfo = () => {
  const t = saved.musik.titel, x = MUSIK.find(m => m.id === t);
  const vol = saved.musik.lautstaerke ?? settingsFor('hinten').musikLautstaerke ?? 35;
  const dateien = t === 'aus' ? [] : (x && x.dateien && x.dateien.length ? x.dateien : [settingsFor('hinten').musik].filter(Boolean));
  return { titel: t === 'aus' ? 'aus' : (x ? x.id : 'standard'), datei: dateien[0] || '', dateien, reihenfolge: saved.musik.reihenfolge || 'zufall', weiter: saved.musik.weiter || 0,
    lautstaerke: Number(vol), liste: MUSIK.map(({ id, name, dateien }) => ({ id, name, anzahl: (dateien || []).length || 1 })) };
};
function setMusik(m, quelle) {
  if (m.titel === 'an') m.titel = saved.musik.titel === 'aus' ? (saved.musik.vorher || 'standard') : saved.musik.titel; // Schnellknopf: letzten Titel wieder starten
  if (m.titel !== undefined) {
    if (m.titel === 'aus' && saved.musik.titel !== 'aus') saved.musik.vorher = saved.musik.titel;
    saved.musik.titel = m.titel === 'aus' || MUSIK.some(x => x.id === m.titel) ? m.titel : 'standard'; saved.musik.vonSpiel = !!m.vonSpiel; }
  if (m.reihenfolge === 'zufall' || m.reihenfolge === 'nacheinander') saved.musik.reihenfolge = m.reihenfolge;
  if (m.weiter) saved.musik.weiter = Date.now();
  if (m.lautstaerke !== undefined) saved.musik.lautstaerke = Math.max(0, Math.min(100, Math.round(Number(m.lautstaerke) || 0)));
  saveSettings(); broadcast('musik', musikInfo());
  if (m.titel !== undefined && quelle) remember({ art: 'modus', quelle, text: 'Musik: ' + (saved.musik.titel === 'aus' ? 'aus' : (MUSIK.find(x => x.id === saved.musik.titel) || {}).name) });
}
// Fenster (1 = Spiel, 2 = Drucker-Kamera) per Knopf erzwingen: true/false, null = wie im Studio eingestellt („Fenster zeigen“)
saved.fenster ||= { 1: saved.fensterAus ? false : null, 2: null }; delete saved.fensterAus; saved.fenster[3] ??= null;
const fensterStand = () => ({ 1: saved.fenster[1] ?? null, 2: saved.fenster[2] ?? null, 3: saved.fenster[3] ?? null });
function fensterSichtbar(nr) {
  if (saved.fenster[nr] === true || saved.fenster[nr] === false) return saved.fenster[nr];
  const w = settingsFor('hinten')['f' + nr + 'Wann'] || 'aus', sp = saved.spiele.find(x => x.id === saved.spiel);
  if (saved.modus === 'zocken' && sp && sp.ohneFenster && w !== 'immer') return false;
  return w === 'immer' || w === saved.modus;
}
// Wand-Monitor nur sinnvoll, wenn kein Spielfenster offen ist und (je nach Einstellung) im Zockmodus → nur dann Kachel am iPad zeigen
const monitorArt = () => (saved.monitor === true ? 'liste' : saved.monitor || '');
const monitorMoeglich = () => !fensterSichtbar(1) && ((settingsFor('hinten').monWann || 'zocken') === 'immer' || saved.modus === 'zocken');
const fensterSicht = () => ({ 1: fensterSichtbar(1), 2: fensterSichtbar(2), 3: fensterSichtbar(3), monitor: monitorArt() === 'liste', 'monitor-drucker': monitorArt() === 'drucker', monitorMoeglich: monitorMoeglich() });
const fensterMelden = () => broadcast('fenster', fensterSicht(), ['aktion']);
function setModus(modus, spielId, quelle, fromObs) {
  const m = modus === 'zocken' ? 'zocken' : 'party';
  const changed = m !== saved.modus || (spielId !== undefined && spielId !== saved.spiel);
  saved.modus = m;
  if (spielId !== undefined) saved.spiel = saved.spiele.some(x => x.id === spielId) ? spielId : '';
  saveSettings();
  if (changed) {
    broadcast('modus', { modus: saved.modus, spiel: spielInfo() }); fensterMelden();
    // Musik je Spiel: beim Zocken die Musik des Spiels, zurück in Modus 1 wieder Standard (nur wenn das Spiel sie gesetzt hatte)
    const sp = saved.spiele.find(x => x.id === saved.spiel);
    if (m === 'zocken' && sp && sp.musik && sp.musik !== saved.musik.titel && saved.musik.titel !== 'aus') setMusik({ titel: sp.musik, vonSpiel: true });
    else if (m === 'party' && saved.musik.vonSpiel) setMusik({ titel: 'standard' });
    remember({ art: 'modus', quelle, text: saved.modus + (saved.modus === 'zocken' && spielInfo() ? ' · ' + spielInfo().name : '') });
  }
  // Rückmeldung für die Steuerung: was ist mit OBS passiert?
  let obsInfo = '';
  if (!fromObs) {
    const sp = saved.spiele.find(x => x.id === saved.spiel);
    // Spiel mit eigener Szene › Talk-Runde (ohne Spielfenster) → Party-Szene › Zock-Szene
    let scene = m === 'zocken' ? (sp && sp.szene) || (sp && sp.ohneFenster ? saved.obs.szeneParty || saved.obs.szeneZocken : saved.obs.szeneZocken) : saved.obs.szeneParty;
    let geraten = false;
    if (!scene && saved.obs.an && saved.obs.steuern && obs.status === 'verbunden') { scene = rateSzene(m === 'zocken' && !(sp && sp.ohneFenster) ? 'zocken' : 'party'); geraten = !!scene; }
    if (!saved.obs.an) obsInfo = 'OBS-Kopplung ist aus (Studio → Spiele & OBS)';
    else if (!saved.obs.steuern) obsInfo = '„Modus schaltet die OBS-Szene“ ist aus';
    else if (!scene) obsInfo = 'Keine OBS-Szene für ' + (m === 'zocken' ? (sp ? '„' + sp.name + '“ bzw. den Zockmodus' : 'den Zockmodus') : 'Party') + ' eingestellt (Studio → Spiele & OBS)';
    else if (obs.status !== 'verbunden') obsInfo = 'OBS nicht verbunden' + (obs.fehler ? ': ' + obs.fehler : '');
    else if (obs.szenen.length && !obs.szenen.includes(scene)) {
      // Name weicht ab (Groß/klein, Leerzeichen) oder Szene umbenannt → passende suchen
      const norm = x => String(x).toLowerCase().replace(/\s+/g, ' ').trim();
      const treffer = obs.szenen.find(n => norm(n) === norm(scene)) || rateSzene(m === 'zocken' && !(sp && sp.ohneFenster) ? 'zocken' : 'party');
      if (treffer) { const alt = scene; scene = treffer; geraten = norm(treffer) !== norm(alt); }
      else obsInfo = 'OBS-Szene „' + scene + '“ gibt es nicht (vorhanden: ' + obs.szenen.join(', ') + ')';
    }
    if (!obsInfo && scene && saved.obs.an && saved.obs.steuern && obs.status === 'verbunden') {
      return obsRequest('SetCurrentProgramScene', { sceneName: scene }).then(r => {
        if (!r.ok) { remember({ art: 'fehler', quelle: 'obs', text: 'Szene „' + scene + '“ nicht geschaltet – ' + r.fehler }); return 'Szene „' + scene + '“ nicht geschaltet – ' + r.fehler; }
        return 'OK:' + scene + (geraten ? ' (automatisch nach Namen gewählt – im Studio fest einstellen)' : '');
      });
    }
    if (obsInfo && saved.obs.an) remember({ art: 'fehler', quelle: 'obs', text: obsInfo });
  }
  return Promise.resolve(obsInfo);
}

// OBS (obs-websocket v5, in OBS ab Version 28 eingebaut: Werkzeuge → WebSocket-Server-Einstellungen)
const obs = { status: 'aus', fehler: '', szenen: [], aktuell: '' };
let ows = null, oretry = null, lastSetScene = '', lastSetAt = 0, reqId = 0;
const obsStatus = () => broadcast('obs', obs, ['studio']);
function obsSend(op, d) { if (ows && ows.readyState === 1) ows.send(JSON.stringify({ op, d })); }
const obsWartet = new Map();
// Anfrage an OBS; Promise mit der Antwort (oder Fehlertext nach 2 s)
function obsRequest(requestType, requestData) {
  if (requestType === 'SetCurrentProgramScene') { lastSetScene = requestData.sceneName; lastSetAt = Date.now(); }
  const requestId = String(++reqId);
  obsSend(6, { requestType, requestId, requestData });
  return new Promise(res => {
    const t = setTimeout(() => { obsWartet.delete(requestId); res({ ok: false, fehler: 'OBS antwortet nicht' }); }, 2000);
    obsWartet.set(requestId, st => { clearTimeout(t); obsWartet.delete(requestId); res(st && st.result ? { ok: true } : { ok: false, fehler: 'OBS: ' + ((st && st.comment) || 'Code ' + (st && st.code)) }); });
  });
}
// Szenen automatisch zuordnen, wenn im Studio keine gewählt ist (nach Namen)
function rateSzene(m) {
  const re = m === 'zocken' ? /zock|gam(e|ing)|spiel|play/i : /party|chat|talk|plaud|cam|kamera|haupt|main/i;
  return obs.szenen.find(n => re.test(n)) || '';
}
function obsScene(name) {
  obs.aktuell = name; obsStatus();
  if (!saved.obs.folgen) return;
  if (name === lastSetScene && Date.now() - lastSetAt < 5000) return; // Echo unserer eigenen Umschaltung
  const sp = saved.spiele.find(x => x.szene && x.szene === name);
  if (sp) return setModus('zocken', sp.id, 'obs', true);
  if (saved.obs.szeneZocken && name === saved.obs.szeneZocken) return setModus('zocken', undefined, 'obs', true);
  if (saved.obs.szeneParty && name === saved.obs.szeneParty) return setModus('party', undefined, 'obs', true);
}
function obsConnect() {
  clearTimeout(oretry);
  if (ows) { try { ows.onclose = null; ows.close(); } catch {} ows = null; }
  const { host, port, an } = saved.obs;
  if (!an || !host) { Object.assign(obs, { status: 'aus', fehler: an ? 'Adresse fehlt' : '' }); return obsStatus(); }
  Object.assign(obs, { status: 'verbinde', fehler: '' }); obsStatus();
  try { ows = new WebSocket(`ws://${host}:${Number(port) || 4455}`); }
  catch (e) { Object.assign(obs, { status: 'fehler', fehler: String(e.message || e) }); obsStatus(); oretry = setTimeout(obsConnect, 10000); return; }
  ows.onmessage = (m) => {
    let msg; try { msg = JSON.parse(String(m.data)); } catch { return; }
    if (msg.op === 0) { // Hello
      const d = { rpcVersion: 1, eventSubscriptions: 4 /* Scenes */ };
      const a = msg.d && msg.d.authentication;
      if (a) {
        if (!secret.obsPasswort) { Object.assign(obs, { status: 'fehler', fehler: 'OBS verlangt ein Passwort' }); obsStatus(); return; }
        const sec = crypto.createHash('sha256').update(secret.obsPasswort + a.salt).digest('base64');
        d.authentication = crypto.createHash('sha256').update(sec + a.challenge).digest('base64');
      }
      obsSend(1, d);
    } else if (msg.op === 2) { // Identified
      Object.assign(obs, { status: 'verbunden', fehler: '' }); obsStatus();
      obsSend(6, { requestType: 'GetSceneList', requestId: 'szenen' });
    } else if (msg.op === 5 && msg.d && msg.d.eventType === 'CurrentProgramSceneChanged') {
      obsScene(msg.d.eventData.sceneName);
    } else if (msg.op === 5 && msg.d && /^Scene(Created|Removed|NameChanged)$/.test(msg.d.eventType)) {
      obsSend(6, { requestType: 'GetSceneList', requestId: 'szenen' });
    } else if (msg.op === 7 && msg.d && obsWartet.has(msg.d.requestId)) {
      obsWartet.get(msg.d.requestId)(msg.d.requestStatus);
    } else if (msg.op === 7 && msg.d && msg.d.requestId === 'szenen' && msg.d.responseData) {
      obs.szenen = (msg.d.responseData.scenes || []).map(x => x.sceneName).reverse();
      obs.aktuell = msg.d.responseData.currentProgramSceneName || obs.aktuell; obsStatus();
    }
  };
  ows.onerror = () => {};
  ows.onclose = (ev) => {
    Object.assign(obs, { status: 'getrennt', fehler: ev && ev.code === 4009 ? 'Falsches OBS-Passwort' : ev && ev.code === 1006 ? 'Keine Verbindung – Adresse/Port/Firewall prüfen, WebSocket-Server in OBS an?' : '' });
    obsStatus(); oretry = setTimeout(obsConnect, 5000);
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
      'cache-control': /\.(mp4|webm|mp3|png|jpg)$/i.test(file) ? 'public, max-age=86400' : 'no-cache' };
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
const PAGES = { '/': 'studio/index.html', '/studio': 'studio/index.html', '/aktion': 'aktion/index.html', '/quelle/vorne': 'quelle/vorne.html', '/quelle/hinten': 'quelle/hinten.html',
  '/quelle/vorne-hoch': 'quelle/vorne.html', '/quelle/hinten-hoch': 'quelle/hinten.html', '/quelle/vorne-quer': 'quelle/vorne.html', '/quelle/hinten-quer': 'quelle/hinten.html' };
const UPLOAD_EXT = /^\.(mp4|webm|mp3|ogg|wav|png|jpg)$/i;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = decodeURIComponent(url.pathname);
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD' && p.startsWith('/api/') && req.headers['x-mm'] !== '1') return json(res, 403, { fehler: 'Kopf X-MM fehlt' });
    if (p === '/api/events') {
      const role = ROLES.includes(url.searchParams.get('rolle')) ? url.searchParams.get('rolle') : 'studio';
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
      const c = { res, role, format: ['hoch', 'quer'].includes(url.searchParams.get('format')) ? url.searchParams.get('format') : '', pfad: String(url.searchParams.get('pfad') || '').slice(0, 60),
        groesse: (Number(url.searchParams.get('w')) || 0) + '×' + (Number(url.searchParams.get('h')) || 0) }; clients.add(c);
      // Studio live informieren, welche Quellen (mit Format) gerade verbunden sind
      const quellenMelden = () => { if (role === 'vorne' || role === 'hinten') broadcast('quellen', quellenListe(), ['studio']); };
      req.on('close', () => { clients.delete(c); quellenMelden(); }); quellenMelden();
      res.write(`event: hallo\ndata: ${JSON.stringify({ modus: saved.modus, spiel: spielInfo(), musik: musikInfo(), fenster: fensterStand(), monitor: monitorArt(), letzte, stand: STAND })}\n\n`);
      if (role === 'studio') { res.write(`event: lumia\ndata: ${JSON.stringify(lumia)}\n\n`); res.write(`event: obs\ndata: ${JSON.stringify(obs)}\n\n`); }
      return;
    }
    if (p === '/api/settings' && req.method === 'GET') return json(res, 200, {
      kanal: PRESETS[saved.profil].name, profil: saved.profil, profile: profilListe(), vorne: settingsFor('vorne'), hinten: settingsFor('hinten'), aktion: settingsFor('aktion'), modus: saved.modus, spiel: saved.spiel, spiele: saved.spiele, musik: musikInfo(), fensterSicht: fensterSicht(), obs: { ...saved.obs, passwort: !!secret.obsPasswort }, obsStatus: obs,
      lumia: { ...saved.lumia, schluessel: !!secret.lumiaToken }, tts: { ...saved.tts, schluessel: !!secret.elevenlabsKey }, status: lumia, log,
      datenDauerhaft,
      quellen: [...clients].reduce((a, c) => (a[c.role] = (a[c.role] || 0) + 1, a), {}),
      quellenListe: quellenListe() });
    if (p === '/api/settings' && req.method === 'POST') {
      const b = JSON.parse((await body(req)).toString() || '{}');
      for (const k of ['vorne', 'hinten', 'aktion']) if (b[k] && typeof b[k] === 'object') {
        for (const [key, v] of Object.entries(b[k])) {
          const def = defaultsFor(saved.profil, k);
          if (!(key in def) || !['string', 'number', 'boolean'].includes(typeof v)) continue;
          if (v === def[key]) delete cur()[k][key]; else cur()[k][key] = typeof v === 'string' ? v.slice(0, 5000) : v;
        }
        broadcast('settings', { bereich: k, werte: settingsFor(k) }, [k === 'vorne' ? 'vorne' : k === 'hinten' ? 'hinten' : 'aktion']);
      }
      if (b.reset && BEREICHE.includes(b.reset)) { cur()[b.reset] = {}; broadcast('settings', { bereich: b.reset, werte: settingsFor(b.reset) }, [b.reset]); }
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
    if (p === '/api/test-chat' && req.method === 'POST') { const b = JSON.parse((await body(req)).toString() || '{}'); chatIn({ origin: b.plattform, type: 'chat', data: { extraSettings: { username: b.name, message: b.text, userColor: b.farbe } } }, 'test'); return json(res, 200, { ok: true }); }
    if (p === '/api/chat' && req.method === 'GET') return json(res, 200, { chat: chatLog });
    if (p === '/api/diag' && req.method === 'POST') { const b = JSON.parse((await body(req)).toString() || '{}'); remember({ art: 'fehler', quelle: 'animation ' + String(b.format || '').slice(0, 5), text: String(b.text || '').slice(0, 200) + (b.anim ? ' [' + String(b.anim).slice(0, 40) + ']' : '') }); return json(res, 200, { ok: true }); }
    if (p === '/api/test' && req.method === 'POST') { const b = JSON.parse((await body(req)).toString() || '{}'); fireAlert(b, 'test'); return json(res, 200, { ok: true }); }
    if (p === '/api/aktion' && req.method === 'POST') {
      const raw = (await body(req, 4000)).toString();
      let a; try { a = JSON.parse(raw); } catch { return json(res, 400, { fehler: 'ungültig' }); }
      // Spielfenster ein-/ausblenden: Stand im Server, damit alle Quellen (hoch/quer) gleich sind – auch nach dem Neuladen
      // Wand-Monitor: aus | 'liste' (letzte Unterstützer) | 'drucker' (Loch für die Drucker-Kamera); Kachel erneut = aus
      if (a.id === 'monitor' || a.id === 'monitor-drucker') {
        const ziel = a.id === 'monitor' ? 'liste' : 'drucker';
        saved.monitor = monitorArt() === ziel ? false : ziel; a.id = 'monitor'; a.art = saved.monitor || ''; a.an = !!saved.monitor; saveSettings();
        a.label = 'Wand-Monitor ' + (saved.monitor === 'drucker' ? 'zeigt die Drucker-Kamera' : saved.monitor ? 'zeigt die Unterstützer' : 'aus'); fensterMelden();
      }
      if (a.id === 'fenster2' || a.id === 'fenster3') { a.nr = Number(a.id.slice(7)); a.id = 'fenster'; }
      if (a.id === 'fenster') {
        const nr = [2, 3].includes(Number(a.nr)) ? Number(a.nr) : 1;
        const an = a.an === undefined ? !fensterSichtbar(nr) : !!a.an;
        saved.fenster[nr] = an; a.nr = nr; a.an = an; saveSettings(); fensterMelden();
        a.label = ({ 1: 'Spielfenster ', 2: 'Drucker-Kamera ', 3: 'Schreibtisch-Kamera ' })[nr] + (an ? 'an' : 'aus');
      }
      broadcast('aktion', a, ['vorne', 'hinten']); remember({ art: 'aktion', quelle: 'knopf', text: a.label || a.id });
      return json(res, 200, { ok: true, label: a.label });
    }
    if (p === '/api/profil' && req.method === 'POST') {
      const b = JSON.parse((await body(req)).toString() || '{}');
      if (!PRESETS[b.profil]) return json(res, 400, { fehler: 'Unbekannter Kanal' });
      if (b.profil !== saved.profil) {
        // Modus, Spiel und Musik gehören zum Kanal: beim Wechsel merken und den Stand des neuen Kanals zurückholen
        // (sonst zeigte 3dbymicha sofort wieder den Spiel-Hintergrund/die Musik von MichaModus)
        saved.profile[saved.profil].zustand = { modus: saved.modus, spiel: saved.spiel, musik: { ...saved.musik } };
        saved.profil = b.profil;
        const z = saved.profile[saved.profil].zustand || { modus: 'party', spiel: '', musik: { titel: 'standard', lautstaerke: saved.musik.lautstaerke, vonSpiel: false } };
        saved.modus = z.modus === 'zocken' ? 'zocken' : 'party';
        saved.spiel = saved.spiele.some(x => x.id === z.spiel) ? z.spiel : '';
        saved.musik = { ...saved.musik, ...(z.musik || {}) };
        saveSettings(); broadcastAll(); broadcast('profil', { profil: saved.profil, name: PRESETS[saved.profil].name });
        broadcast('modus', { modus: saved.modus, spiel: spielInfo() }); broadcast('musik', musikInfo());
        remember({ art: 'modus', quelle: 'knopf', text: 'Kanal: ' + PRESETS[saved.profil].name });
      }
      return json(res, 200, { ok: true });
    }
    if (p === '/api/modus' && req.method === 'POST') {
      const b = JSON.parse((await body(req)).toString() || '{}');
      const obsInfo = await setModus(b.modus, typeof b.spiel === 'string' ? b.spiel : undefined, 'knopf', false);
      return json(res, 200, { ok: true, obs: obsInfo });
    }
    if (p === '/api/obs' && req.method === 'POST') {
      const b = JSON.parse((await body(req)).toString() || '{}');
      saved.obs = { host: String(b.host || '').trim().slice(0, 100), port: Number(b.port) || 4455, an: !!b.an,
        szeneZocken: String(b.szeneZocken || ''), szeneParty: String(b.szeneParty || ''), folgen: b.folgen !== false, steuern: b.steuern !== false };
      if (typeof b.passwort === 'string' && b.passwort) { secret.obsPasswort = b.passwort; writeJson(SECRET_FILE, secret); }
      if (b.passwortLoeschen) { delete secret.obsPasswort; writeJson(SECRET_FILE, secret); }
      saveSettings(); obsConnect(); return json(res, 200, { ok: true });
    }
    if (p === '/api/tts' && req.method === 'POST') {
      const b = JSON.parse((await body(req)).toString() || '{}');
      try { return json(res, 200, { ok: true, url: await tts(b.text) }); } catch (e) { return json(res, e.code || 500, { fehler: e.message }); }
    }
    if (p === '/api/tts/einstellungen' && req.method === 'POST') {
      const b = JSON.parse((await body(req)).toString() || '{}');
      if (typeof b.schluessel === 'string' && b.schluessel.trim()) { secret.elevenlabsKey = b.schluessel.replace(/[\s"'`]/g, ''); writeJson(SECRET_FILE, secret); }
      if (b.schluesselLoeschen) { delete secret.elevenlabsKey; writeJson(SECRET_FILE, secret); }
      for (const k of ['stimme', 'stimmeName', 'modell']) if (typeof b[k] === 'string') saved.tts[k] = b[k].slice(0, 100);
      for (const k of ['stabil', 'aehnlich']) if (b[k] !== undefined) saved.tts[k] = Math.max(0, Math.min(100, Number(b[k]) || 0));
      saveSettings(); return json(res, 200, { ok: true });
    }
    if (p === '/api/tts/stimmen' && req.method === 'GET') {
      if (!secret.elevenlabsKey) return json(res, 409, { fehler: 'Erst den ElevenLabs-Schlüssel speichern' });
      try {
        const r = await fetch(TTS_BASE + '/v1/voices', { headers: { 'xi-api-key': secret.elevenlabsKey }, signal: AbortSignal.timeout(15000) });
        if (!r.ok) return json(res, 502, { fehler: await elFehler(r) });
        const d = await r.json();
        return json(res, 200, { stimmen: (d.voices || []).map(v => ({ id: v.voice_id, name: v.name, art: v.category || '', sprache: (v.labels && (v.labels.language || v.labels.accent)) || '', probe: v.preview_url || '' })) });
      } catch (e) { return json(res, 502, { fehler: 'ElevenLabs nicht erreichbar' }); }
    }
    if (p.startsWith('/tts/') && /^\/tts\/[0-9a-f]{32}\.mp3$/.test(p)) { const f = path.join(TTS_DIR, path.basename(p)); return fs.existsSync(f) ? sendFile(req, res, f) : json(res, 404, {}); }
    if (p === '/api/musik' && req.method === 'POST') {
      const b = JSON.parse((await body(req)).toString() || '{}');
      setMusik({ titel: b.titel, lautstaerke: b.lautstaerke, reihenfolge: b.reihenfolge, weiter: b.weiter }, 'knopf');
      return json(res, 200, { ok: true, musik: musikInfo() });
    }
    if (p === '/api/spiele' && req.method === 'POST') {
      const b = JSON.parse((await body(req)).toString() || '{}');
      if (!Array.isArray(b.spiele)) return json(res, 400, { fehler: 'ungültig' });
      saved.spiele = b.spiele.slice(0, 50).map(x => ({ id: String(x.id || crypto.randomBytes(4).toString('hex')).replace(/[^a-z0-9-]/gi, '').slice(0, 40) || crypto.randomBytes(4).toString('hex'),
        name: String(x.name || 'Spiel').slice(0, 60), video: String(x.video || '').slice(0, 300), videoQuer: String(x.videoQuer || '').slice(0, 300), szene: String(x.szene || '').slice(0, 200), musik: MUSIK.some(m => m.id === x.musik) ? x.musik : '',
        ohneFenster: !!x.ohneFenster, start: String(x.start || '').slice(0, 160), ende: String(x.ende || '').slice(0, 160) }));
      if (!saved.spiele.some(x => x.id === saved.spiel)) saved.spiel = '';
      saveSettings(); broadcast('spiele', { spiele: saved.spiele });
      if (saved.modus === 'zocken') broadcast('modus', { modus: saved.modus, spiel: spielInfo() });
      return json(res, 200, { ok: true, spiele: saved.spiele });
    }
    if (p.startsWith('/api/upload-spiel/') && req.method === 'POST') {
      const [, , , id, key] = p.split('/');
      const name = String(url.searchParams.get('name') || ''); const ext = path.extname(name).toLowerCase();
      const sp = saved.spiele.find(x => x.id === id);
      if (!sp || !['video', 'videoQuer'].includes(key) || !/^\.(mp4|webm)$/i.test(ext)) return json(res, 400, { fehler: 'Spiel oder Dateityp ungültig' });
      const data = await body(req, 300e6);
      const file = `spiel-${id}-${key}-${crypto.randomBytes(4).toString('hex')}${ext}`;
      fs.writeFileSync(path.join(UPLOADS, file), data);
      if (sp[key] && sp[key].startsWith('/uploads/')) fs.rm(path.join(UPLOADS, path.basename(sp[key])), () => {});
      sp[key] = '/uploads/' + file; saveSettings();
      if (saved.modus === 'zocken' && saved.spiel === id) broadcast('modus', { modus: saved.modus, spiel: spielInfo() });
      return json(res, 200, { ok: true, adresse: sp[key] });
    }
    if (p.startsWith('/api/upload/') && req.method === 'POST') {
      const [, , , bereich, key] = p.split('/');
      const name = String(url.searchParams.get('name') || '');
      const ext = path.extname(name).toLowerCase();
      if (!['vorne', 'hinten'].includes(bereich) || !(key in defaultsFor(saved.profil, bereich)) || !UPLOAD_EXT.test(ext)) return json(res, 400, { fehler: 'Feld oder Dateityp ungültig' });
      const data = await body(req, 300e6);
      const file = `${bereich}-${key}-${crypto.randomBytes(4).toString('hex')}${ext}`;
      fs.writeFileSync(path.join(UPLOADS, file), data);
      const old = cur()[bereich][key];
      cur()[bereich][key] = '/uploads/' + file; saveSettings();
      if (old && old.startsWith('/uploads/')) fs.rm(path.join(UPLOADS, path.basename(old)), () => {});
      broadcast('settings', { bereich, werte: settingsFor(bereich) }, [bereich]);
      return json(res, 200, { ok: true, adresse: cur()[bereich][key] });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 404, { fehler: 'unbekannt' });
    if (PAGES[p]) return sendFile(req, res, path.join(PUBLIC, PAGES[p]));
    // Tippfehler-tolerant: /Quelle/hinten_quer/ oder …-quer.html → auf die richtige Adresse umleiten
    { const n = p.toLowerCase().replace(/_/g, '-').replace(/\.html?$/, '').replace(/\/+$/, '') || '/';
      if (n !== p && PAGES[n]) { res.writeHead(302, { location: n + (url.search || '') }); return res.end(); } }
    if (/^\/quelle\//i.test(p)) {
      // Unbekannte Quellen-Adresse: sichtbare Hilfe statt leerer Seite (erscheint direkt in OBS)
      const liste = Object.keys(PAGES).filter(k => k.startsWith('/quelle/')).map(k => `<li><code>http://${req.headers.host}${k}</code></li>`).join('');
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(`<!doctype html><meta charset="utf-8"><body style="font:28px system-ui;color:#fff;background:#3a1020;padding:40px"><h1>Adresse unbekannt: ${p.replace(/[<>&"]/g, '')}</h1><p>Richtige Adressen für die Browserquelle:</p><ul>${liste}</ul></body>`);
    }
    if (p.startsWith('/uploads/')) { const f = safeJoin(UPLOADS, p.slice(9)); return f ? sendFile(req, res, f) : json(res, 400, {}); }
    const pub = safeJoin(PUBLIC, p.slice(1));
    if (pub && fs.existsSync(pub) && fs.statSync(pub).isFile()) return sendFile(req, res, pub);
    const med = safeJoin(MEDIA, p.slice(1));
    if (med) return sendFile(req, res, med);
    json(res, 404, {});
  } catch (e) { json(res, 500, { fehler: 'Interner Fehler' }); console.error(e); }
});
server.listen(PORT, () => { console.log(`Live-Studio läuft auf Port ${PORT}`); lumiaConnect(); obsConnect(); });
