// Nachbau des Render-OBS (obs-websocket v5, ohne Passwort): beantwortet alles mit „ok“ und protokolliert die Einrichtung.
// Aufruf: node werkzeuge/test/render-nachbau.mjs [port]   (Standard 4467)
import http from 'node:http'; import crypto from 'node:crypto';
const port = Number(process.argv[2]) || 4467; const da = new Set();
const srv = http.createServer((q, r) => r.end('render-nachbau')); srv.on('upgrade', (req, sock) => {
  const key = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + key + '\r\n\r\n');
  const send = o => { const b = Buffer.from(JSON.stringify(o)); const h = b.length < 126 ? Buffer.from([0x81, b.length]) : Buffer.from([0x81, 126, b.length >> 8, b.length & 255]); sock.write(Buffer.concat([h, b])); };
  send({ op: 0, d: { rpcVersion: 1 } }); let buf = Buffer.alloc(0);
  sock.on('data', d => { buf = Buffer.concat([buf, d]);
    while (buf.length > 2) { let len = buf[1] & 127, off = 2; if (len === 126) { len = buf.readUInt16BE(2); off = 4; } if (buf.length < off + 4 + len) return;
      const mask = buf.slice(off, off + 4), data = Buffer.from(buf.slice(off + 4, off + 4 + len).map((x, i) => x ^ mask[i % 4])); const op = buf[0] & 15; buf = buf.slice(off + 4 + len);
      if (op === 8) { sock.end(); return; } if (op !== 1) continue; const m = JSON.parse(data);
      if (m.op === 1) send({ op: 2, d: { negotiatedRpcVersion: 1 } });
      if (m.op === 6) { const r = m.d, q = r.requestData || {}; let res = {}, ok = true, code = 100;
        if (r.requestType === 'GetVersion') res = { obsVersion: '32.0.0-nachbau' };
        else if (r.requestType === 'GetSourceFilterKindList') res = { sourceFilterKinds: ['color_filter', 'ndi_audiofilter', 'ndi_filter'] };
        else if (r.requestType === 'CreateScene') { if (da.has('S' + q.sceneName)) { ok = false; code = 601; } else da.add('S' + q.sceneName); }
        else if (r.requestType === 'CreateInput') { if (da.has('I' + q.inputName)) { ok = false; code = 601; } else da.add('I' + q.inputName); }
        else if (r.requestType === 'CreateSourceFilter') { const k = 'F' + q.sourceName + q.filterName; if (da.has(k)) { ok = false; code = 601; } else da.add(k); }
        else if (r.requestType === 'GetSceneItemId') res = { sceneItemId: 7 };
        console.log('RENDER', r.requestType, JSON.stringify(q).slice(0, 160));
        send({ op: 7, d: { requestId: r.requestId, requestType: r.requestType, requestStatus: ok ? { result: true, code: 100 } : { result: false, code, comment: 'gibt es schon' }, responseData: res } }); } } });
}); srv.listen(port, () => console.log('render-nachbau', port));
