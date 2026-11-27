import http from 'node:http';
let gedrueckt = process.argv[2] === 'knopf';
const lights = { '1': { name: 'Spot links', state: { on: true, bri: 200, xy: [0.4, 0.4], colormode: 'xy' } }, '2': { name: 'Spot rechts', state: { on: false, bri: 100, ct: 300, xy: [0.3, 0.3], colormode: 'ct' } }, '3': { name: 'Flur weiß', state: { on: true, bri: 254 } } };
const log = [];
http.createServer((req, res) => { let b = ''; req.on('data', c => b += c); req.on('end', () => {
  const j = d => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(d)); };
  if (req.url === '/knopf') { gedrueckt = true; return j({}); }
  if (req.url === '/log') return j(log);
  if (req.method === 'POST' && req.url === '/api') return gedrueckt ? j([{ success: { username: 'testuser123' } }]) : j([{ error: { type: 101, description: 'link button not pressed' } }]);
  if (req.url === '/api/testuser123/lights') return j(lights);
  const m = req.url.match(/^\/api\/testuser123\/lights\/(\w+)\/state$/);
  if (m && req.method === 'PUT') { const st = JSON.parse(b); log.push({ t: Date.now(), id: m[1], ...st }); Object.assign(lights[m[1]].state, st); return j([{ success: {} }]); }
  j([{ error: { type: 1, description: 'unauthorized user' } }]);
}); }).listen(8099, () => console.log('mock 8099'));
