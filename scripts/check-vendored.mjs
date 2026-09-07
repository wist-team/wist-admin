// Compares src/vendor/* against the user-app checkout so drift is visible.
// Usage: node scripts/check-vendored.mjs [path-to-wist-checkout]
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const wistRoot = process.argv[2] ?? join(process.env.HOME ?? '', 'Developer', 'wist');
const manifest = JSON.parse(readFileSync(new URL('../src/vendor/MANIFEST.json', import.meta.url), 'utf8'));
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
let drift = 0;
for (const f of manifest.files) {
  const vendored = new URL(`../src/vendor/${f.path}`, import.meta.url);
  const source = join(wistRoot, f.sourcePath);
  const vendoredSha = sha(vendored);
  if (vendoredSha !== f.sha256) { console.log(`MODIFIED LOCALLY  ${f.path} (manifest ${f.sha256.slice(0, 8)}, file ${vendoredSha.slice(0, 8)})`); drift++; continue; }
  if (!existsSync(source)) { console.log(`SOURCE MISSING    ${f.sourcePath} under ${wistRoot}`); continue; }
  const sourceSha = sha(source);
  if (sourceSha !== f.sha256) { console.log(`UPSTREAM CHANGED  ${f.sourcePath} (copy from ${f.sourceCommit.slice(0, 8)}; upstream now ${sourceSha.slice(0, 8)})`); drift++; }
  else console.log(`OK                ${f.path}`);
}
process.exit(drift ? 1 : 0);
