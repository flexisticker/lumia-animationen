// Hintergrund (hinter dem freigestellten Kamerabild): Party-Schleife, zweiter Modus (z. B. Zockerbude/Werkstatt), Musik
// und bis zu zwei Fenster (Spielaufnahme, Drucker-Kamera …). Die Quellen dafür liegen in OBS/LIVE Studio UNTER diesem Overlay,
// das Fenster schneidet hier ein Loch hinein. Umschalten des Modus: Steuerung („modus:party|zocken“).
const D = (window.Overlay && Overlay.data) || window.TEST_DATA || {};
const num = (x, d) => (x === '' || x == null || isNaN(Number(x)) ? d : Number(x));
const vP = document.getElementById('bgParty'), vZ = document.getElementById('bgZock');
const bg = document.getElementById('bg'), dimZ = document.getElementById('dimZ'), dimEl = document.getElementById('dim');
const cv = { width: innerWidth, height: innerHeight };
let letzterStand = '';
if (D.leistungSparen !== false) document.body.classList.add('leicht');
const m = document.getElementById('music');
const QUER = /-quer\b|format=quer/.test(location.pathname + location.search) ? true : /-hoch\b|format=hoch/.test(location.pathname + location.search) ? false : innerWidth > innerHeight;
const pick = (hoch, quer) => (QUER && quer ? quer : hoch);
if (D.videoAn !== false && pick(D.video, D.videoQuer)) { vP.src = pick(D.video, D.videoQuer); vP.play().catch(() => {}); }
if (pick(D.zockVideo, D.zockVideoQuer)) { vZ.src = pick(D.zockVideo, D.zockVideoQuer); vZ.play().catch(() => {}); }
[vP, vZ].forEach(v => (v.playbackRate = num(D.tempo, 100) / 100));
// Musik: Start mit Einstellungen, danach steuert die Aktionszentrale Titel und Lautstärke („musik:{datei,lautstaerke}“)
let musikZiel = Math.min(1, num(D.musikLautstaerke, 35) / 100), musikFade = null;
const musikStart = () => m.play().catch(() => setTimeout(() => { if (m.getAttribute('src')) musikStart(); }, 2000));
function fadeTo(vol, ms, done) {
  clearInterval(musikFade); const from = m.volume, t0 = performance.now();
  musikFade = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / ms); m.volume = Math.max(0, Math.min(1, from + (vol - from) * k)); if (k >= 1) { clearInterval(musikFade); done && done(); } }, 40);
}
// Playlist: mehrere Titel je Genre, nacheinander oder Zufall; „weiter“ (Zeitstempel) = nächstes Stück
let pl = { key: '', liste: [], i: 0, reihe: 'zufall', weiter: 0 };
function naechster() {
  const n = pl.liste.length; if (n < 2) return pl.i;
  if (pl.reihe === 'nacheinander') return (pl.i + 1) % n;
  let j; do { j = Math.floor(Math.random() * n); } while (j === pl.i); return j;
}
function spiele(src, ms) {
  const wechsel = () => { if (!src) { m.pause(); m.removeAttribute('src'); m.load(); return; } m.src = src; m.loop = pl.liste.length < 2; m.volume = 0; musikStart(); fadeTo(musikZiel, 1200); };
  if (m.getAttribute('src') && !m.paused) fadeTo(0, ms, wechsel); else wechsel();
}
m.addEventListener('ended', () => { if (pl.liste.length > 1) { pl.i = naechster(); spiele(pl.liste[pl.i], 10); } });
function setMusik(x) {
  if (!x) return;
  musikZiel = Math.max(0, Math.min(1, num(x.lautstaerke, 35) / 100));
  const aus = (x.titel === 'standard' && D.musikAn === false) || !(x.dateien || [x.datei]).filter(Boolean).length;
  const liste = aus ? [] : (x.dateien && x.dateien.length ? x.dateien : [x.datei]);
  const key = liste.join('|');
  pl.reihe = x.reihenfolge || 'zufall';
  if (key === pl.key) {
    if (x.weiter && x.weiter !== pl.weiter && liste.length > 1) { pl.weiter = x.weiter; pl.i = naechster(); spiele(liste[pl.i], 900); return; }
    pl.weiter = x.weiter || pl.weiter; if (key) fadeTo(musikZiel, 300); return;
  }
  pl = { key, liste, reihe: pl.reihe, weiter: x.weiter || 0, i: liste.length > 1 && pl.reihe === 'zufall' ? Math.floor(Math.random() * liste.length) : 0 };
  spiele(liste[pl.i] || '', liste.length ? 700 : num(D.musikAusblendenMs, 2500));
}
if (D.musikAn !== false && D.musik && !(window.MM_MUSIK)) { m.src = D.musik; m.loop = true; m.volume = musikZiel; musikStart(); }
let mode = D.modus === 'zocken' ? 'zocken' : 'party';
let t = mode === 'zocken' ? 1 : 0;
const DUR = num(D.uebergangMs, 1400);
function resize() { cv.width = innerWidth; cv.height = innerHeight; letzterStand = ''; }
addEventListener('resize', resize); resize();
function cover(v) {
  if (!v.videoWidth) return null;
  const va = v.videoWidth / v.videoHeight, ca = cv.width / cv.height;
  let w = cv.width, h = cv.height; if (va > ca) w = h * va; else h = w / va;
  return [(cv.width - w) / 2, (cv.height - h) / 2, w, h];
}
const ease = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// Fenster 1 und 2
const WIN = [1, 2, 3].map(n => {
  // Querformat-Quelle (…-quer): eigene Lage/Größe/Format/Wann, wenn „eigene Lage“ an ist (Hochkant und Quer getrennt einstellbar)
  const QK = ['Wann', 'X', 'Y', 'Breite', 'Hoehe', 'Format'];
  const g = k => (QUER && D['f' + n + 'QuerEigen'] !== false && QK.includes(k) && D['f' + n + 'Q' + k] !== undefined && D['f' + n + 'Q' + k] !== '') ? D['f' + n + 'Q' + k] : D['f' + n + k];
  const frame = document.getElementById('frame' + n), tag = document.getElementById('tag' + n);
  frame.style.setProperty('--f1', g('Farbe1') || '#00e5ff'); frame.style.setProperty('--f2', g('Farbe2') || '#7c4dff'); frame.style.setProperty('--f3', g('Farbe3') || '#ff3d7f');
  frame.style.setProperty('--r', num(g('Rund'), 24) + 'px');
  tag.style.setProperty('--f1', g('Farbe1') || '#00e5ff'); tag.style.setProperty('--f2', g('Farbe2') || '#7c4dff');
  tag.textContent = g('Schild') || '';
  return { n, g, frame, tag, t: 0 };
});
// Schildgröße: hochkant kleiner (schmales Bild), einstellbar in Prozent je Format
const SCHILD_PX = innerHeight * (QUER ? 0.026 : 0.017) * num(QUER ? D.schildGroesseQuer : D.schildGroesse, 100) / 100;
// Wand-Monitor
const monEl = document.getElementById('monitor'), monListe = monEl.querySelector('.mon-liste');
monEl.querySelector('.mon-titel').textContent = D.monTitel || '🏆 Danke an euch!';
let monitorAn = false, monDaten = [], monGesehen = null;
// unteren Teil des Monitors freihalten (dort sitzt man davor – Schrift soll nicht durchscheinen)
const FREI = Math.max(0, Math.min(0.8, num(QUER ? D.monQFrei : D.monFrei, QUER ? 15 : 30) / 100));
// Perspektive: Rechteck (0,0,w,h) auf vier Ecken abbilden (CSS matrix3d) – damit die Anzeige schräg im Bildschirm sitzt
function adj(m) { return [m[4]*m[8]-m[5]*m[7], m[2]*m[7]-m[1]*m[8], m[1]*m[5]-m[2]*m[4], m[5]*m[6]-m[3]*m[8], m[0]*m[8]-m[2]*m[6], m[2]*m[3]-m[0]*m[5], m[3]*m[7]-m[4]*m[6], m[1]*m[6]-m[0]*m[7], m[0]*m[4]-m[1]*m[3]]; }
function mul(a, b) { const c = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += a[3*i+k] * b[3*k+j]; c[3*i+j] = s; } return c; }
function mulv(m, v) { return [m[0]*v[0]+m[1]*v[1]+m[2]*v[2], m[3]*v[0]+m[4]*v[1]+m[5]*v[2], m[6]*v[0]+m[7]*v[1]+m[8]*v[2]]; }
function basis(p) { const m = [p[0], p[2], p[4], p[1], p[3], p[5], 1, 1, 1]; const v = mulv(adj(m), [p[6], p[7], 1]); return mul(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]); }
function matrix3d(w, h, q) { const t = mul(basis(q), adj(basis([0, 0, w, 0, 0, h, w, h]))); for (let i = 0; i < 9; i++) t[i] /= t[8];
  return 'matrix3d(' + [t[0], t[3], 0, t[6], t[1], t[4], 0, t[7], 0, 0, 1, 0, t[2], t[5], 0, t[8]].join(',') + ')'; }
