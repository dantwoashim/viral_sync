import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import path from 'path';

const output = path.resolve('dist/frontier-submission');
const include = [
  'README.md',
  'Anchor.toml',
  'package.json',
  'package-lock.json',
  'app/package.json',
  'app/public/proofs',
  'app/public/.well-known',
  'app/public/icon.png',
  'dist/auditor-packet',
  'dist/final-command-transcript.txt',
  'docs',
  'idl',
  'poc1',
  'programs',
  'scripts',
  'sdk',
  'schemas',
  'tests',
];

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

const copied = [];
for (const item of include) {
  const source = path.resolve(item);
  if (!existsSync(source)) continue;
  const destination = path.join(output, item);
  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
  copied.push(item);
}

writeFileSync(
  path.join(output, 'SUBMISSION-CONTENTS.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), copied }, null, 2)}\n`,
);

console.log(JSON.stringify({ ok: true, output, copied }, null, 2));
