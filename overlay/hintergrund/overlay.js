// MichaModus – Hintergrund (Lumia Custom Overlay, Reiter JS)
// Party-Schleife + Musik. Zockmodus: Hintergrund wechselt in eine Zockerbude und in der Mitte öffnet sich ein
// Fenster, durch das man die Spielaufnahme sieht (die Spielquelle liegt in OBS/LIVE Studio UNTER diesem Overlay).
// Umschalten: Lumia-Variable „mm_modus“ = party | zocken (setzt die Aktionszentrale), oder Config „Modus“.
const D = (window.Overlay && Overlay.data) || window.TEST_DATA || {};
const num = (x, d) => (x === '' || x == null || isNaN(Number(x)) ? d : Number(x));
const vP = document.getElementById('bgParty'), vZ = document.getElementById('bgZock');
const cv = document.getElementById('stage'), cx = cv.getContext('2d');
const frame = document.getElementById('frame'), tag = document.getElementById('tag');
const m = document.getElementById('music');
const root = document.documentElement.style;
root.setProperty('--f1', D.rahmenFarbe1 || '#00e5ff'); root.setProperty('--f2', D.rahmenFarbe2 || '#7c4dff'); root.setProperty('--f3', D.rahmenFarbe3 || '#ff3d7f');
root.setProperty('--r', num(D.fensterRund, 24) + 'px');

if (D.videoAn !== false && D.video) { vP.src = D.video; vP.play().catch(() => {}); }
if (D.zockVideo) { vZ.src = D.zockVideo; vZ.play().catch(() => {}); }
[vP, vZ].forEach(v => (v.playbackRate = num(D.tempo, 100) / 100));
if (D.musikAn !== false && D.musik) {
  m.src = D.musik; m.volume = Math.min(1, num(D.musikLautstaerke, 35) / 100);
  const start = () => m.play().catch(() => setTimeout(start, 2000)); start();
}

let mode = D.modus === 'zocken' ? 'zocken' : 'party';
let t = mode === 'zocken' ? 1 : 0; // 0 = Party, 1 = Zockmodus (für weiche Übergänge)
const DUR = num(D.uebergangMs, 1400);

function resize() { cv.width = innerWidth; cv.height = innerHeight; }
addEventListener('resize', resize); resize();

function cover(v) {
  if (!v.videoWidth) return null;
  const va = v.videoWidth / v.videoHeight, ca = cv.width / cv.height;
  let w = cv.width, h = cv.height; if (va > ca) w = h * va; else h = w / va;
  return [(cv.width - w) / 2, (cv.height - h) / 2, w, h];
}
function hole() {
  const w = cv.width * num(D.fensterBreite, 84) / 100, h = cv.height * num(D.fensterHoehe, 34) / 100;
  const x = cv.width * num(D.fensterX, 50) / 100 - w / 2, y = cv.height * num(D.fensterY, 40) / 100 - h / 2;
  return { x, y, w, h };
}
const ease = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
let last = performance.now();
function draw(now) {
  const dt = now - last; last = now;
  const target = mode === 'zocken' ? 1 : 0;
  if (t !== target) t = target > t ? Math.min(1, t + dt / DUR) : Math.max(0, t - dt / DUR);
  const e = ease(t);
  cx.clearRect(0, 0, cv.width, cv.height);
  cx.globalAlpha = 1;
  // Party-Hintergrund
  const cp = cover(vP);
  if (cp && e < 1) { cx.globalAlpha = 1; cx.drawImage(vP, ...cp); }
  else if (!cp) { cx.fillStyle = '#120c1f'; cx.fillRect(0, 0, cv.width, cv.height); }
  // Zockerbude (eigenes Video, sonst eingefärbte Party-Bühne)
  if (e > 0) {
    cx.globalAlpha = e;
    const cz = cover(vZ);
    if (cz) cx.drawImage(vZ, ...cz);
    else {
      if (cp) cx.drawImage(vP, ...cp);
      cx.fillStyle = 'rgba(5,10,40,.55)'; cx.fillRect(0, 0, cv.width, cv.height);
      cx.globalCompositeOperation = 'color'; cx.fillStyle = '#2b3cff'; cx.fillRect(0, 0, cv.width, cv.height);
      cx.globalCompositeOperation = 'source-over';
    }
    cx.globalAlpha = 1;
  }
  // Abdunkeln
  const dim = num(D.abdunkeln, 0) / 100;
  if (dim) { cx.fillStyle = `rgba(0,0,0,${dim})`; cx.fillRect(0, 0, cv.width, cv.height); }
  // Öffnung zum Spiel: wächst aus der Mitte
  const H = hole();
  if (e > 0.02) {
    const s = e, w = H.w * s, h = H.h * Math.min(1, s * 1.15);
    const x = H.x + (H.w - w) / 2, y = H.y + (H.h - h) / 2;
    cx.globalCompositeOperation = 'destination-out';
    cx.beginPath(); cx.roundRect(x, y, w, h, num(D.fensterRund, 24)); cx.fill();
    cx.globalCompositeOperation = 'source-over';
  }
  const on = e > 0.97;
  Object.assign(frame.style, { left: H.x - 6 + 'px', top: H.y - 6 + 'px', width: H.w + 'px', height: H.h + 'px' });
  frame.classList.toggle('show', on && D.rahmenAn !== false);
  tag.style.top = Math.max(8, H.y - 50) + 'px';
  tag.classList.toggle('show', on && D.schildAn !== false);
  if (tag.textContent !== (D.schildText || '🎮 ZOCKMODUS')) tag.textContent = D.schildText || '🎮 ZOCKMODUS';
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

function setMode(v) { mode = String(v || '').toLowerCase() === 'zocken' ? 'zocken' : 'party'; }
// Umschalten über die Lumia-Variable (gesetzt von der Aktionszentrale)
async function poll() {
  try { if (window.Overlay) { const v = await Overlay.getVariable('mm_modus'); if (v) setMode(v); } } catch (e) {}
  setTimeout(poll, 800);
}
poll();
if (window.Overlay) Overlay.on('overlaycontent', d => { const c = String(d.content || ''); if (c.startsWith('modus:')) setMode(c.slice(6)); });
window.MMBG = { setMode };
