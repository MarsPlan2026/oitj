'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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

test('netlify static build lists index and assets', () => {
  const config = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
  assert.match(config, /npm run build/);
  assert.match(config, /publish\s*=.*dist/);
});
