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
    let r = null;
    if (window.Overlay) r = await Overlay.callCommand(D.befehl || 'mm-aktion', { aktion });
    else if (window.TEST_SEND) window.TEST_SEND(aktion);
    setStatus(r && r.label && /^(fenster|monitor|logo|licht)/.test(payload.id) ? r.label : 'gesendet: ' + (payload.label || payload.id), 'ok');
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
  ['szene:weiter', 'Weiter geht\'s!', '🚀'], ['szene:ende', 'Danke & Tschüss', '👋'], ['szene:brb', 'BRB – bin gleich zurück', '🚶'], ['szene:technik', 'Technik-Störung', '🛠️'], ['szene:aus', 'Ansage weg', '✖️'], ['likes', 'Like-Fontäne', '💗'], ['streamprint', 'Bondrucker ein/aus', '🧾'], ['chat', 'Chat ein/aus', '💬']];
const sceneBox = document.getElementById('scenes');
SCENES.forEach(([id, label, ico]) => {
  const b = button(sceneBox, { id, label, ico });
  b.addEventListener('click', () => {
    sceneBox.querySelectorAll('.btn').forEach(x => x.classList.remove('active'));
    if (['szene:start', 'szene:pause', 'szene:gleich', 'szene:ende', 'szene:brb', 'szene:technik'].includes(id)) b.classList.add('active');
  });
});

const lines = String(D.knoepfe || '').split('\n').map(l => l.split('|').map(s => s.trim())).filter(l => l[0]);
const btnBox = document.getElementById('buttons');
lines.forEach(([id, label, ico]) => button(btnBox, { id, label: label || id, ico }));

// Weihnachten: Animationen + reine Sounds (sound:<name> spielt /sounds/<name>.mp3)
const XMAS_SOUNDS = [['sound:hohoho', 'Ho ho ho!', '🎅'], ['sound:schlitten', 'Schlittenglocken', '🔔'], ['sound:glocken', 'Kirchenglocken', '🛎️'],
  ['sound:schneeball', 'Schneeball', '☃️'], ['sound:geschenk', 'Geschenk auspacken', '🎀'], ['sound:prost', 'Prost!', '🥂'], ['sound:elfen', 'Elfen kichern', '🧝'],
  ['sound:rentier', 'Rentierhufe', '🦌'], ['sound:zauber', 'Weihnachtszauber', '✨'], ['sound:knallbonbon', 'Knallbonbon', '🎉'], ['sound:engel', 'Engelschor', '😇'], ['sound:knusper', 'Knusper knusper', '🍪']];
if (D.weihnachtAn === false) { document.getElementById('xmasTitel').style.display = 'none'; }
else { const xb = document.getElementById('xmas'); [...(window.MM_LIST || []).filter(a => /^xmas-/.test(a.id)).map(a => [a.id, a.label, a.ico || '🎄']), ...XMAS_SOUNDS].forEach(([id, label, ico]) => button(xb, { id, label, ico })); }

