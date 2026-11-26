'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
const files = [
  ['index.html', 'index.html'],
  ['css/style.css', 'css/style.css'],
  ['js/main.js', 'js/main.js']
];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const [source, target] of files) {
  const from = path.join(root, source);
  const to = path.join(out, target);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

console.log(`Built ${files.length} files into dist/`);