const ZWEI = !QUER; if (ZWEI) monEl.classList.add('zwei'); // hochkant: Name und Angabe untereinander (schmaler Bildschirm)
const MQ = k => (QUER && D['monQ' + k] !== undefined && D['monQ' + k] !== '' ? D['monQ' + k] : D['mon' + k]);
function monZeichnen() {
  const max = Math.max(1, num(D.monAnzahl, 6)), liste = monDaten.filter(e => D.monTests !== false || !e.test).slice(0, max);
  monListe.textContent = '';
  if (!liste.length) { const l = document.createElement('div'); l.className = 'mon-leer'; l.textContent = D.monLeer || 'Noch keine Unterstützer – sei der Erste! 💜'; monListe.append(l); return; }
  for (const e of liste) {
    const z = document.createElement('div'); z.className = 'mon-zeile' + (monGesehen && !monGesehen.has(e.id) ? ' neu' : '');
    const i = document.createElement('span'); i.className = 'mon-ico'; i.textContent = e.icon;
    const pf = document.createElement('span'); pf.className = 'mon-pf ' + e.plattform; pf.textContent = e.plattform === 'twitch' ? 'TWITCH' : 'TIKTOK';
    const t = document.createElement('span'); t.className = 'mon-txt'; const b = document.createElement('b'); b.textContent = e.name + ' '; const sp = document.createElement('span'); sp.textContent = e.text; sp.dataset.pf = e.plattform === 'twitch' ? 'Twitch' : 'TikTok'; t.append(b, sp);
    z.append(i, pf, t); monListe.append(z);
  }
  monGesehen = new Set(monDaten.map(e => e.id)); // beim ersten Zeichnen nichts animieren, danach nur neue Einträge
}
monZeichnen();
if (window.Overlay) Overlay.on('letzte', d => { if (d.monitor !== undefined) monitorAn = d.monitor === true ? 'liste' : d.monitor || false; if (d.liste) { const neu = d.liste.map(e => e.id).join() !== monDaten.map(e => e.id).join(); monDaten = d.liste; if (neu) monZeichnen(); } letzterStand = ''; });
let curSpiel = null, zwang = { 1: null, 2: null, 3: null }; // per Knopf erzwungen (true/false), null = wie eingestellt
// „party“ = Thema ohne Spielfenster (Talk, Party, Specials), „zocken“ = Thema mit Spielfenster (Spiele, Werkstatt)
const artJetzt = () => (mode === 'party' || (curSpiel && curSpiel.ohneFenster) ? 'party' : 'zocken');
function want(w) { if (zwang[w.n] === true || zwang[w.n] === false) return zwang[w.n]; const a = w.g('Wann') || 'aus'; return a === 'immer' || a === artJetzt(); }
function rect(w) {
  const W = cv.width * num(w.g('Breite'), 80) / 100;
  const fmt = { '16:9': 16 / 9, '4:3': 4 / 3, '9:16': 9 / 16, '1:1': 1 }[w.g('Format')];
  const H = fmt ? W / fmt : cv.height * num(w.g('Hoehe'), 30) / 100;
  return { x: cv.width * num(w.g('X'), 50) / 100 - W / 2, y: cv.height * num(w.g('Y'), 40) / 100 - H / 2, w: W, h: H };
}
let last = performance.now();

