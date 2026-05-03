import fs from 'fs';
import path from 'path';
import { Keypair, PublicKey } from '@solana/web3.js';
import { writeJson } from './proof-artifact-utils';

function read(file: string) {
  return fs.readFileSync(path.resolve(file), 'utf8');
}

const anchorToml = read('Anchor.toml');
const lib = read('programs/viral_sync/src/lib.rs');
const anchorMatch = anchorToml.match(/viral_sync\s*=\s*"([^"]+)"/);
const declareMatch = lib.match(/declare_id!\("([^"]+)"\)/);
const failures: string[] = [];
const strict = process.env.PROGRAM_ID_STRICT === '1' || process.argv.includes('--strict');

if (!anchorMatch) failures.push('Anchor.toml viral_sync program ID missing');
if (!declareMatch) failures.push('declare_id! missing in lib.rs');

const anchorId = anchorMatch?.[1];
const declareId = declareMatch?.[1];
let deployKeypair: string | null = null;

if (anchorId && declareId && anchorId !== declareId) {
  failures.push(`Anchor.toml ID ${anchorId} != declare_id ${declareId}`);
}

const keypairPath = 'target/deploy/viral_sync-keypair.json';
if (fs.existsSync(path.resolve(keypairPath))) {
  const secret = JSON.parse(read(keypairPath));
  const kp = Keypair.fromSecretKey(Uint8Array.from(secret));
  deployKeypair = kp.publicKey.toBase58();
  if (anchorId && deployKeypair !== anchorId) {
    failures.push(`deploy keypair ${deployKeypair} != Anchor.toml ${anchorId}`);
  }
} else if (strict) {
  failures.push('target/deploy/viral_sync-keypair.json missing');
}

for (const id of [anchorId, declareId, deployKeypair].filter(Boolean)) {
  try {
    new PublicKey(id!);
  } catch {
    failures.push(`Invalid pubkey: ${id}`);
  }
}

const result = {
  ok: failures.length === 0,
  programId: anchorId,
  programIdConsistency: {
    anchorToml: anchorId,
    declareId,
    deployKeypair,
    matches: failures.length === 0,
  },
  failures,
};

writeJson('app/public/proofs/program-id-consistency.json', result);
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
