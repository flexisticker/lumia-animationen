import http from 'node:http'; import crypto from 'node:crypto';
let cur = 'Just Chatting'; const szenen = ['Just Chatting', 'Gaming', 'BRB', 'Vertikal'];
const alle = []; const srv = http.createServer((req, res) => { const u = new URL(req.url, 'http://x'); if (u.pathname === '/wechsel') { cur = u.searchParams.get('name'); for (const s of alle) s({ op: 5, d: { eventType: 'CurrentProgramSceneChanged', eventData: { sceneName: cur } } }); } res.end(cur); }); srv.on('upgrade', (req, sock) => {
  const key = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + key + '\r\n\r\n');
  const send = o => { const b = Buffer.from(JSON.stringify(o)); const h = b.length < 126 ? Buffer.from([0x81, b.length]) : Buffer.from([0x81, 126, b.length >> 8, b.length & 255]); sock.write(Buffer.concat([h, b])); };
  alle.push(send); send({ op: 0, d: { rpcVersion: 1 } });
  let buf = Buffer.alloc(0);
  sock.on('data', d => { buf = Buffer.concat([buf, d]);
    while (buf.length > 2) { let len = buf[1] & 127, off = 2; if (len === 126) { len = buf.readUInt16BE(2); off = 4; } if (buf.length < off + 4 + len) return;
      const mask = buf.slice(off, off + 4), data = Buffer.from(buf.slice(off + 4, off + 4 + len).map((x, i) => x ^ mask[i % 4])); const op = buf[0] & 15; buf = buf.slice(off + 4 + len);
      if (op !== 1) continue; const m = JSON.parse(data);
      if (m.op === 1) send({ op: 2, d: { negotiatedRpcVersion: 1 } });
      if (m.op === 6) { const r = m.d; if (['SetSceneItemEnabled', 'SetCurrentProgramScene', 'SetSceneItemTransform'].includes(r.requestType)) console.log('ANFRAGE', r.requestType, JSON.stringify(r.requestData || {}));
        const ok = d => send({ op: 7, d: { requestId: r.requestId, requestType: r.requestType, requestStatus: { result: true, code: 100 }, responseData: d } });
        // OBS_CANVAS=1: zusätzlich eine Hochkant-Leinwand (wie Aitum Vertical in OBS 32) mit eigener Szene
        if (r.requestType === 'GetCanvasList') { if (process.env.OBS_CANVAS) ok({ canvases: [{ canvasName: 'Main', canvasUuid: 'main', canvasFlags: { MAIN: true }, canvasVideoSettings: { baseWidth: Number(process.env.OBS_B || 1080), baseHeight: Number(process.env.OBS_H || 1920) } },
          { canvasName: 'Vertical', canvasUuid: 'v', canvasFlags: { MAIN: false }, canvasVideoSettings: { baseWidth: 1080, baseHeight: 1920 } }] });
          else send({ op: 7, d: { requestId: r.requestId, requestType: r.requestType, requestStatus: { result: false, code: 204, comment: 'unknown request' } } }); }
        else if (r.requestType === 'GetSceneList' && (r.requestData || {}).canvasUuid === 'v') ok({ scenes: [{ sceneName: 'V-Gaming', sceneUuid: 'u-vg' }] });
        else if (r.requestType === 'GetSceneItemList' && (r.requestData || {}).sceneUuid === 'u-vg') ok({ sceneItems: [{ sourceName: 'Spiel-Vertikal', sceneItemId: 11 }, { sourceName: 'Drucker-Cam-Vertikal', sceneItemId: 12 }] });
        else if (r.requestType === 'GetSceneList') send({ op: 7, d: { requestId: r.requestId, requestType: r.requestType, requestStatus: { result: true, code: 100 }, responseData: { currentProgramSceneName: cur, scenes: szenen.map(sceneName => ({ sceneName })) } } });
        else if (r.requestType === 'GetInputList') send({ op: 7, d: { requestId: r.requestId, requestType: r.requestType, requestStatus: { result: true, code: 100 }, responseData: { inputs: [{ inputName: 'Drucker-Cam' }, { inputName: 'Schreibtisch-Cam' }, { inputName: 'Spiel-Capture' }, { inputName: 'Spiel-Vertikal' }, { inputName: 'Drucker-Cam-Vertikal' }] } } });
        else if (r.requestType === 'GetSceneItemList') { const items = { 'Just Chatting': [['Drucker-Cam', 1], ['Schreibtisch-Cam', 2]], 'Gaming': [['Spiel-Capture', 3], ['Drucker-Cam', 4], ['Hochkant-Gruppe', 5, true]], 'BRB': [], 'Vertikal': [['Drucker-Cam-Vertikal', 7]] }[r.requestData.sceneName] || [];
          send({ op: 7, d: { requestId: r.requestId, requestType: r.requestType, requestStatus: { result: true, code: 100 }, responseData: { sceneItems: items.map(([sourceName, sceneItemId, isGroup]) => ({ sourceName, sceneItemId, isGroup: !!isGroup })) } } }); }
        else if (r.requestType === 'GetGroupSceneItemList') send({ op: 7, d: { requestId: r.requestId, requestType: r.requestType, requestStatus: { result: true, code: 100 }, responseData: { sceneItems: r.requestData.sceneName === 'Hochkant-Gruppe' ? [{ sourceName: 'Spiel-Vertikal', sceneItemId: 1 }] : [] } } });
        else if (r.requestType === 'GetVideoSettings') send({ op: 7, d: { requestId: r.requestId, requestType: r.requestType, requestStatus: { result: true, code: 100 }, responseData: { baseWidth: Number(process.env.OBS_B || 1080), baseHeight: Number(process.env.OBS_H || 1920) } } });
        else if (r.requestType === 'SetSceneItemTransform') send({ op: 7, d: { requestId: r.requestId, requestType: r.requestType, requestStatus: { result: true, code: 100 } } });
        else if (r.requestType === 'SetSceneItemEnabled') send({ op: 7, d: { requestId: r.requestId, requestType: r.requestType, requestStatus: { result: true, code: 100 } } });
        else if (r.requestType === 'SetCurrentProgramScene') { const ok = szenen.includes(r.requestData.sceneName); if (ok) cur = r.requestData.sceneName;
          send({ op: 7, d: { requestId: r.requestId, requestType: r.requestType, requestStatus: ok ? { result: true, code: 100 } : { result: false, code: 600, comment: 'No source was found by the name of `' + r.requestData.sceneName + '`.' } } });
          if (ok) send({ op: 5, d: { eventType: 'CurrentProgramSceneChanged', eventData: { sceneName: cur } } }); } } } });
}); srv.listen(4466, () => console.log('mock obs 4466'));