const tests = window.MM_TESTS || [];
if (D.testKnoepfe === false || !tests.length) { document.getElementById('testTitle').style.display = 'none'; }
else tests.forEach(t => {
  const b = button(document.getElementById('tests'), { id: t.id, label: t.label, ico: '🧪' }, { text: 'Test' });
  // Live-Studio: Test läuft wie ein echtes Ereignis (Name, Profilbild, Plattform-Schild, Text, Danke-Sprache)
  if (window.MM_START && t.gruppe) b.onclick = () => testEreignis(t, b);
});
const TEST_NAMEN = ['Anna_Star', 'GamerJoe', 'Lisa💖', 'MichaFan99', 'Kevin_der_Große', 'SuperSandra', 'Tom aus Berlin', 'PixelPaul'];
const EREIGNIS_ALERT = { folgen: 'tiktok-follower', teilen: 'tiktok-share', superfan: 'tiktok-superFan', schatzkiste: 'tiktok-treasureChest', likeziel: 'tiktok-totalLikes', 'battle-sieg': 'tiktok-battleEnd' };
async function testEreignis(t, btn) {
  btn.classList.remove('hit'); void btn.offsetWidth; btn.classList.add('hit');
  const name = nameIn.value.trim() || TEST_NAMEN[Math.floor(Math.random() * TEST_NAMEN.length)];
  const alert = t.gruppe === 'ereignis' ? EREIGNIS_ALERT[t.id] : 'tiktok-gift';
  if (!alert) return send({ id: t.id, label: t.label, name, text: 'Test' }, btn);
  const extra = { username: name, avatar: '/icon.png' };
  if (alert === 'tiktok-gift') Object.assign(extra, { giftName: t.geschenk, coins: Math.max(1, Number(t.ab) || 1), giftAmount: 1 });
  try {
    const r = await fetch('/api/test', { method: 'POST', headers: { 'content-type': 'application/json', 'x-mm': '1' }, body: JSON.stringify({ alert, extraSettings: extra }) });
    if (!r.ok) throw new Error();
    setStatus('Test: ' + t.label + ' von ' + name, 'ok');
  } catch (e) { setStatus('Test fehlgeschlagen', 'err'); }
}

// Modus: Party / Zockmodus (Hintergrund-Overlay liest die Lumia-Variable „mm_modus“)
const modeBox = document.getElementById('modes');
// Zeigt, ob die OBS-Szene mitgeschaltet hat (Server meldet „OK:<Szene>“ oder den Grund)
function obsMeldung(text, info) {
  if (!info) return setStatus(text, 'ok');
  if (String(info).startsWith('OK:')) return setStatus(text + ' · OBS: ' + String(info).slice(3), 'ok');
  setStatus(text + ' · ⚠ ' + info, 'err');
}
async function setMode(m, b) {
  modeBox.querySelectorAll('.btn').forEach(x => x.classList.toggle('active', x === b));
  try {
    let obsInfo = '';
    if (window.Overlay) obsInfo = await Overlay.setVariable('mm_modus', m); else if (window.TEST_SEND) window.TEST_SEND('modus:' + m);
    obsMeldung((m === 'zocken' ? (D.modus2Name || 'Zockmodus') : (D.modus1Name || 'Party')) + ' an', obsInfo);
  } catch (e) { setStatus('Modus konnte nicht gesetzt werden', 'err'); }
}
[['party', D.modus1Name || 'Party', '🎉'], ['zocken', D.modus2Name || 'Zockmodus', D.modus2Ico || '🎮']].forEach(([m, label, ico]) => {
  const b = document.createElement('button'); b.className = 'btn';
  b.innerHTML = '<span class="ico"></span><span></span>'; b.firstChild.textContent = ico; b.lastChild.textContent = label;
  b.onclick = () => setMode(m, b); modeBox.append(b);
});

// Kanal umschalten (nur im Live-Studio vorhanden)
if ((window.MM_PROFILE || []).length > 1) {
  const kb = document.getElementById('kanaele'); kb.style.display = '';
  document.getElementById('kanalTitel').style.display = '';
  window.MM_PROFILE.forEach(p => {
    const b = document.createElement('button'); b.className = 'btn' + (p.id === window.MM_PROFIL ? ' active' : '');
    b.innerHTML = '<span class="ico">📺</span><span></span>'; b.lastChild.textContent = p.name;
    b.onclick = async () => { try { await Overlay.setVariable('mm_profil', p.id); setStatus('Kanal: ' + p.name, 'ok'); } catch (e) { setStatus('Kanal konnte nicht gewechselt werden', 'err'); } };
    kb.append(b);
  });
}

