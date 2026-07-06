import { createHash } from 'crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import path from 'path';

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`).join(',')}}`;
}

export function sha256Hex(input: string | Buffer | unknown): string {
  const data = typeof input === 'string' || Buffer.isBuffer(input) ? input : stableJson(input);
  return createHash('sha256').update(data).digest('hex');
}

export const HASH_METADATA_KEYS = new Set([
  'artifactHash',
  'programSourceHash',
  'idlHash',
  'proofGeneratorHash',
  'verifierHash',
  'rawVerifierHash',
  'publishedVerifierHash',
  'stampMode',
  'publishedAt',
]);

export function stripHashMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripHashMetadata);
  if (value === null || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (HASH_METADATA_KEYS.has(key)) continue;
    out[key] = stripHashMetadata(child);
  }
  return out;
}

export function canonicalArtifactHash(value: unknown): string {
  return sha256Hex(stableJson(stripHashMetadata(value)));
}

export function readJson<T>(filePath: string, fallback?: T): T {
  const resolved = path.resolve(filePath);
  if (!existsSync(resolved)) {
    if (arguments.length === 2) return fallback as T;
    throw new Error(`Missing required file: ${resolved}`);
  }
  return JSON.parse(readFileSync(resolved, 'utf8')) as T;
}

export function writeJson(filePath: string, value: unknown): string {
  const resolved = path.resolve(filePath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(value, null, 2)}\n`);
  return resolved;
}

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...listFiles(full));
    else files.push(full);
  }
  return files.sort();
}

const TEXT_HASH_EXTENSIONS = new Set([
  '.cjs',
  '.js',
  '.json',
  '.mjs',
  '.rs',
  '.ts',
  '.tsx',
]);

function canonicalFileContent(file: string): Buffer {
  const content = readFileSync(file);
  if (!TEXT_HASH_EXTENSIONS.has(path.extname(file).toLowerCase())) return content;
  return Buffer.from(content.toString('utf8').replace(/\r\n?/g, '\n'), 'utf8');
}

export function hashFiles(paths: string[]): string | null {
  const files = paths.flatMap((item) => {
    if (!existsSync(item)) return [];
    const stat = statSync(item);
    return stat.isDirectory() ? listFiles(item) : [item];
  }).sort();
  if (files.length === 0) return null;
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file.replace(process.cwd(), '').replace(/\\/g, '/'));
    hash.update('\0');
    hash.update(canonicalFileContent(file));
    hash.update('\0');
  }
  return hash.digest('hex');
}

export function hashJsonFileCanonical(filePath: string): string | null {
  const resolved = path.resolve(filePath);
  if (!existsSync(resolved)) return null;
  return canonicalArtifactHash(JSON.parse(readFileSync(resolved, 'utf8')));
}

export function computeProofHashes(extraFiles: string[] = []) {
  return {
    programSourceHash: hashFiles(['programs/viral_sync/src']),
    idlHash: hashFiles(['idl/viral_sync.json']),
    proofGeneratorHash: hashFiles([
      'scripts/run-causal-commerce-localnet.ts',
      'scripts/generate-merchant-passport.ts',
      'scripts/generate-fraud-gauntlet.ts',
      'scripts/generate-proof-feed.ts',
      'scripts/generate-conversion-orderbook.ts',
      'scripts/generate-campaign-links.ts',
      'scripts/generate-merchant-validation-kit.ts',
      'scripts/generate-invariant-matrix.ts',
      ...extraFiles,
    ]),
    verifierHash: hashFiles([
      'scripts/verify-causal-receipt-localnet.ts',
      'sdk/src/index.ts',
      'scripts/validate-proof-schemas.ts',
    ]),
    rawVerifierHash: hashJsonFileCanonical('tmp/devnet-causal-commerce-verifier.json'),
    publishedVerifierHash: hashJsonFileCanonical('app/public/proofs/devnet-causal-commerce-verifier.json'),
  };
}

export function stampArtifact<T extends Record<string, unknown>>(artifact: T, extraFiles: string[] = []): T & ReturnType<typeof computeProofHashes> {
  return {
    ...artifact,
    ...computeProofHashes(extraFiles),
  };
}

export function staleStatus(status?: string) {
  return /needs|stale|unsafe|no-go/i.test(status ?? '');
}
