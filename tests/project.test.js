'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

test('HTML loads external styles and script', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /href="css\/style\.css"/);
  assert.match(html, /src="js\/main\.js"/);
  assert.doesNotMatch(html, /<style>|<script>/);
});

test('required frontend assets exist', () => {
  assert.ok(fs.statSync(path.join(root, 'css/style.css')).isFile());
  assert.ok(fs.statSync(path.join(root, 'js/main.js')).isFile());
});

test('save archive format is exposed by the frontend', () => {
  const js = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
  assert.match(js, /OISP2:/);
  assert.match(js, /data-a="openArchive"/);
  assert.match(js, /mergeArchiveProgress/);
});

test('completed run history is reachable and includes recap metrics', () => {
  const js = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
  assert.match(js, /LS_HISTORY='oi3_history'/);
  assert.match(js, /function historyHTML\(\)/);
  assert.match(js, /data-a="goHistory"/);
  assert.match(js, /case 'goHistory'/);
  assert.match(js, /data-a="endHistory"/);
  assert.match(js, /data-a="historySeed"/);
  assert.match(js, /elites:run\.stats\.elites/);
  assert.match(js, /累计用时/);
  assert.match(js, /累计超时扣血/);
});

test('unknown rooms favor events, shops, and treasure over combat', () => {
  const js = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
  const resolver = js.match(/const UNKNOWN_ROOM_OUTCOMES=.*?;\nfunction resolveUnknown\(rr\)\{[\s\S]*?\n\}/);
  assert.ok(resolver);
  const resolveUnknown = vm.runInNewContext(`(()=>{${resolver[0]};return resolveUnknown})()`);
  assert.equal(resolveUnknown(() => 0.05), 'monster');
  assert.equal(resolveUnknown(() => 0.15), 'shop');
  assert.equal(resolveUnknown(() => 0.32), 'treasure');
  assert.equal(resolveUnknown(() => 0.5), 'event');
});

test('netlify static build lists index and assets', () => {
  const config = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
  assert.match(config, /npm run build/);
  assert.match(config, /publish\s*=.*dist/);
});
