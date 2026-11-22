// Hintergrund (hinter dem freigestellten Kamerabild): Party-Schleife, zweiter Modus (z. B. Zockerbude/Werkstatt), Musik
// und bis zu zwei Fenster (Spielaufnahme, Drucker-Kamera …). Die Quellen dafür liegen in OBS/LIVE Studio UNTER diesem Overlay,
// das Fenster schneidet hier ein Loch hinein. Umschalten des Modus: Steuerung („modus:party|zocken“).
const D = (window.Overlay && Overlay.data) || window.TEST_DATA || {};
const num = (x, d) => (x === '' || x == null || isNaN(Number(x)) ? d : Number(x));
const vP = document.getElementById('bgParty'), vZ = document.getElementById('bgZock');
const cv = document.getElementById('stage'), cx = cv.getContext('2d');
const m = document.getElementById('music');
if (D.videoAn !== false && D.video) { vP.src = D.video; vP.play().catch(() => {}); }
if (D.zockVideo) { vZ.src = D.zockVideo; vZ.play().catch(() => {}); }
[vP, vZ].forEach(v => (v.playbackRate = num(D.tempo, 100) / 100));
if (D.musikAn !== false && D.musik) {
  m.src = D.musik; m.volume = Math.min(1, num(D.musikLautstaerke, 35) / 100);
  const start = () => m.play().catch(() => setTimeout(start, 2000)); start();
}
let mode = D.modus === 'zocken' ? 'zocken' : 'party';
let t = mode === 'zocken' ? 1 : 0;
const DUR = num(D.uebergangMs, 1400);
function resize() { cv.width = innerWidth; cv.height = innerHeight; }
addEventListener('resize', resize); resize();
function cover(v) {
  if (!v.videoWidth) return null;
  const va = v.videoWidth / v.videoHeight, ca = cv.width / cv.height;
  let w = cv.width, h = cv.height; if (va > ca) w = h * va; else h = w / va;
  return [(cv.width - w) / 2, (cv.height - h) / 2, w, h];
}
const ease = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// Fenster 1 und 2
const WIN = [1, 2].map(n => {
  const g = k => D['f' + n + k];
  const frame = document.getElementById('frame' + n), tag = document.getElementById('tag' + n);
  frame.style.setProperty('--f1', g('Farbe1') || '#00e5ff'); frame.style.setProperty('--f2', g('Farbe2') || '#7c4dff'); frame.style.setProperty('--f3', g('Farbe3') || '#ff3d7f');
  frame.style.setProperty('--r', num(g('Rund'), 24) + 'px');
  tag.style.setProperty('--f1', g('Farbe1') || '#00e5ff'); tag.style.setProperty('--f2', g('Farbe2') || '#7c4dff');
  tag.textContent = g('Schild') || '';
  return { n, g, frame, tag, t: 0 };
});
function want(w) { const a = w.g('Wann') || 'aus'; return a === 'immer' || a === mode; }
function rect(w) {
  const W = cv.width * num(w.g('Breite'), 80) / 100, H = cv.height * num(w.g('Hoehe'), 30) / 100;
  return { x: cv.width * num(w.g('X'), 50) / 100 - W / 2, y: cv.height * num(w.g('Y'), 40) / 100 - H / 2, w: W, h: H };
}
let last = performance.now();
function draw(now) {
  const dt = now - last; last = now;
  const target = mode === 'zocken' ? 1 : 0;
  if (t !== target) t = target > t ? Math.min(1, t + dt / DUR) : Math.max(0, t - dt / DUR);
  const e = ease(t);
  cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 1;
  cx.clearRect(0, 0, cv.width, cv.height);
  const cp = cover(vP);
  if (cp && e < 1) cx.drawImage(vP, ...cp);
  else if (!cp) { cx.fillStyle = '#120c1f'; cx.fillRect(0, 0, cv.width, cv.height); }
  if (e > 0) {
    cx.globalAlpha = e;
    const cz = cover(vZ);
    if (cz) cx.drawImage(vZ, ...cz);
    else if (cp) { cx.drawImage(vP, ...cp); cx.fillStyle = 'rgba(5,10,40,.55)'; cx.fillRect(0, 0, cv.width, cv.height); }
    cx.globalAlpha = 1;
  }
  const dim = num(D.abdunkeln, 0) / 100;
  if (dim) { cx.fillStyle = `rgba(0,0,0,${dim})`; cx.fillRect(0, 0, cv.width, cv.height); }
  for (const w of WIN) {
    const tw = want(w) ? 1 : 0;
    if (w.t !== tw) w.t = tw > w.t ? Math.min(1, w.t + dt / DUR) : Math.max(0, w.t - dt / DUR);
    const s = ease(w.t), r = rect(w);
    if (s > 0.02) {
      const ww = r.w * s, hh = r.h * Math.min(1, s * 1.15);
      cx.globalCompositeOperation = 'destination-out';
      cx.beginPath(); cx.roundRect(r.x + (r.w - ww) / 2, r.y + (r.h - hh) / 2, ww, hh, num(w.g('Rund'), 24)); cx.fill();
      cx.globalCompositeOperation = 'source-over';
    }
    const shown = s > 0.97;
    Object.assign(w.frame.style, { left: r.x - 6 + 'px', top: r.y - 6 + 'px', width: r.w + 'px', height: r.h + 'px' });
    w.frame.classList.toggle('show', shown && w.g('Rahmen') !== false);
    w.tag.style.top = Math.max(8, r.y - 50) + 'px'; w.tag.style.left = (r.x + r.w / 2) + 'px';
    w.tag.classList.toggle('show', shown && !!w.g('Schild'));
  }
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
function setMode(v) { mode = String(v || '').toLowerCase() === 'zocken' ? 'zocken' : 'party'; }
async function poll() {
  try { if (window.Overlay && Overlay.getVariable) { const v = await Overlay.getVariable('mm_modus'); if (v) setMode(v); } } catch (e) {}
  setTimeout(poll, 800);
}
poll();
if (window.Overlay) Overlay.on('overlaycontent', d => { const c = String(d.content || ''); if (c.startsWith('modus:')) setMode(c.slice(6)); });
window.MMBG = { setMode };
