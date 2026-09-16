import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scripts = join(root, 'scripts');
const pub = join(root, 'public');
mkdirSync(pub, { recursive: true });

// Reassemble brand-assets-NAME.frag.NNN[.hex] into brand-assets-NAME
const frags = {};
for (const name of readdirSync(scripts)) {
  const m = /^(brand-assets-.+)\.frag\.(\d+)(\.hex)?$/.exec(name);
  if (!m) continue;
  const [, base, idx, hex] = m;
  if (!frags[base]) frags[base] = {};
  const raw = readFileSync(join(scripts, name), 'utf8');
  frags[base][Number(idx)] = hex ? Buffer.from(raw.trim(), 'hex').toString('utf8') : raw;
}
for (const [base, parts] of Object.entries(frags)) {
  const dest = join(scripts, base);
  // Prefer a committed whole file over legacy/incomplete frag packs.
  try {
    const existing = readFileSync(dest, 'utf8');
    if (existing.trim().startsWith('{')) {
      JSON.parse(existing);
      console.log('keeping committed', base, existing.length, 'bytes');
      continue;
    }
  } catch {
    // missing or invalid — fall through to frag reassembly
  }
  const idxs = Object.keys(parts).map(Number).sort((a, b) => a - b);
  const body = idxs.map((i) => parts[i]).join('');
  writeFileSync(dest, body);
  console.log('reassembled', base, body.length, 'bytes');
}

const assets = {};
for (const name of readdirSync(scripts)) {
  if (!name.startsWith('brand-assets') || !name.endsWith('.b64.json')) continue;
  Object.assign(assets, JSON.parse(readFileSync(join(scripts, name), 'utf8')));
}

// Reassemble split parts: "file.png#part0of3" -> file.png
const parts = {};
const whole = {};
for (const [key, val] of Object.entries(assets)) {
  const m = /^(.*)#part(\d+)of(\d+)$/.exec(key);
  if (m) {
    const [, file, idx, total] = m;
    if (!parts[file]) parts[file] = { total: Number(total), chunks: {} };
    parts[file].chunks[Number(idx)] = val;
  } else {
    whole[key] = val;
  }
}
for (const [file, info] of Object.entries(parts)) {
  const ordered = [];
  let missing = false;
  for (let i = 0; i < info.total; i++) {
    if (info.chunks[i] == null) {
      console.warn(`Skipping ${file}: missing part ${i}/${info.total}`);
      missing = true;
      break;
    }
    ordered.push(info.chunks[i]);
  }
  if (!missing) whole[file] = ordered.join('');
}

if (!Object.keys(whole).length) {
  console.warn('No brand-assets*.b64.json found — skipping');
  process.exit(0);
}
for (const [name, b64] of Object.entries(whole)) {
  const buf = Buffer.from(b64, 'base64');
  const out = name.includes('/') ? join(root, name) : join(pub, name);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buf);
  console.log('wrote', name, buf.length, 'bytes');
}