// Was läuft gerade (Live-Studio): Hintergrund/Thema wählen, nach Kategorien sortiert – ersetzt die alten Modus-Knöpfe
if (window.MM_SPIELE) { document.getElementById('modusTitel').style.display = 'none'; modeBox.style.display = 'none'; }
if (D.spieleAn !== false && (window.MM_SPIELE || []).length) {
  const box = document.getElementById('spiele'); box.style.display = ''; document.getElementById('spielTitel').style.display = '';
  const kats = (window.MM_KATEGORIEN || []).slice();
  const alle = [];
  const gruppe = (kat, liste) => {
    if (!liste.length) return;
    const h = document.createElement('h3'); h.className = 'katTitel'; h.textContent = (kat.ico ? kat.ico + ' ' : '') + kat.name; box.append(h);
    const g = document.createElement('div'); g.className = 'grid scenes'; box.append(g);
    liste.forEach(sp => {
      const b = document.createElement('button'); b.className = 'btn' + (sp.id === window.MM_SPIEL ? ' active' : ''); b.dataset.spiel = sp.id; alle.push(b);
      const em = String(sp.name).match(/^(\p{Extended_Pictographic}[\uFE0F\u200D\p{Extended_Pictographic}]*)\s*/u);
      b.innerHTML = '<span class="ico"></span><span></span>'; b.firstChild.textContent = em ? em[1] : kat.ico || '🎮'; b.lastChild.textContent = em ? sp.name.slice(em[0].length) : sp.name;
      b.onclick = async () => {
        alle.forEach(x => x.classList.toggle('active', x === b));
        try { obsMeldung('Läuft: ' + sp.name, await Overlay.setVariable('mm_spiel', sp.id)); } catch (e) { setStatus('Fehler beim Umschalten', 'err'); }
      };
      g.append(b);
    });
  };
  kats.forEach(k => gruppe(k, window.MM_SPIELE.filter(sp => sp.kategorie === k.id)));
  // Umschaltung von woanders (Studio, OBS, anderes Tablet) → Markierung nachziehen
  if (window.Overlay && Overlay.on) Overlay.on('overlaycontent', d => { const c = String(d.content || ''); if (!c.startsWith('spiel:')) return;
    try { const sp = JSON.parse(c.slice(6)); if (sp && sp.id) { window.MM_SPIEL = sp.id; alle.forEach(x => x.classList.toggle('active', x.dataset.spiel === sp.id)); } } catch (e) {} });
  gruppe({ name: 'Sonstiges', ico: '✨' }, window.MM_SPIELE.filter(sp => !kats.some(k => k.id === sp.kategorie)));
}

