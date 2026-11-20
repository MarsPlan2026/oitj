// OI 尖塔 II 联机服务器：零依赖，仅需 Node.js 14+
// 运行：node server.js   然后用浏览器打开 http://localhost:8787
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8787;
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_MSG = 64 * 1024;

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/' || url === '/index.html') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) { res.writeHead(500); res.end('index.html not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
  } else { res.writeHead(404); res.end('Not found'); }
});

/* ---------- WebSocket 帧 ---------- */
function frame(op, payload) {
  const p = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  let h;
  if (p.length < 126) h = Buffer.from([0x80 | op, p.length]);
  else if (p.length < 65536) { h = Buffer.alloc(4); h[0] = 0x80 | op; h[1] = 126; h.writeUInt16BE(p.length, 2); }
  else { h = Buffer.alloc(10); h[0] = 0x80 | op; h[1] = 127; h.writeBigUInt64BE(BigInt(p.length), 2); }
  return Buffer.concat([h, p]);
}

/* ---------- 房间 ---------- */
const rooms = new Map(); // code -> {members:Map, host, started, config}
let nextId = 1;

function send(c, obj) { if (!c.closed) { try { c.sock.write(frame(1, JSON.stringify(obj))); } catch (e) {} } }
function memberList(room) { return [...room.members.values()].map(m => ({ id: m.id, name: m.name, s: m.status })); }
function broadcast(room, obj, except) { for (const m of room.members.values()) if (m !== except) send(m, obj); }

function leave(c) {
  const room = c.room; if (!room) return;
  room.members.delete(c.id); c.room = null;
  if (room.members.size === 0) { rooms.delete(room.code); return; }
  if (room.host === c.id) room.host = room.members.keys().next().value;
  broadcast(room, { t: 'members', host: room.host, members: memberList(room) });
}

function handle(c, m) {
  if (!m || typeof m.t !== 'string') return;
  if (m.t === 'join') {
    const code = String(m.room || '').trim().toUpperCase().slice(0, 16);
    const name = String(m.name || '').trim().slice(0, 12) || ('玩家' + c.id);
    if (!code) return send(c, { t: 'error', msg: '房间号不能为空' });
    leave(c);
    let room = rooms.get(code);
    if (!room) { room = { code, members: new Map(), host: null, started: false, config: null }; rooms.set(code, room); }
    if (room.members.size >= 12) return send(c, { t: 'error', msg: '房间已满（最多 12 人）' });
    c.name = name; c.room = room; c.status = null;
    room.members.set(c.id, c);
    if (!room.host) room.host = c.id;
    send(c, { t: 'joined', you: c.id, room: code, host: room.host, started: room.started, config: room.config, members: memberList(room) });
    broadcast(room, { t: 'members', host: room.host, members: memberList(room) }, c);
    return;
  }
  const room = c.room; if (!room) return;
  if (m.t === 'status') {
    c.status = m.s && typeof m.s === 'object' ? m.s : null;
    broadcast(room, { t: 'status', id: c.id, s: c.status }, c);
  } else if (m.t === 'chat') {
    const text = String(m.text || '').slice(0, 120); if (!text) return;
    broadcast(room, { t: 'chat', id: c.id, name: c.name, text });
  } else if (m.t === 'start') {
    if (room.host !== c.id) return send(c, { t: 'error', msg: '只有房主可以开始对局' });
    const difficulty = Math.max(1, Math.min(10, parseInt(m.difficulty, 10) || 1));
    const seed = String(m.seed || Math.random().toString(36).slice(2, 8)).slice(0, 20);
    room.started = true; room.config = { difficulty, seed };
    for (const mm of room.members.values()) mm.status = null;
    broadcast(room, { t: 'start', config: room.config });
  } else if (m.t === 'reset') {
    if (room.host !== c.id) return;
    room.started = false; room.config = null;
    broadcast(room, { t: 'lobby' });
  } else if (m.t === 'gift') {
    const to = room.members.get(m.to);
    if (!to || to === c || typeof m.potion !== 'string') return;
    send(to, { t: 'gift', from: c.id, name: c.name, potion: m.potion.slice(0, 20) });
  }
}

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key || String(req.headers.upgrade).toLowerCase() !== 'websocket') { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');

  const c = { id: 'p' + nextId++, sock: socket, room: null, name: '', status: null, closed: false };
  let buf = Buffer.alloc(0), frags = [];
  const close = () => { if (c.closed) return; c.closed = true; leave(c); try { socket.destroy(); } catch (e) {} };

  socket.on('data', d => {
    buf = Buffer.concat([buf, d]);
    while (buf.length >= 2) {
      const fin = !!(buf[0] & 0x80), op = buf[0] & 0x0f, masked = !!(buf[1] & 0x80);
      let len = buf[1] & 0x7f, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      if (len > MAX_MSG) return close();
      const mlen = masked ? 4 : 0;
      if (buf.length < off + mlen + len) return;
      let payload = Buffer.from(buf.slice(off + mlen, off + mlen + len));
      if (masked) { const mk = buf.slice(off, off + 4); for (let i = 0; i < payload.length; i++) payload[i] ^= mk[i & 3]; }
      buf = buf.slice(off + mlen + len);
      if (op === 8) { try { socket.write(frame(8, Buffer.alloc(0))); } catch (e) {} return close(); }
      if (op === 9) { socket.write(frame(10, payload)); continue; }
      if (op === 10) continue;
      if (op === 1 || op === 0) {
        frags.push(payload);
        if (fin) {
          const text = Buffer.concat(frags).toString('utf8'); frags = [];
          let m = null; try { m = JSON.parse(text); } catch (e) {}
          handle(c, m);
        }
      }
    }
  });
  socket.on('close', close);
  socket.on('error', close);
});

setInterval(() => {
  for (const room of rooms.values()) for (const m of room.members.values()) { try { m.sock.write(frame(9, Buffer.alloc(0))); } catch (e) {} }
}, 25000);

server.listen(PORT, () => {
  console.log('OI 尖塔 II 已启动： http://localhost:' + PORT);
  console.log('局域网内其他人请访问： http://<本机IP>:' + PORT);
});
