// Nachbau der Docker-API über einen Unix-Socket (nur das, was Live-Studio braucht: auflisten, ansehen, stoppen, starten)
// Aufruf: node werkzeuge/test/docker-nachbau.mjs /tmp/docker.sock
import http from 'node:http'; import fs from 'node:fs';
const sock = process.argv[2] || '/tmp/docker-test.sock'; try { fs.unlinkSync(sock); } catch {}
const C = [
  { Id: 'aaa111ollama00', name: 'ollama', State: 'running', HostConfig: { Runtime: 'nvidia' }, Env: ['NVIDIA_VISIBLE_DEVICES=all'] },
  { Id: 'bbb222mailsort', name: 'mail-sortierer', State: 'running', HostConfig: {}, Env: [] },
  { Id: 'ccc333protokol', name: 'Protokoll', State: 'running', HostConfig: {}, Env: ['NVIDIA_VISIBLE_DEVICES=GPU-1234'] },
  { Id: 'ddd444plex0000', name: 'plex', State: 'running', HostConfig: { DeviceRequests: [{ Driver: 'nvidia', Capabilities: [['gpu']] }] }, Env: [] },
  { Id: 'fff666renderer', name: 'live-studio-renderer', State: 'running', HostConfig: { Runtime: 'nvidia' }, Env: ['NVIDIA_VISIBLE_DEVICES=all'] },
  { Id: 'eee555nextclou', name: 'nextcloud', State: 'running', HostConfig: {}, Env: ['NVIDIA_VISIBLE_DEVICES=void'] },
];
http.createServer((req, res) => {
  const u = req.url.replace(/^\/v[\d.]+/, ''), j = (c, o) => { res.writeHead(c, { 'content-type': 'application/json' }); res.end(o === undefined ? '' : JSON.stringify(o)); };
  const finde = id => C.find(c => c.Id.startsWith(id) || c.name === decodeURIComponent(id));
  let m;
  if (req.method === 'GET' && u.startsWith('/containers/json')) return j(200, C.map(c => ({ Id: c.Id, Names: ['/' + c.name], State: c.State })));
  if (req.method === 'GET' && (m = u.match(/^\/containers\/([^/]+)\/json/))) { const c = finde(m[1]); return c ? j(200, { HostConfig: c.HostConfig, Config: { Env: c.Env } }) : j(404, { message: 'no such container' }); }
  if (req.method === 'POST' && (m = u.match(/^\/containers\/([^/]+)\/(stop|start|restart)/))) { const c = finde(m[1]); if (!c) return j(404, { message: 'no such container' });
    if (m[2] === 'restart') { console.log('DOCKER restart', c.name); return j(204); } const ziel = m[2] === 'stop' ? 'exited' : 'running'; if (c.State === ziel) return j(304); c.State = ziel; console.log('DOCKER', m[2], c.name); return j(204); }
  j(404, { message: 'unbekannt' });
}).listen(sock, () => console.log('docker-nachbau auf', sock));
