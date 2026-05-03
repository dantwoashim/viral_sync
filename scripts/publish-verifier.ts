import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

const source = path.resolve(process.argv.includes('--source') ? process.argv[process.argv.indexOf('--source') + 1] : 'tmp/devnet-causal-commerce-verifier.json');
const destination = path.resolve(process.argv.includes('--output') ? process.argv[process.argv.indexOf('--output') + 1] : 'app/public/proofs/devnet-causal-commerce-verifier.json');
if (!existsSync(source)) throw new Error(`Verifier output missing: ${source}`);
mkdirSync(path.dirname(destination), { recursive: true });
copyFileSync(source, destination);
// Preserve a normalized copy with a fresh publishedAt marker for public proof pages.
try {
  const json = JSON.parse(readFileSync(destination, 'utf8'));
  json.publishedAt = new Date().toISOString();
  writeFileSync(destination, `${JSON.stringify(json, null, 2)}\n`);
} catch {}
console.log(JSON.stringify({ ok: true, source, destination }, null, 2));
