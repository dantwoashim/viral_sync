import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import path from 'path';
import { computeProofHashes, writeJson } from './proof-artifact-utils';

const out = path.resolve('dist/auditor-packet');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

function copy(src: string, dest = src) {
  const resolved = path.resolve(src);
  if (!existsSync(resolved)) return false;
  mkdirSync(path.dirname(path.join(out, dest)), { recursive: true });
  cpSync(resolved, path.join(out, dest), { recursive: true });
  return true;
}

const files = [
  'README.md',
  'docs/POC-1.md',
  'docs/protocol-invariants.md',
  'docs/invariant-matrix.md',
  'docs/frontier-submission-packet.md',
  'docs/frontier-final-go-no-go.md',
  'docs/frontier-final-run-readiness.md',
  'docs/merchant-validation-rubric.md',
  'docs/merchant-interview-template.md',
  'app/public/proofs/devnet-causal-commerce.json',
  'app/public/proofs/devnet-causal-commerce-verifier.json',
  'app/public/proofs/fraud-gauntlet.json',
  'app/public/proofs/merchant-passport.json',
  'app/public/proofs/conversion-orderbook.json',
  'app/public/proofs/campaign-links.json',
  'app/public/proofs/proof-feed.json',
  'app/public/proofs/frontier-readiness.json',
  'app/public/proofs/program-id-consistency.json',
  'app/public/proofs/merchant-validation-kit.json',
  'app/public/proofs/invariant-matrix.json',
  'tmp/devnet-causal-commerce-verifier.json',
  'target/idl/viral_sync.json',
  'sdk/src/index.ts',
  'scripts/verify-causal-receipt-localnet.ts',
  'scripts/generate-fraud-gauntlet.ts',
  'scripts/generate-merchant-passport.ts',
  'scripts/generate-proof-feed.ts',
  'scripts/validate-proof-schemas.ts',
  'scripts/assert-no-stale-artifacts.ts',
  'dist/final-command-transcript.txt',
];

const copied = files.filter((file) => copy(file));
copy('schemas', 'schemas');

writeFileSync(path.join(out, 'known-limitations.md'), `# Known limitations\n\n- After future protocol, verifier, schema, or proof-generator changes, rerun frontier:final before submission or deployment.\n- Counter-attestation is merchant terminal + visitor signing, not GPS or independent physical-world oracle proof.\n- Mainnet use requires external audit, funded relayer operations, and production incident process.\n`);

writeFileSync(path.join(out, 'how-to-reproduce.md'), `# Reproduce Frontier Proof\n\n1. Fund the configured devnet wallet. The final proof command uses --airdrop-sol 0 so it does not depend on faucet availability.\n2. Confirm the program ID in Anchor.toml, declare_id!, and the deploy keypair match.\n3. Run:\n\n\`\`\`bash\nnpm ci\nnpm run frontier:offline-preflight\nnpm run frontier:mock-final\nnpm run frontier:final 2>&1 | tee dist/final-command-transcript.txt\n\`\`\`\n\nThe mock command only rehearses the artifact pipeline with fixtures. It is not submission evidence.\n`);

writeJson(path.join(out, 'artifact-hashes.json'), computeProofHashes([
  'docs/POC-1.md',
  'docs/invariant-matrix.md',
  'schemas',
  'sdk/src/index.ts',
  'scripts/verify-causal-receipt-localnet.ts',
  'scripts/generate-fraud-gauntlet.ts',
]));

writeFileSync(path.join(out, 'README.md'), `# Viral Sync Auditor Packet\n\nThis packet is a self-contained review bundle for Viral Sync POC-1 proof-of-conversion artifacts.\n\nStart with:\n\n1. docs/POC-1.md\n2. docs/invariant-matrix.md\n3. app/public/proofs/devnet-causal-commerce.json\n4. app/public/proofs/devnet-causal-commerce-verifier.json (published copy) and tmp/devnet-causal-commerce-verifier.json (raw verifier output)\n5. app/public/proofs/fraud-gauntlet.json\n6. app/public/proofs/proof-feed.json\n7. schemas/\n8. sdk/src/index.ts\n9. artifact-hashes.json\n10. how-to-reproduce.md\n11. final-command-transcript.txt, when present after a final run\n`);

console.log(JSON.stringify({ ok: true, outputPath: out, copied }, null, 2));
