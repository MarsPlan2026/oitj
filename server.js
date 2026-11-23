// OI 尖塔 II 联机服务器：零依赖，仅需 Node.js 14+
// 运行：node server.js   然后用浏览器打开 http://localhost:8787
//
// 联机规则（与杀戮尖塔 2 一致）：全队共享同一张地图与进度。
//   投票阶段：所有存活玩家各投一个节点，票数最多者胜出（平票随机），然后全队一起进入该房间。
//   房间阶段：每人在自己的房间里独立结算，全部完成后回到投票阶段。
//   战斗房间：全队共用同一组题（任何人抽题，所有人看到同一组；题数 = floor(人数/3*2)，至少 1）。
//             任何一个人做出某道题，这道题就算被击败；全部击败后，每个人各自结算奖励。
//   题单：GET /api/training?id=<洛谷题单编号> 由服务器去洛谷抓取题单里的题号（浏览器直接请求会被跨域拦截）。
//   掉线：席位保留一段宽限时间（大厅 10 秒，对局 45 秒），期间用同一编号重连即可接回；超时才移出。心跳每 20 秒一次，死连接会被清理。
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8787;
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_MSG = 64 * 1024;

/* ---------- 洛谷题单抓取 ---------- */
const LUOGU_BASE = process.env.LUOGU_BASE || 'https://www.luogu.com.cn';   // 测试时可指向本地假服务器
function httpGet(urlStr, headers, hops) {
  return new Promise((resolve, reject) => {
    let u; try { u = new URL(urlStr); } catch (e) { return reject(e); }
    const mod = u.protocol === 'http:' ? http : https;
    const req = mod.get(u, { headers: Object.assign({ 'User-Agent': 'Mozilla/5.0 (OI-Spire-II)', 'Accept': 'application/json,text/html' }, headers || {}), timeout: 12000 }, r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location && (hops || 0) < 3) {
        r.resume();
        return resolve(httpGet(new URL(r.headers.location, u).toString(), headers, (hops || 0) + 1));
      }
      const chunks = []; let n = 0;
      r.on('data', d => { n += d.length; if (n > 4e6) { req.destroy(new Error('响应过大')); } else chunks.push(d); });
      r.on('end', () => resolve({ status: r.statusCode, text: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('timeout', () => req.destroy(new Error('请求超时')));
    req.on('error', reject);
  });
}
// 解析洛谷题单：兼容 ?_contentOnly=1 的 JSON，以及页面里的 lentille-context
function parseTraining(text) {
  let j = null;
  try { j = JSON.parse(text); } catch (e) {}
  if (!j) {
    const m = text.match(/<script id="lentille-context"[^>]*>([\s\S]*?)<\/script>/);
    if (m) { try { j = JSON.parse(m[1]); } catch (e) {} }
  }
  if (!j || typeof j !== 'object') return null;
  const data = j.currentData || j.data || j;
  const tr = (data && data.training) || data;
  const list = tr && Array.isArray(tr.problems) ? tr.problems : null;
  if (!list) return null;
  const problems = [], seen = new Set();
  for (const it of list) {
    const p = it && (it.problem || it);
    if (!p || typeof p.pid !== 'string' || !/^[A-Za-z0-9_]{1,20}$/.test(p.pid) || seen.has(p.pid)) continue;
    seen.add(p.pid);
    problems.push({ pid: p.pid, title: String(p.title || '').slice(0, 80), diff: Number.isInteger(p.difficulty) ? p.difficulty : -1 });
  }
  return { name: String(tr.title || tr.name || '').slice(0, 60), problems };
}
async function fetchTraining(id) {
  const base = LUOGU_BASE + '/training/' + id;
  let r = await httpGet(base + '?_contentOnly=1', { 'x-lentille-request': 'content-only' });
  let t = parseTraining(r.text);
  if (!t) { r = await httpGet(base, {}); t = parseTraining(r.text); }
  if (!t) throw new Error(r.status === 404 ? '题单不存在' : '无法解析题单页面（题单可能不存在、未公开，或需要登录）');
  if (!t.problems.length) throw new Error('这个题单里没有题目');
  return t;
}
function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/api/training') {
    const id = new URL(req.url, 'http://x').searchParams.get('id') || '';
    if (!/^\d{1,9}$/.test(id)) return sendJson(res, 400, { error: '题单编号必须是数字' });
    fetchTraining(id).then(t => sendJson(res, 200, { id, name: t.name, problems: t.problems }),
                           e => sendJson(res, 502, { error: e.message || String(e) }));
    return;
  }
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

/* ---------- 房间 ----------
   连接（conn）与成员（member）分离：成员由客户端的稳定编号（cid）标识。
   连接断开后，成员先标记为离线并保留席位；在宽限期内用同一编号（或同名的离线席位）重连，即可无缝接回对局。
   宽限期结束仍未回来的成员才会被真正移出房间，因此不会长期占着位置，也不会因为一次抖动就被踢出。 */
const GRACE_LOBBY = +process.env.GRACE_LOBBY || 10000;     // 大厅里掉线：10 秒
const GRACE_GAME = +process.env.GRACE_GAME || 45000;       // 对局中掉线：45 秒
const GRACE_AWAY = +process.env.GRACE_AWAY || 12000;       // 页面主动关闭（pagehide）：12 秒，足够刷新后重连
const PING_MS = +process.env.PING_MS || 20000;             // 心跳间隔；连续两个周期没有任何回应则判定为死连接
const rooms = new Map();
let nextId = 1;

function send(m, obj) { const c = m.conn; if (c && !c.closed) { try { c.sock.write(frame(1, JSON.stringify(obj))); } catch (e) {} } }
function memberList(room) { return [...room.members.values()].map(m => ({ id: m.id, name: m.name, s: m.status, o: m.online })); }
function broadcast(room, obj, except) { for (const m of room.members.values()) if (m !== except) send(m, obj); }
function pushMembers(room) { broadcast(room, { t: 'members', host: room.host, members: memberList(room) }); }
function ensureHost(room) {
  const cur = room.members.get(room.host);
  if (cur && cur.online) return;
  const nh = [...room.members.values()].find(m => m.online) || [...room.members.values()][0];
  room.host = nh ? nh.id : null;
}

/* ---------- 全队进度（投票 / 房间） ---------- */
function mkFight(g) {
  return { need: Math.max(1, Math.floor(g.players.size * 2 / 3)), problems: null, solved: {}, started: false, won: false };
}
function newGame(room) {
  const g = { phase: 'room', step: 0, votes: {}, done: {}, players: new Set([...room.members.values()].filter(m => m.online).map(m => m.id)), over: false, go: null };
  g.fight = mkFight(g);
  return g;
}
function gState(room) {
  const g = room.game; if (!g) return null;
  return { phase: g.phase, step: g.step, votes: g.votes, done: Object.keys(g.done), players: [...g.players], over: g.over, fight: g.fight };
}
function pushG(room) { broadcast(room, { t: 'g', g: gState(room) }); }
function goTo(room, r, c) { const g = room.game; g.go = { r, c, step: g.step }; broadcast(room, { t: 'go', r, c, step: g.step }); }

function step(room) {
  const g = room.game;
  if (!g || g.over) { pushG(room); return; }
  const ps = [...g.players];
  if (ps.length === 0) { g.over = true; pushG(room); broadcast(room, { t: 'wiped' }); return; }

  if (g.phase === 'vote' && ps.every(id => g.votes[id])) {
    const cnt = {};
    ps.forEach(id => { const v = g.votes[id]; const k = v.r + ',' + v.c; cnt[k] = (cnt[k] || 0) + 1; });
    const mx = Math.max(...Object.values(cnt));
    const top = Object.keys(cnt).filter(k => cnt[k] === mx);
    const [r, c] = top[Math.floor(Math.random() * top.length)].split(',').map(Number);
    g.phase = 'room'; g.done = {}; g.votes = {}; g.step++; g.fight = mkFight(g);
    pushG(room); goTo(room, r, c);
    return;
  }
  if (g.phase === 'room' && ps.every(id => g.done[id])) {
    const cnt = {};
    ps.forEach(id => { const n = g.done[id].next; cnt[n] = (cnt[n] || 0) + 1; });
    const nx = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    g.done = {}; g.votes = {};
    if (nx === 'finish') { g.over = true; pushG(room); broadcast(room, { t: 'finished' }); return; }
    if (nx === 'ancient') { g.step++; g.fight = mkFight(g); pushG(room); goTo(room, -1, 3); return; }
    g.phase = 'vote'; g.go = null; pushG(room); return;
  }
  pushG(room);
}
function dropPlayer(room, id) {
  const g = room.game; if (!g) return;
  g.players.delete(id); delete g.votes[id]; delete g.done[id];
}

/* 真正移出房间（宽限期结束、主动离开） */
function removeMember(m) {
  const room = m.room; if (!room) return;
  clearTimeout(m.timer); m.timer = null;
  room.members.delete(m.id); m.room = null;
  if (m.conn) { m.conn.member = null; m.conn = null; }
  if (room.members.size === 0) { rooms.delete(room.code); return; }
  ensureHost(room);
  pushMembers(room);
  if (room.game && !room.game.over) { dropPlayer(room, m.id); step(room); }
}
/* 连接断开：保留席位并开始倒计时 */
function detach(conn) {
  const m = conn.member; if (!m) return;
  conn.member = null;
  if (m.conn !== conn) return;                       // 已被新连接接管
  m.conn = null; m.online = false;
  const room = m.room; if (!room) return;
  const inGame = room.game && !room.game.over && room.game.players.has(m.id);
  const wait = m.away ? GRACE_AWAY : inGame ? GRACE_GAME : GRACE_LOBBY;
  clearTimeout(m.timer);
  m.timer = setTimeout(() => removeMember(m), wait);
  ensureHost(room);
  pushMembers(room);
}

const RELAY_OK = n => typeof n === 'number' && isFinite(n);
const CID_OK = s => typeof s === 'string' && /^[A-Za-z0-9_-]{6,40}$/.test(s);

function handle(conn, msg) {
  if (!msg || typeof msg.t !== 'string') return;
  if (msg.t === 'hb') { try { conn.sock.write(frame(1, JSON.stringify({ t: 'hb' }))); } catch (e) {} return; }
  if (msg.t === 'join') {
    const code = String(msg.room || '').trim().toUpperCase().slice(0, 16);
    const name = String(msg.name || '').trim().slice(0, 12) || ('玩家' + nextId);
    if (!code) { try { conn.sock.write(frame(1, JSON.stringify({ t: 'error', msg: '房间号不能为空' }))); } catch (e) {} return; }
    if (conn.member) { const old = conn.member; if (old.room && old.room.code === code && old.id === msg.cid) { /* 同连接重复加入：忽略 */ return; } removeMember(old); }
    let room = rooms.get(code);
    if (!room) { room = { code, members: new Map(), host: null, started: false, config: null, game: null }; rooms.set(code, room); }
    // 找回席位：先按稳定编号，其次按「同名且离线」的旧席位（浏览器被关闭后重开的情况）
    let m = CID_OK(msg.cid) ? room.members.get(msg.cid) : null;
    if (!m) m = [...room.members.values()].find(x => !x.online && x.name === name) || null;
    const resumed = !!m;
    if (m) {
      if (m.conn && m.conn !== conn) { const oc = m.conn; oc.member = null; try { oc.sock.write(frame(1, JSON.stringify({ t: 'kicked' }))); } catch (e) {} oc.closed = true; try { oc.sock.destroy(); } catch (e) {} }
      clearTimeout(m.timer); m.timer = null;
    } else {
      if (room.members.size >= 12) { try { conn.sock.write(frame(1, JSON.stringify({ t: 'error', msg: '房间已满（最多 12 人）' }))); } catch (e) {} return; }
      let id = CID_OK(msg.cid) && !room.members.has(msg.cid) ? msg.cid : 'p' + nextId++ + Math.random().toString(36).slice(2, 6);
      m = { id, name, room, conn: null, status: null, online: false, timer: null, away: false };
      room.members.set(id, m);
    }
    m.name = name; m.conn = conn; m.online = true; m.away = false; m.room = room; conn.member = m;
    ensureHost(room);
    send(m, { t: 'joined', you: m.id, room: code, host: room.host, started: room.started, config: room.config, g: gState(room), members: memberList(room), resumed, player: !!(room.game && room.game.players.has(m.id)) });
    const g0 = room.game;
    if (g0 && !g0.over && g0.players.has(m.id) && g0.phase === 'room' && g0.go && !g0.done[m.id]) send(m, { t: 'go', r: g0.go.r, c: g0.go.c, step: g0.go.step, again: true });
    pushMembers(room);
    return;
  }
  const c = conn.member; if (!c) return;
  const room = c.room; if (!room) return;
  const g = room.game;
  const t = msg.t, m = msg;

  if (t === 'bye') { removeMember(c); try { conn.sock.destroy(); } catch (e) {} return; }
  if (t === 'away') { c.away = true; return; }
  if (t === 'status') {
    c.status = m.s && typeof m.s === 'object' ? m.s : null;
    broadcast(room, { t: 'status', id: c.id, s: c.status }, c);
  } else if (t === 'chat') {
    const text = String(m.text || '').slice(0, 120); if (!text) return;
    broadcast(room, { t: 'chat', id: c.id, name: c.name, text });
  } else if (t === 'start') {
    if (room.host !== c.id) return send(c, { t: 'error', msg: '只有房主可以开始对局' });
    if (room.started) return send(c, { t: 'error', msg: '对局已经开始' });
    const d = Number(m.difficulty), tr = Number(m.tier);
    const difficulty = Math.max(0, Math.min(10, Number.isFinite(d) ? Math.floor(d) : 0));
    const tier = Math.max(0, Math.min(2, Number.isFinite(tr) ? Math.floor(tr) : 0));
    const seed = String(m.seed || Math.random().toString(36).slice(2, 8)).slice(0, 20);
    room.started = true; room.config = { tier, difficulty, seed };
    room.game = newGame(room);
    for (const mm of room.members.values()) mm.status = null;
    broadcast(room, { t: 'start', config: room.config });
    pushG(room);
    goTo(room, -1, 3);      // 第一座塔：先去找先古遗民
  } else if (t === 'reset') {
    if (room.host !== c.id) return;
    room.started = false; room.config = null; room.game = null;
    broadcast(room, { t: 'lobby' });
    pushG(room);
  } else if (t === 'spectate') {
    if (g && !g.over) { dropPlayer(room, c.id); step(room); }
  } else if (t === 'vote') {
    if (!g || g.over || g.phase !== 'vote' || !g.players.has(c.id)) return;
    if (!Number.isInteger(m.r) || !Number.isInteger(m.c) || m.r < 0 || m.r > 20 || m.c < 0 || m.c > 6) return;
    g.votes[c.id] = { r: m.r, c: m.c };
    step(room);
  } else if (t === 'done') {
    if (!g || g.over || g.phase !== 'room' || !g.players.has(c.id)) return;
    const next = ['vote', 'ancient', 'finish'].includes(m.next) ? m.next : 'vote';
    g.done[c.id] = { next };
    step(room);
  } else if (t === 'pset') {
    if (!g || g.over || g.phase !== 'room' || !g.players.has(c.id)) return;
    const f = g.fight; if (f.started || f.won) return;
    const clean = [], seen = new Set();
    for (const p of (Array.isArray(m.problems) ? m.problems : [])) {
      if (!p || typeof p.pid !== 'string' || !/^[A-Za-z0-9_]{1,20}$/.test(p.pid) || seen.has(p.pid)) continue;
      seen.add(p.pid);
      clean.push({ pid: p.pid, title: String(p.title || '').slice(0, 60), diff: Number.isInteger(p.diff) ? p.diff : -1 });
      if (clean.length >= f.need) break;
    }
    if (!clean.length) return send(c, { t: 'error', msg: '题目无效' });
    f.problems = clean; f.solved = {};
    pushG(room);
  } else if (t === 'pstart') {
    if (!g || g.over || g.phase !== 'room' || !g.players.has(c.id)) return;
    const f = g.fight; if (!f.problems || f.started) return;
    f.started = true; pushG(room);
  } else if (t === 'psolve') {
    if (!g || g.over || g.phase !== 'room' || !g.players.has(c.id)) return;
    const f = g.fight; if (!f.started || f.won || !f.problems) return;
    const pid = String(m.pid || '');
    if (!f.problems.some(p => p.pid === pid) || f.solved[pid]) return;
    f.solved[pid] = { id: c.id, name: c.name };
    if (f.problems.every(p => f.solved[p.pid])) f.won = true;
    pushG(room);
  } else if (t === 'dead') {
    if (!g || g.over || !g.players.has(c.id)) return;
    dropPlayer(room, c.id); step(room);
  } else if (t === 'gift') {
    const to = room.members.get(m.to);
    if (!to || to === c || !to.online || typeof m.potion !== 'string') return;
    send(to, { t: 'gift', from: c.id, name: c.name, potion: m.potion.slice(0, 20) });
  } else if (t === 'draw') {
    const st = m.stroke;
    if (!st || !Array.isArray(st.p) || st.p.length > 600 || !RELAY_OK(m.act)) return;
    if (!st.p.every(q => Array.isArray(q) && RELAY_OK(q[0]) && RELAY_OK(q[1]))) return;
    broadcast(room, { t: 'draw', from: c.id, act: m.act, stroke: { id: String(st.id).slice(0, 24), c: String(st.c).slice(0, 9), p: st.p } }, c);
  } else if (t === 'drawundo') {
    broadcast(room, { t: 'drawundo', from: c.id, act: m.act, id: String(m.id).slice(0, 24) }, c);
  } else if (t === 'drawclear') {
    broadcast(room, { t: 'drawclear', from: c.id, act: m.act }, c);
  }
}

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key || String(req.headers.upgrade).toLowerCase() !== 'websocket') { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  socket.setNoDelay(true);
  try { socket.setKeepAlive(true, 15000); } catch (e) {}

  const conn = { sock: socket, member: null, closed: false, alive: true, seen: Date.now() };
  allConns.add(conn);
  let buf = Buffer.alloc(0), frags = [];
  const close = () => { if (conn.closed) return; conn.closed = true; allConns.delete(conn); detach(conn); try { socket.destroy(); } catch (e) {} };
  conn.kill = close;

  socket.on('data', d => {
    conn.alive = true; conn.seen = Date.now();
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
      if (op === 9) { try { socket.write(frame(10, payload)); } catch (e) {} continue; }
      if (op === 10) continue;
      if (op === 1 || op === 0) {
        frags.push(payload);
        if (fin) {
          const text = Buffer.concat(frags).toString('utf8'); frags = [];
          let m = null; try { m = JSON.parse(text); } catch (e) {}
          try { handle(conn, m); } catch (e) { console.error('handle error', e); }
        }
      }
    }
  });
  socket.on('close', close);
  socket.on('error', close);
  socket.on('timeout', close);
});

/* 心跳：发送 ping 帧与应用层 hb；上一个周期没有任何回应的连接视为死连接，强制关闭（成员进入宽限期） */
const allConns = new Set();
setInterval(() => {
  for (const conn of [...allConns]) {
    if (!conn.alive) { conn.kill(); continue; }
    conn.alive = false;
    try { conn.sock.write(frame(9, Buffer.alloc(0))); conn.sock.write(frame(1, '{"t":"hb"}')); } catch (e) { conn.kill(); }
  }
}, PING_MS);

server.listen(PORT, () => {
  console.log('OI 尖塔 II 已启动： http://localhost:' + PORT);
  console.log('局域网内其他人请访问： http://<本机IP>:' + PORT);
});
