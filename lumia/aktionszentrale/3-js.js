// Erzeugt von werkzeuge/build.mjs – nicht von Hand ändern
window.MM_TESTS = [{"id":"rose","label":"Rose"},{"id":"gg","label":"GG"},{"id":"tiktok","label":"TikTok"},{"id":"fingerherz","label":"Fingerherz"},{"id":"teamherz","label":"Teamherz"},{"id":"donut","label":"Donut"},{"id":"parfuem","label":"Parfüm"},{"id":"handherzen","label":"Hand-Herzen"},{"id":"sonnenbrille","label":"Sonnenbrille"},{"id":"kanone","label":"Konfetti-Kanone"},{"id":"corgi","label":"Corgi"},{"id":"kueken","label":"Küken"},{"id":"galaxie","label":"Galaxie"},{"id":"loewe","label":"Löwe"},{"id":"universum","label":"Universum"},{"id":"folgen","label":"Neuer Follower"},{"id":"teilen","label":"Live geteilt"},{"id":"superfan","label":"Superfan"},{"id":"schatzkiste","label":"Schatzkiste"},{"id":"likeziel","label":"Like-Ziel"},{"id":"battle-sieg","label":"Battle-Ende"}];
// MichaModus – Aktionszentrale (Lumia Custom Overlay, Reiter JS)
// Jeder Knopf ruft den Lumia-Befehl (Standard „mm-aktion“) mit der Variable {{aktion}} auf.
// Der Befehl schickt {{aktion}} per „Overlay: Inhalt senden“ an das Overlay „MichaModus – Animationen“.
const D = (window.Overlay && Overlay.data) || window.TEST_DATA || {};
const statusEl = document.getElementById('status');
if (document.documentElement.dataset.rolle === 'aktion') document.getElementById('admin').style.display = '';
document.getElementById('titel').textContent = D.titel || 'MichaModus · Aktionszentrale';
const nameIn = document.getElementById('name');
if (D.nameFeld === false) document.getElementById('nameRow').style.display = 'none';
document.getElementById('nameClear').onclick = () => { nameIn.value = ''; };

function setStatus(text, cls) { statusEl.textContent = text; statusEl.className = 'status ' + (cls || ''); }
async function send(payload, btn) {
  btn.classList.remove('hit'); void btn.offsetWidth; btn.classList.add('hit');
  const aktion = JSON.stringify(payload);
  try {
    if (window.Overlay) await Overlay.callCommand(D.befehl || 'mm-aktion', { aktion });
    else if (window.TEST_SEND) window.TEST_SEND(aktion);
    setStatus('gesendet: ' + (payload.label || payload.id), 'ok');
  } catch (e) { setStatus('Fehler – Befehl „' + (D.befehl || 'mm-aktion') + '“ vorhanden?', 'err'); }
}
function button(box, { id, label, ico }, extra = {}) {
  const b = document.createElement('button'); b.className = 'btn';
  const i = document.createElement('span'); i.className = 'ico'; i.textContent = ico || '✨';
  const t = document.createElement('span'); t.textContent = label;
  b.append(i, t);
  b.onclick = () => send({ id, label, name: nameIn.value.trim() || undefined, ...extra }, b);
  box.append(b); return b;
}

const SCENES = [['szene:start', 'Startet gleich', '⏳'], ['szene:pause', 'Kurze Pause', '☕'], ['szene:gleich', 'Gleich weiter', '⏱️'],
  ['szene:weiter', 'Weiter geht\'s!', '🚀'], ['szene:ende', 'Danke & Tschüss', '👋'], ['szene:aus', 'Ansage weg', '✖️'], ['likes', 'Like-Fontäne', '💗'], ['streamprint', 'Bondrucker ein/aus', '🧾']];
const sceneBox = document.getElementById('scenes');
SCENES.forEach(([id, label, ico]) => {
  const b = button(sceneBox, { id, label, ico });
  b.addEventListener('click', () => {
    sceneBox.querySelectorAll('.btn').forEach(x => x.classList.remove('active'));
    if (['szene:start', 'szene:pause', 'szene:gleich', 'szene:ende'].includes(id)) b.classList.add('active');
  });
});

const lines = String(D.knoepfe || '').split('\n').map(l => l.split('|').map(s => s.trim())).filter(l => l[0]);
const btnBox = document.getElementById('buttons');
lines.forEach(([id, label, ico]) => button(btnBox, { id, label: label || id, ico }));

const tests = window.MM_TESTS || [];
if (D.testKnoepfe === false || !tests.length) { document.getElementById('testTitle').style.display = 'none'; }
else tests.forEach(t => button(document.getElementById('tests'), { id: t.id, label: t.label, ico: '🧪' }, { text: 'Test' }));

// Modus: Party / Zockmodus (Hintergrund-Overlay liest die Lumia-Variable „mm_modus“)
const modeBox = document.getElementById('modes');
async function setMode(m, b) {
  modeBox.querySelectorAll('.btn').forEach(x => x.classList.toggle('active', x === b));
  try {
    if (window.Overlay) await Overlay.setVariable('mm_modus', m); else if (window.TEST_SEND) window.TEST_SEND('modus:' + m);
    setStatus((m === 'zocken' ? (D.modus2Name || 'Zockmodus') : (D.modus1Name || 'Party')) + ' an', 'ok');
  } catch (e) { setStatus('Modus konnte nicht gesetzt werden', 'err'); }
}
[['party', D.modus1Name || 'Party', '🎉'], ['zocken', D.modus2Name || 'Zockmodus', '🎮']].forEach(([m, label, ico]) => {
  const b = document.createElement('button'); b.className = 'btn';
  b.innerHTML = '<span class="ico"></span><span></span>'; b.firstChild.textContent = ico; b.lastChild.textContent = label;
  b.onclick = () => setMode(m, b); modeBox.append(b);
});
