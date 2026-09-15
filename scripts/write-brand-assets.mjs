import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scripts = join(root, 'scripts');
const pub = join(root, 'public');
mkdirSync(pub, { recursive: true });

const assets = {};
for (const name of readdirSync(scripts)) {
  if (!name.startsWith('brand-assets') || !name.endsWith('.b64.json')) continue;
  Object.assign(assets, JSON.parse(readFileSync(join(scripts, name), 'utf8')));
}
if (!Object.keys(assets).length) {
  console.warn('No brand-assets*.b64.json found — skipping');
  process.exit(0);
}
for (const [name, b64] of Object.entries(assets)) {
  const buf = Buffer.from(b64, 'base64');
  const out = name.includes('/') ? join(root, name) : join(pub, name);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buf);
  console.log('wrote', name, buf.length, 'bytes');
}
