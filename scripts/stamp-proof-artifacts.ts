import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { canonicalArtifactHash, computeProofHashes } from './proof-artifact-utils';
const dir = path.resolve('app/public/proofs');
const stampMode = process.env.MOCK_FINAL === '1' ? 'mock-final-not-submission' : 'final-candidate';
if (!existsSync(dir)) throw new Error('app/public/proofs does not exist');
const hashes = computeProofHashes();
let stamped = 0;
for (const file of readdirSync(dir)) {
  if (!file.endsWith('.json')) continue;
  const full = path.join(dir, file);
  const raw = readFileSync(full, 'utf8');
  const json = JSON.parse(raw);
  const safeHashes = Object.fromEntries(Object.entries(hashes).map(([key, value]) => [key, value ?? json[key] ?? 'unavailable-until-build']));
  const stampedArtifact = { ...json, ...safeHashes, stampMode };
  writeFileSync(full, `${JSON.stringify({ ...stampedArtifact, artifactHash: canonicalArtifactHash(stampedArtifact) }, null, 2)}\n`);
  stamped += 1;
}
console.log(JSON.stringify({ ok: true, stamped, hashes }, null, 2));