const rr = (x, y, w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h / 2)); const f = v => v.toFixed(1);
  return `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${r} ${r} 0 0 1 ${f(x + w)} ${f(y + r)}V${f(y + h - r)}A${r} ${r} 0 0 1 ${f(x + w - r)} ${f(y + h)}H${f(x + r)}A${r} ${r} 0 0 1 ${f(x)} ${f(y + h - r)}V${f(y + r)}A${r} ${r} 0 0 1 ${f(x + r)} ${f(y)}Z`; };
function draw(now) {
  requestAnimationFrame(draw);
  const dt = Math.min(100, now - last); last = now;
  const target = mode === 'zocken' ? 1 : 0;
  if (t !== target) t = target > t ? Math.min(1, t + dt / DUR) : Math.max(0, t - dt / DUR);
  for (const w of WIN) { const tw = want(w) ? 1 : 0; if (w.t !== tw) w.t = tw > w.t ? Math.min(1, w.t + dt / DUR) : Math.max(0, w.t - dt / DUR); }
  const stand = t + '|' + WIN.map(w => w.t).join('|') + '|' + (vZ.videoWidth ? 1 : 0) + '|' + monitorAn;
  if (stand === letzterStand) return;   // nichts geändert → nichts tun (Videos laufen von selbst)
  letzterStand = stand;
  const e = ease(t), hatZ = !!vZ.getAttribute('src');
  vP.style.opacity = e < 1 || !hatZ ? 1 : 0;
  vZ.style.opacity = hatZ ? e : 0;
  dimZ.style.opacity = hatZ ? 0 : e;                       // ohne Zock-Video: Party-Video abgedunkelt
  dimEl.style.opacity = num(D.abdunkeln, 0) / 100;
  let loch = '';
  for (const w of WIN) {
    const s = ease(w.t), r = rect(w);
    if (s > 0.02) { const ww = r.w * s, hh = r.h * Math.min(1, s * 1.15); loch += rr(r.x + (r.w - ww) / 2, r.y + (r.h - hh) / 2, ww, hh, num(w.g('Rund'), 24)); }
    const shown = s > 0.97;
    Object.assign(w.frame.style, { left: r.x - 6 + 'px', top: r.y - 6 + 'px', width: r.w + 'px', height: r.h + 'px' });
    w.frame.classList.toggle('show', shown && w.g('Rahmen') !== false);
    // Schild: links/Mitte/rechts am Fenster + Feinverschiebung (in % der Fensterbreite bzw. Bildhöhe)
    // Schild nie breiter als das Fenster (sonst überlappen zwei Fenster nebeneinander) – Schrift passt sich an
    w.tag.style.fontSize = SCHILD_PX + 'px'; const natW = w.tag.offsetWidth || 0;
    if (natW > r.w - 8 && natW > 0) w.tag.style.fontSize = (SCHILD_PX * (r.w - 8) / natW).toFixed(1) + 'px';
    const pos = w.g('SchildPos') || 'mitte', tagW = w.tag.offsetWidth || 0;
    const bx = pos === 'links' ? r.x + tagW / 2 + 12 : pos === 'rechts' ? r.x + r.w - tagW / 2 - 12 : r.x + r.w / 2;
    w.tag.style.left = Math.max(tagW / 2 + 4, Math.min(cv.width - tagW / 2 - 4, bx + r.w * num(w.g('SchildX'), 0) / 100)) + 'px';
    w.tag.style.top = Math.max(8, r.y - (w.tag.offsetHeight || 40) - 10 + cv.height * num(w.g('SchildY'), 0) / 100) + 'px';
    w.tag.classList.toggle('show', shown && !!w.g('Schild'));
    if (shown && w.g('Schild') && !tagW) letzterStand = '';  // Schildbreite erst nach dem Einblenden bekannt
  }
  let monLoch = '';
  // Wand-Monitor: an, nur wenn das Spielfenster nicht zu sehen ist (und je nach Einstellung nur im Zockmodus)
  const monZeigen = monitorAn && WIN[0].t < 0.02 && !want(WIN[0]) && ((D.monWann || 'zocken') === 'immer' || (!curSpiel ? artJetzt() === 'zocken' : !!curSpiel.wandMonitor));
  if (monZeigen) {
    const W = cv.width * num(MQ('Breite'), QUER ? 29.5 : 42) / 100, H = cv.height * num(MQ('Hoehe'), QUER ? 31 : 35.5) / 100;
    // Perspektive: rechte obere Ecke um pt % der Höhe tiefer, rechte untere um pb % höher (vermessen an der Lichtleiste der Zockerbude)
    const pt = num(MQ('Perspektive'), QUER ? 0 : 8.5) / 100, pb = num(MQ('PerspektiveUnten'), QUER ? 0 : 6) / 100, dl = 0;
    monEl.style.transform = (pt || pb) ? matrix3d(W, H, [0, 0, W, H * pt, 0, H, W, H - H * pb]) : '';
    const mx = cv.width * num(MQ('X'), QUER ? 52.15 : 49.6) / 100 - W / 2, my = cv.height * num(MQ('Y'), QUER ? 47.6 : 47.6) / 100 - H / 2;
    // Drucker-Kamera im Monitor: schräges Loch ausschneiden, die Kamera liegt in OBS darunter
    if (monitorAn === 'drucker') { const f = v => v.toFixed(1); monLoch = `M${f(mx)} ${f(my)}L${f(mx + W)} ${f(my + H * pt)}L${f(mx + W)} ${f(my + H - H * pb)}L${f(mx)} ${f(my + H)}Z`; }
    Object.assign(monEl.style, { left: mx + 'px', top: my + 'px', width: W + 'px', height: H + 'px', fontSize: (Math.min(H * (1 - FREI) / (Math.max(1, num(D.monAnzahl, 6)) * (ZWEI ? 2.05 : 1.55) + 1.7 + 1.8 + 0.4), W / (ZWEI ? 16 : 28)) * num(D.monSchrift, 100) / 100).toFixed(1) + 'px' });
    monListe.style.maxHeight = (H * (1 - FREI) - parseFloat(monEl.style.fontSize) * 3.2).toFixed(0) + 'px';
    monEl.style.setProperty('--monDeck', num(D.monDeckkraft, 92) / 100);
  }
  monEl.classList.toggle('show', monZeigen && monitorAn === 'liste');
  if (monLoch) loch += monLoch;
  // Löcher (Spielfenster, Kameras, Monitor) voll durchsichtig ausschneiden – als Maske, damit sich überlappende Fenster
  // vereinigen (mit clip-path „evenodd“ wurde die Überlappung zweier Fenster wieder zugedeckt)
  bg.style.clipPath = '';
  const maske = loch ? 'url("data:image/svg+xml,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${cv.width}' height='${cv.height}'><defs><mask id='m' maskUnits='userSpaceOnUse' x='0' y='0' width='${cv.width}' height='${cv.height}'><rect width='${cv.width}' height='${cv.height}' fill='white'/><path d='${loch}' fill='black'/></mask></defs><rect width='${cv.width}' height='${cv.height}' fill='black' mask='url(#m)'/></svg>`) + '")' : '';
  if (bg.dataset.maske !== maske) { bg.dataset.maske = maske; for (const k of ['maskImage', 'webkitMaskImage']) bg.style[k] = maske || 'none'; }
  window.MM_LOCH = loch;
}
requestAnimationFrame(draw);
function setMode(v) {
  const next = String(v || '').toLowerCase() === 'zocken' ? 'zocken' : 'party';
  if (next !== mode && D.modusSound) { try { const a = new Audio(D.modusSound); a.volume = Math.min(1, num(D.modusSoundLaut, 80) / 100); a.play().catch(() => {}); } catch (e) {} }
  mode = next; letzterStand = ''; atmoWahl();
}
// ---------- Atmo: Geräusch-Schleife passend zum sichtbaren Hintergrund (Kaminfeuer, Wind, Drucker …) ----------
// Reihenfolge: eigene Atmo am Spiel › eigene Atmo je Modus › /atmo/<name>.mp3 passend zum Videonamen (z. B. wow-forever.mp4 → /atmo/wow-forever.mp3)
const atmoEl = [document.getElementById('atmoA'), document.getElementById('atmoB')];
let atmoIdx = 0, atmoAkt = '';
const atmoVol = () => Math.max(0, Math.min(1, num(D.atmoLautstaerke, 30) / 100));
function atmoFade(el, ziel, ms, fertig) {
  clearInterval(el._fade); const von = el.volume, t0 = performance.now();
  el._fade = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / ms); el.volume = Math.max(0, Math.min(1, von + (ziel - von) * k)); if (k >= 1) { clearInterval(el._fade); fertig && fertig(); } }, 50);
}
function atmoAusVideo(src) { const t = String(src || '').match(/\/hintergrund\/(?:spiele\/)?([a-z0-9-]+?)(?:-quer)?\.(?:mp4|webm)$/i); return t ? '/atmo/' + t[1].toLowerCase() + '.mp3' : ''; }
function atmoWahl() {
  let url = '';
  if (D.atmoAn !== false) {
    if (mode === 'zocken') url = (curSpiel && curSpiel.atmo) || (!curSpiel && D.atmoZocken) || atmoAusVideo((curSpiel && pick(curSpiel.video, curSpiel.videoQuer)) || zockDefault) || D.atmoZocken || '';
    else url = D.atmoParty || (D.videoAn !== false ? atmoAusVideo(pick(D.video, D.videoQuer)) : '');
  }
  if (url === atmoAkt) return;
  atmoAkt = url;
  const alt = atmoEl[atmoIdx]; atmoIdx = 1 - atmoIdx; const neu = atmoEl[atmoIdx];
  atmoFade(alt, 0, 1500, () => { alt.pause(); });
  if (!url) return;
  neu.onerror = () => {};   // keine Datei für diesen Hintergrund → einfach still
  neu.src = url; neu.volume = 0; neu.play().then(() => atmoFade(neu, atmoVol(), 2000)).catch(() => setTimeout(() => { if (atmoAkt === url) neu.play().then(() => atmoFade(neu, atmoVol(), 2000)).catch(() => {}); }, 2000));
}
async function poll() {
  try { if (window.Overlay && Overlay.getVariable) { const v = await Overlay.getVariable('mm_modus'); if (v) setMode(v); } } catch (e) {}
  setTimeout(poll, 800);
}
poll();
// Spiel-Hintergrund: eigenes Video je Spiel, sonst der Standard-Hintergrund für Modus 2
const zockDefault = pick(D.zockVideo, D.zockVideoQuer);
function setSpiel(sp) {
  curSpiel = sp;
  const src = (sp && pick(sp.video, sp.videoQuer)) || zockDefault;
  if (src && vZ.getAttribute('src') !== src) { vZ.src = src; vZ.play().catch(() => {}); }
  letzterStand = ''; atmoWahl();
}
setTimeout(atmoWahl, 300);
if (window.Overlay) Overlay.on('overlaycontent', d => {
  const c = String(d.content || '');
  if (c.startsWith('modus:')) setMode(c.slice(6));
  if (c.startsWith('fenster:')) { try { zwang = { 1: null, 2: null, 3: null, ...JSON.parse(c.slice(8)) }; } catch (e) {} letzterStand = ''; }
  if (c.startsWith('{')) { try { const a = JSON.parse(c); if (a.id === 'monitor') { monitorAn = a.art || false; letzterStand = ''; } if (a.id === 'fenster') { zwang[[2, 3].includes(Number(a.nr)) ? Number(a.nr) : 1] = !!a.an; letzterStand = ''; } } catch (e) {} }
  if (c.startsWith('spiel:')) { try { setSpiel(JSON.parse(c.slice(6))); } catch (e) {} }
  if (c.startsWith('musik:')) { try { setMusik(JSON.parse(c.slice(6))); } catch (e) {} }
});
window.MMBG = { setMode };
