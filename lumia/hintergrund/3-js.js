// MichaModus – Hintergrund (Lumia Custom Overlay, Reiter JS): Video-Schleife + Musikschleife
const D = (window.Overlay && Overlay.data) || window.TEST_DATA || {};
const v = document.getElementById('bg');
const m = document.getElementById('music');
const dim = document.getElementById('dim');
const num = (x, d) => (x === '' || x == null || isNaN(Number(x)) ? d : Number(x));
if (D.videoAn !== false && D.video) { v.src = D.video; v.playbackRate = num(D.tempo, 100) / 100; v.play().catch(() => {}); }
else v.style.display = 'none';
dim.style.background = `rgba(0,0,0,${num(D.abdunkeln, 0) / 100})`;
if (D.musikAn !== false && D.musik) {
  m.src = D.musik; m.volume = Math.min(1, num(D.musikLautstaerke, 35) / 100);
  const start = () => m.play().catch(() => setTimeout(start, 2000)); start();
}
