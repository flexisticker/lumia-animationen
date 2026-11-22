// MichaModus Studio – Verbindung der Browserquellen/Seiten zum Programm (ersetzt die Lumia-Overlay-Schnittstelle)
(function () {
  const ROLE = document.documentElement.dataset.rolle; // vorne | hinten | aktion
  const BEREICH = { vorne: 'vorne', hinten: 'hinten', aktion: 'aktion' }[ROLE];
  const handlers = {};
  const state = { modus: 'party' };
  const post = (url, data) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-mm': '1' }, body: JSON.stringify(data) });
  window.Overlay = {
    data: {},
    on(ev, cb) { (handlers[ev] ||= []).push(cb); },
    async callCommand(cmd, vars) { const r = await post('/api/aktion', JSON.parse(vars.aktion)); if (!r.ok) throw new Error('Fehler'); },
    async getVariable(name) { return name === 'mm_modus' ? state.modus : null; },
    async setVariable(name, value) {
      if (name === 'mm_modus') { const r = await post('/api/modus', { modus: value }); if (!r.ok) throw new Error('Fehler'); }
      if (name === 'mm_spiel') { const r = await post('/api/modus', { modus: 'zocken', spiel: value }); if (!r.ok) throw new Error('Fehler'); }
      if (name === 'mm_profil') { const r = await post('/api/profil', { profil: value }); if (!r.ok) throw new Error('Fehler'); }
    },
    async saveStorage() {}, async getStorage() { return null; }, async deleteStorage() {},
  };
  const emit = (ev, d) => (handlers[ev] || []).forEach(cb => { try { cb(d); } catch (e) { console.error(e); } });
  window.MM_START = async function (start) {
    const s = await (await fetch('/api/settings', { cache: 'no-store' })).json();
    Overlay.data = s[BEREICH] || {}; state.modus = s.modus; window.MM_PROFILE = s.profile || []; window.MM_PROFIL = s.profil; window.MM_SPIELE = s.spiele || []; window.MM_SPIEL = s.spiel; window.MM_MODUS = s.modus;
    start();
    let busy = () => window.MM && window.MM.busy && window.MM.busy();
    function connect() {
      const es = new EventSource('/api/events?rolle=' + ROLE);
      const modusMsg = d => { state.modus = d.modus; emit('overlaycontent', { content: 'spiel:' + JSON.stringify(d.spiel || null) }); emit('overlaycontent', { content: 'modus:' + state.modus }); };
      es.addEventListener('hallo', e => modusMsg(JSON.parse(e.data)));
      es.addEventListener('alert', e => emit('alert', JSON.parse(e.data)));
      es.addEventListener('aktion', e => emit('overlaycontent', { content: JSON.stringify(JSON.parse(e.data)) }));
      es.addEventListener('modus', e => modusMsg(JSON.parse(e.data)));
      es.addEventListener('spiele', () => { if (ROLE === 'aktion') setTimeout(() => location.reload(), 300); });
      es.addEventListener('settings', e => {
        const d = JSON.parse(e.data); if (d.bereich !== BEREICH) return;
        // Neue Einstellungen: Seite neu laden, sobald gerade nichts läuft
        const reload = () => (busy() ? setTimeout(reload, 500) : location.reload());
        setTimeout(reload, 150);
      });
      es.onerror = () => { es.close(); setTimeout(connect, 3000); };
    }
    connect();
  };
})();