// Musik (Live-Studio): Titel starten/stoppen und Lautstärke – gilt für alle hinteren Quellen
if (window.MM_MUSIK) {
  const box = document.getElementById('musik'), vol = document.getElementById('musikVol'), wert = document.getElementById('musikVolWert');
  ['musik', 'musikTitel', 'musikRegler', 'musikExtra'].forEach(id => (document.getElementById(id).style.display = ''));
  const weiterB = document.getElementById('musikWeiter'), reiheB = document.getElementById('musikReihe'), infoE = document.getElementById('musikInfo');
  weiterB.onclick = () => send({ weiter: true }, 'Nächstes Stück');
  reiheB.onclick = () => send({ reihenfolge: reiheB.dataset.r === 'zufall' ? 'nacheinander' : 'zufall' });
  const extraShow = m => { reiheB.dataset.r = m.reihenfolge || 'zufall'; reiheB.textContent = reiheB.dataset.r === 'zufall' ? '🔀 Zufall' : '🔁 Nacheinander';
    const n = (m.dateien || []).length; infoE.textContent = m.titel === 'aus' ? '' : n > 1 ? n + ' Stücke in diesem Genre' : '1 Stück (Schleife)'; weiterB.disabled = n < 2; };
  const ICO = { standard: '🎉', hype: '⚡', funk: '🕺', chill: '☕', fantasy: '🐉', space: '🚀', synthwave: '🌆', chiptune: '👾', mittelalter: '🏰', mystisch: '🔮' };
  const mark = t => box.querySelectorAll('.btn').forEach(x => x.classList.toggle('active', x.dataset.id === t));
  const send = async (data, text) => { try { await Overlay.setVariable('mm_musik', data); if (text) setStatus(text, 'ok'); } catch (e) { setStatus('Fehler bei der Musik', 'err'); } };
  [...window.MM_MUSIK.liste, { id: 'aus', name: 'Musik aus' }].forEach(t => {
    const b = document.createElement('button'); b.className = 'btn'; b.dataset.id = t.id;
    b.innerHTML = '<span class="ico"></span><span></span>'; b.firstChild.textContent = t.id === 'aus' ? '⏹️' : (ICO[t.id] || '🎵'); b.lastChild.textContent = t.name;
    b.onclick = () => { mark(t.id); send({ titel: t.id }, t.id === 'aus' ? 'Musik aus' : 'Musik: ' + t.name); };
    box.append(b);
  });
  // Schnellknopf oben: Musik aus (blendet weich aus) / wieder an (letzter Titel)
  const quick = document.getElementById('musikSchnell'); quick.style.display = '';
  const quickShow = t => { const aus = t === 'aus'; quick.textContent = aus ? '🔊 Musik an' : '🔇 Musik aus'; quick.classList.toggle('aus', aus); quick.dataset.t = t; };
  quick.onclick = () => { const an = quick.dataset.t === 'aus'; quickShow(an ? 'an' : 'aus'); if (!an) mark('aus'); send({ titel: an ? 'an' : 'aus' }, an ? 'Musik an' : 'Musik blendet aus'); };
  const show = m => { mark(m.titel); quickShow(m.titel); extraShow(m); if (document.activeElement !== vol) { vol.value = m.lautstaerke; wert.textContent = m.lautstaerke + ' %'; } };
  show(window.MM_MUSIK);
  let tm = null;
  vol.oninput = () => { wert.textContent = vol.value + ' %'; clearTimeout(tm); tm = setTimeout(() => send({ lautstaerke: Number(vol.value) }), 120); };
  if (window.Overlay) Overlay.on('overlaycontent', d => { const c = String(d.content || ''); if (c.startsWith('musik:')) try { show(JSON.parse(c.slice(6))); } catch (e) {} });
}

// Kameras & Fenster: große Kacheln oben rechts, zeigen an, was gerade zu sehen ist
const fensterBox = document.getElementById('fenster');
const FENSTER = [[1, 'Spielfenster', '🪟'], [2, 'Drucker', '🖨️'], [3, 'Schreibtisch', '🖥️'], ['monitor', 'Monitor: Unterstützer', '📺'], ['monitor-drucker', 'Monitor: Drucker-Kamera', '🖨️'], ['logo', 'Logo', '🏷️'], ['licht', 'Licht (Hue)', '💡']].map(([nr, label, ico]) => {
  const b = document.createElement('button'); b.className = 'btn';
  b.innerHTML = '<span class="ico"></span><span></span><span class="zu"></span>'; b.children[0].textContent = ico; b.children[1].textContent = label;
  b.onclick = () => send({ id: typeof nr === 'string' ? nr : nr === 1 ? 'fenster' : 'fenster' + nr, label: label + ' ein/aus' }, b);
  fensterBox.append(b); return { nr, b };
});
function fensterZeigen(sicht) {
  for (const f of FENSTER) { if (String(f.nr).startsWith('monitor')) f.b.style.display = sicht && sicht.monitorMoeglich ? '' : 'none';
    if (f.nr === 'licht') f.b.style.display = sicht && sicht.lichtMoeglich ? '' : 'none';
    if (f.nr === 'logo') f.b.style.display = sicht && sicht.logoMoeglich ? '' : 'none';
    const an = !!(sicht && sicht[f.nr]); f.b.classList.toggle('active', an); f.b.children[2].textContent = an ? (f.nr === 'licht' ? '● folgt dem Stream' : String(f.nr).startsWith('monitor') ? '● an' : '● zu sehen') : 'aus'; }
}
fensterZeigen(window.MM_FENSTER);
if (window.Overlay && Overlay.on) Overlay.on('fenster', fensterZeigen);
