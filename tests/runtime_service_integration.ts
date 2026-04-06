import { expect } from 'chai';
import http, { type IncomingMessage, type ServerResponse } from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, type ChildProcess } from 'child_process';

import bs58 from 'bs58';
import {
  Keypair,
  PublicKey,
  Transaction,
} from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('D9ds2V6y4GFGKbo8wF8qQiF81dzhkiznmZsHepcSN6Ta');
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const MOCK_SIGNATURE = 'mock-signature-geo-redeem';

interface MockAccountRecord {
  owner: string;
  data: Buffer;
  lamports?: number;
}

interface JsonRpcRequest {
  id?: string | number | null;
  method: string;
  params?: unknown[];
}

class MockRpcServer {
  public readonly accounts = new Map<string, MockAccountRecord>();
  public readonly blockhash = Keypair.generate().publicKey.toBase58();
  public readonly sendTransactions: string[] = [];

  private server: http.Server | null = null;
  private port = 0;

  get url(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  async start(): Promise<void> {
    this.server = http.createServer((req, res) => {
      void this.handle(req, res);
    });
    await new Promise<void>((resolve) => {
      this.server!.listen(0, '127.0.0.1', () => {
        const address = this.server!.address();
        if (address && typeof address === 'object') {
          this.port = address.port;
        }
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      this.server!.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    this.server = null;
  }

  setAccount(pubkey: PublicKey, record: MockAccountRecord) {
    this.accounts.set(pubkey.toBase58(), record);
  }

  private async handle(req: IncomingMessage, res: ServerResponse) {
    try {
      const body = await readBody(req);
      const payload = JSON.parse(body) as JsonRpcRequest;
      const result = this.handleRpc(payload);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: payload.id ?? 1, result }));
    } catch (error: unknown) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        error: { message: error instanceof Error ? error.message : 'Mock RPC failure' },
      }));
    }
  }

  private handleRpc(payload: JsonRpcRequest): unknown {
    switch (payload.method) {
      case 'getLatestBlockhash':
        return {
          context: { slot: 1 },
          value: {
            blockhash: this.blockhash,
            lastValidBlockHeight: 123,
          },
        };
      case 'getEpochInfo':
        return {
          absoluteSlot: 1,
          blockHeight: 1,
          epoch: 1,
          slotIndex: 1,
          slotsInEpoch: 432000,
          transactionCount: 1,
        };
      case 'getBalance':
        return {
          context: { slot: 1 },
          value: 5_000_000_000,
        };
      case 'getFeeForMessage':
        return {
          context: { slot: 1 },
          value: 5000,
        };
      case 'simulateTransaction':
        return {
          context: { slot: 1 },
          value: {
            err: null,
            logs: ['mock simulation ok'],
            unitsConsumed: 10_000,
          },
        };
      case 'sendTransaction': {
        const params = Array.isArray(payload.params) ? payload.params : [];
        if (typeof params[0] === 'string') {
          this.sendTransactions.push(params[0]);
        }
        return MOCK_SIGNATURE;
      }
      case 'getAccountInfo': {
        const pubkey = String((payload.params ?? [])[0] ?? '');
        return {
          context: { slot: 1 },
          value: this.toRpcAccount(this.accounts.get(pubkey) ?? null),
        };
      }
      case 'getMultipleAccounts': {
        const requested = Array.isArray((payload.params ?? [])[0])
          ? ((payload.params ?? [])[0] as string[])
          : [];
        return {
          context: { slot: 1 },
          value: requested.map((pubkey) => this.toRpcAccount(this.accounts.get(pubkey) ?? null)),
        };
      }
      default:
        throw new Error(`Unhandled mock RPC method: ${payload.method}`);
    }
  }

  private toRpcAccount(record: MockAccountRecord | null) {
    if (!record) {
      return null;
    }

    return {
      data: [record.data.toString('base64'), 'base64'],
      executable: false,
      lamports: record.lamports ?? 1,
      owner: record.owner,
      rentEpoch: 0,
      space: record.data.length,
    };
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function findMerchantConfigPda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('merchant_v4'), mint.toBuffer()], PROGRAM_ID)[0];
}

function findVaultEntryPda(mint: PublicKey, vault: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('vault_entry'), mint.toBuffer(), vault.toBuffer()], PROGRAM_ID)[0];
}

function findGeoFencePda(mint: PublicKey, vault: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('geo_fence'), mint.toBuffer(), vault.toBuffer()], PROGRAM_ID)[0];
}

function findTokenGenerationPda(mint: PublicKey, owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('gen_v4'), mint.toBuffer(), owner.toBuffer()], PROGRAM_ID)[0];
}

function findGeoNoncePda(fence: PublicKey, redeemer: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('geo_nonce'), fence.toBuffer(), redeemer.toBuffer()], PROGRAM_ID)[0];
}

function findTransferHookValidationPda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('extra-account-metas'), mint.toBuffer()], PROGRAM_ID)[0];
}

function getAssociatedTokenAddressSync(mint: PublicKey, owner: PublicKey, allowOwnerOffCurve = false): PublicKey {
  if (!allowOwnerOffCurve && !PublicKey.isOnCurve(owner.toBuffer())) {
    throw new Error('Owner must be on curve');
  }
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_2022_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

function createMintBuffer(mint: PublicKey): Buffer {
  const transferFeeLength = 108;
  const transferHookLength = 64;
  const totalLength = 165 + 1 + 4 + transferFeeLength + 4 + transferHookLength;
  const data = Buffer.alloc(totalLength);
  data.writeBigUInt64LE(1_000_000n, 36);
  data.writeUInt8(6, 44);
  data.writeUInt8(1, 45);
  data.writeUInt8(1, 165);

  let cursor = 166;
  data.writeUInt16LE(1, cursor);
  data.writeUInt16LE(transferFeeLength, cursor + 2);
  cursor += 4;
  data.writeBigUInt64LE(0n, cursor + 72);
  data.writeBigUInt64LE(0n, cursor + 80);
  data.writeUInt16LE(0, cursor + 88);
  data.writeBigUInt64LE(0n, cursor + 90);
  data.writeBigUInt64LE(0n, cursor + 98);
  data.writeUInt16LE(0, cursor + 106);
  cursor += transferFeeLength;

  data.writeUInt16LE(14, cursor);
  data.writeUInt16LE(transferHookLength, cursor + 2);
  cursor += 4;
  PROGRAM_ID.toBuffer().copy(data, cursor + 32);

  return data;
}

function createTokenAccountBuffer(mint: PublicKey, owner: PublicKey, amount: bigint): Buffer {
  const data = Buffer.alloc(165);
  mint.toBuffer().copy(data, 0);
  owner.toBuffer().copy(data, 32);
  data.writeBigUInt64LE(amount, 64);
  data.writeUInt8(1, 108);
  return data;
}

function createGeoFenceBuffer(params: {
  vault: PublicKey;
  merchant: PublicKey;
  mint: PublicKey;
  latMicro: number;
  lngMicro: number;
  radiusMeters: number;
  isActive?: boolean;
}): Buffer {
  const data = Buffer.alloc(8 + 1 + 32 + 32 + 32 + 4 + 4 + 4 + 1);
  let offset = 8;
  data.writeUInt8(1, offset);
  offset += 1;
  params.vault.toBuffer().copy(data, offset);
  offset += 32;
  params.merchant.toBuffer().copy(data, offset);
  offset += 32;
  params.mint.toBuffer().copy(data, offset);
  offset += 32;
  data.writeInt32LE(params.latMicro, offset);
  offset += 4;
  data.writeInt32LE(params.lngMicro, offset);
  offset += 4;
  data.writeUInt32LE(params.radiusMeters, offset);
  offset += 4;
  data.writeUInt8(params.isActive === false ? 0 : 1, offset);
  return data;
}

async function getFreePort(): Promise<number> {
  const server = http.createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (!address || typeof address !== 'object') {
    throw new Error('Failed to allocate free port');
  }
  return address.port;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(url: string): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < 45_000) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (response.ok) {
        return;
      }
    } catch {
      // wait for service
    }
    await wait(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function spawnTypeScriptService(args: string[], env: NodeJS.ProcessEnv): ChildProcess {
  return spawn(process.execPath, ['-r', 'ts-node/register/transpile-only', ...args], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function stopChild(processRef: ChildProcess | null): Promise<void> {
  if (!processRef || processRef.exitCode !== null) {
    return;
  }
  processRef.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => processRef.once('exit', resolve)),
    wait(5_000),
  ]);
  if (processRef.exitCode === null) {
    processRef.kill('SIGKILL');
  }
}

describe('runtime service integration', function () {
  this.timeout(60_000);

  let rpc: MockRpcServer;
  let tempDir: string;
  let actionProcess: ChildProcess | null = null;
  let relayerProcess: ChildProcess | null = null;

  beforeEach(async () => {
    rpc = new MockRpcServer();
    await rpc.start();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'viral-sync-int-'));
  });

  afterEach(async () => {
    await stopChild(actionProcess);
    await stopChild(relayerProcess);
    actionProcess = null;
    relayerProcess = null;
    await rpc.stop();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('runs operator auth, POS code issuance, redemption preparation, and sponsored relay submission end to end', async () => {
    const merchant = Keypair.generate();
    const operator = Keypair.generate();
    const customer = Keypair.generate();
    const mint = Keypair.generate().publicKey;
    const attestation = Keypair.generate();
    const relayer = Keypair.generate();
    const sourceAta = getAssociatedTokenAddressSync(mint, customer.publicKey);
    const vaultTokenAccount = Keypair.generate().publicKey;
    const fence = findGeoFencePda(mint, vaultTokenAccount);
    const merchantConfig = findMerchantConfigPda(mint);
    const vaultEntry = findVaultEntryPda(mint, vaultTokenAccount);
    const sourceGeneration = findTokenGenerationPda(mint, customer.publicKey);
    const destGeneration = findTokenGenerationPda(mint, merchant.publicKey);
    const geoNonce = findGeoNoncePda(fence, customer.publicKey);
    const validationState = findTransferHookValidationPda(mint);

    rpc.setAccount(fence, {
      owner: PROGRAM_ID.toBase58(),
      data: createGeoFenceBuffer({
        vault: vaultTokenAccount,
        merchant: merchant.publicKey,
        mint,
        latMicro: 27_717_200,
        lngMicro: 85_324_000,
        radiusMeters: 250,
      }),
    });
    rpc.setAccount(mint, {
      owner: TOKEN_2022_PROGRAM_ID.toBase58(),
      data: createMintBuffer(mint),
    });
    rpc.setAccount(sourceAta, {
      owner: TOKEN_2022_PROGRAM_ID.toBase58(),
      data: createTokenAccountBuffer(mint, customer.publicKey, 250_000n),
    });
    rpc.setAccount(vaultTokenAccount, {
      owner: TOKEN_2022_PROGRAM_ID.toBase58(),
      data: createTokenAccountBuffer(mint, merchant.publicKey, 0n),
    });
    rpc.setAccount(merchantConfig, { owner: PROGRAM_ID.toBase58(), data: Buffer.from([1, 2, 3]) });
    rpc.setAccount(vaultEntry, { owner: PROGRAM_ID.toBase58(), data: Buffer.from([4, 5, 6]) });
    rpc.setAccount(sourceGeneration, { owner: PROGRAM_ID.toBase58(), data: Buffer.from([7, 8, 9]) });
    rpc.setAccount(destGeneration, { owner: PROGRAM_ID.toBase58(), data: Buffer.from([10, 11, 12]) });
    rpc.setAccount(validationState, { owner: PROGRAM_ID.toBase58(), data: Buffer.from([13, 14, 15]) });
    rpc.setAccount(geoNonce, { owner: PROGRAM_ID.toBase58(), data: Buffer.from([16, 17, 18]) });

    const actionPort = await getFreePort();
    const relayerPort = await getFreePort();

    actionProcess = spawnTypeScriptService(
      ['server/actions/src/index.ts'],
      {
        TS_NODE_PROJECT: path.join(process.cwd(), 'server/actions/tsconfig.json'),
        PORT: String(actionPort),
        RPC_URL: rpc.url,
        PROGRAM_ID: PROGRAM_ID.toBase58(),
        ACTION_ALLOW_ORIGINLESS: 'true',
        ACTION_DISABLE_SIGNATURE_VERIFY: 'true',
        ACTION_ALLOWED_MERCHANTS: merchant.publicKey.toBase58(),
        ACTION_ALLOWED_MINTS: mint.toBase58(),
        ACTION_ALLOWED_OPERATORS: `${merchant.publicKey.toBase58()}:${operator.publicKey.toBase58()}`,
        ACTION_ATTESTATION_SECRET: bs58.encode(attestation.secretKey),
        ACTION_RELAYER_PUBKEY: relayer.publicKey.toBase58(),
        ACTION_STATE_PATH: path.join(tempDir, 'actions-state.json'),
      },
    );
    await waitForHealth(`http://127.0.0.1:${actionPort}/v1/health`);

    relayerProcess = spawnTypeScriptService(
      ['relayer/src/index.ts'],
      {
        TS_NODE_PROJECT: path.join(process.cwd(), 'relayer/tsconfig.json'),
        PORT: String(relayerPort),
        RPC_URL: rpc.url,
        PROGRAM_ID: PROGRAM_ID.toBase58(),
        ALLOW_INSECURE_DEV_RELAY: 'true',
        RELAYER_SECRET: bs58.encode(relayer.secretKey),
        RELAYER_STATE_PATH: path.join(tempDir, 'relayer-state.json'),
        RELAYER_AUDIT_LOG_PATH: path.join(tempDir, 'relayer-audit.log'),
        RELAYER_DEFAULT_MERCHANT_BUDGET_LAMPORTS: '100000',
      },
    );
    await waitForHealth(`http://127.0.0.1:${relayerPort}/v1/health`);

    const challengeResponse = await fetch(`http://127.0.0.1:${actionPort}/v1/operators/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: operator.publicKey.toBase58(),
        merchant: merchant.publicKey.toBase58(),
      }),
    });
    expect(challengeResponse.status).to.equal(200);
    const operatorChallenge = await challengeResponse.json() as { challengeId: string };

    const sessionResponse = await fetch(`http://127.0.0.1:${actionPort}/v1/operators/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challengeId: operatorChallenge.challengeId,
        signatureBase64: Buffer.from('integration-test').toString('base64'),
      }),
    });
    expect(sessionResponse.status).to.equal(200);
    const operatorSession = await sessionResponse.json() as { token: string; role: string };
    expect(operatorSession.role).to.equal('operator');

    const redemptionChallengeResponse = await fetch(`http://127.0.0.1:${actionPort}/v1/redemptions/challenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorSession.token}`,
      },
      body: JSON.stringify({
        merchant: merchant.publicKey.toBase58(),
        fence: fence.toBase58(),
        mint: mint.toBase58(),
        amount: '25000',
        label: 'Latte',
      }),
    });
    expect(redemptionChallengeResponse.status).to.equal(200);
    const redemptionChallenge = await redemptionChallengeResponse.json() as { code: string };

    const prepareResponse = await fetch(`http://127.0.0.1:${actionPort}/v1/redemptions/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: redemptionChallenge.code,
        wallet: customer.publicKey.toBase58(),
        latMicro: 27_717_200,
        lngMicro: 85_324_000,
      }),
    });
    expect(prepareResponse.status).to.equal(200);
    const prepared = await prepareResponse.json() as { transactionBase64: string };
    const tx = Transaction.from(Buffer.from(prepared.transactionBase64, 'base64'));
    tx.partialSign(customer);

    const sponsorResponse = await fetch(`http://127.0.0.1:${relayerPort}/v1/actions/sponsor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'geo-redeem',
        merchant: merchant.publicKey.toBase58(),
        idempotencyKey: 'integration-geo-redeem',
        transactionBase64: tx.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        }).toString('base64'),
      }),
    });
    expect(sponsorResponse.status).to.equal(200);
    const sponsorPayload = await sponsorResponse.json() as { status: string; signature?: string };
    expect(sponsorPayload.status).to.equal('success');
    expect(sponsorPayload.signature).to.equal(MOCK_SIGNATURE);

    const budgetResponse = await fetch(
      `http://127.0.0.1:${relayerPort}/v1/merchants/${merchant.publicKey.toBase58()}/budget`,
      { method: 'GET' },
    );
    expect(budgetResponse.status).to.equal(200);
    const budget = await budgetResponse.json() as {
      sponsoredLamportsRemaining: number;
      lifetimeTransactions: number;
      lifetimeSponsoredLamports: number;
    };
    expect(budget.lifetimeTransactions).to.equal(1);
    expect(budget.lifetimeSponsoredLamports).to.equal(5000);
    expect(budget.sponsoredLamportsRemaining).to.equal(95_000);

    const healthResponse = await fetch(`http://127.0.0.1:${relayerPort}/v1/health`);
    expect(healthResponse.status).to.equal(200);
    const health = await healthResponse.json() as {
      metrics?: {
        actionMetrics: {
          'geo-redeem': { accepted: number };
        };
      };
    };
    expect(health.metrics?.actionMetrics['geo-redeem'].accepted).to.equal(1);
    expect(rpc.sendTransactions).to.have.length(1);
  });

  it('supports runtime admin flags that pause redemption without disabling session issuance', async () => {
    const merchant = Keypair.generate();
    const customer = Keypair.generate();
    const mint = Keypair.generate().publicKey;
    const actionPort = await getFreePort();
    const adminToken = 'integration-admin-token';
    const generation = findTokenGenerationPda(mint, customer.publicKey);

    actionProcess = spawnTypeScriptService(
      ['server/actions/src/index.ts'],
      {
        TS_NODE_PROJECT: path.join(process.cwd(), 'server/actions/tsconfig.json'),
        PORT: String(actionPort),
        RPC_URL: rpc.url,
        PROGRAM_ID: PROGRAM_ID.toBase58(),
        ACTION_ALLOW_ORIGINLESS: 'true',
        ACTION_DISABLE_SIGNATURE_VERIFY: 'true',
        ACTION_ADMIN_TOKEN: adminToken,
        ACTION_ALLOWED_MERCHANTS: merchant.publicKey.toBase58(),
        ACTION_ALLOWED_MINTS: mint.toBase58(),
        ACTION_STATE_PATH: path.join(tempDir, 'actions-state.json'),
      },
    );

    await waitForHealth(`http://127.0.0.1:${actionPort}/v1/health`);

    const initialHealthResponse = await fetch(`http://127.0.0.1:${actionPort}/v1/health`);
    expect(initialHealthResponse.status).to.equal(200);
    const initialHealth = await initialHealthResponse.json() as {
      disabledActions?: string[];
    };
    expect(initialHealth.disabledActions ?? []).to.deep.equal([]);

    const sessionChallengeResponse = await fetch(`http://127.0.0.1:${actionPort}/v1/session/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: customer.publicKey.toBase58(),
        delegate: Keypair.generate().publicKey.toBase58(),
        generation: generation.toBase58(),
        mint: mint.toBase58(),
        merchant: merchant.publicKey.toBase58(),
      }),
    });
    expect(sessionChallengeResponse.status).to.equal(200);

    const flagUpdateResponse = await fetch(`http://127.0.0.1:${actionPort}/v1/admin/runtime-flags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        disabledActions: ['redemption'],
      }),
    });
    expect(flagUpdateResponse.status).to.equal(200);
    const flagUpdate = await flagUpdateResponse.json() as {
      disabledActions: string[];
    };
    expect(flagUpdate.disabledActions).to.deep.equal(['redemption']);

    const updatedHealthResponse = await fetch(`http://127.0.0.1:${actionPort}/v1/health`);
    expect(updatedHealthResponse.status).to.equal(200);
    const updatedHealth = await updatedHealthResponse.json() as {
      disabledActions?: string[];
    };
    expect(updatedHealth.disabledActions).to.deep.equal(['redemption']);

    const redemptionChallengeResponse = await fetch(`http://127.0.0.1:${actionPort}/v1/redemptions/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(redemptionChallengeResponse.status).to.equal(503);
    const redemptionError = await redemptionChallengeResponse.json() as { error?: string };
    expect(redemptionError.error).to.contain('temporarily disabled');
  });

  it('persists relayer paused actions across restarts and rejects sponsored actions while paused', async () => {
    const relayer = Keypair.generate();
    const relayerPort = await getFreePort();
    const adminToken = 'relayer-admin-token';
    const statePath = path.join(tempDir, 'relayer-state.json');
    const auditLogPath = path.join(tempDir, 'relayer-audit.log');

    const spawnRelayer = () => spawnTypeScriptService(
      ['relayer/src/index.ts'],
      {
        TS_NODE_PROJECT: path.join(process.cwd(), 'relayer/tsconfig.json'),
        PORT: String(relayerPort),
        RPC_URL: rpc.url,
        PROGRAM_ID: PROGRAM_ID.toBase58(),
        RELAYER_ALLOW_ORIGINLESS: 'true',
        RELAYER_SECRET: bs58.encode(relayer.secretKey),
        RELAYER_ADMIN_TOKEN: adminToken,
        RELAYER_STATE_PATH: statePath,
        RELAYER_AUDIT_LOG_PATH: auditLogPath,
        RELAYER_DEFAULT_MERCHANT_BUDGET_LAMPORTS: '100000',
      },
    );

    relayerProcess = spawnRelayer();
    await waitForHealth(`http://127.0.0.1:${relayerPort}/v1/health`);

    const unauthorizedResponse = await fetch(`http://127.0.0.1:${relayerPort}/v1/admin/runtime-flags`);
    expect(unauthorizedResponse.status).to.equal(401);

    const initialFlagsResponse = await fetch(`http://127.0.0.1:${relayerPort}/v1/admin/runtime-flags`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(initialFlagsResponse.status).to.equal(200);
    const initialFlags = await initialFlagsResponse.json() as { pausedActions: string[] };
    expect(initialFlags.pausedActions).to.deep.equal([]);

    const updateFlagsResponse = await fetch(`http://127.0.0.1:${relayerPort}/v1/admin/runtime-flags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        pausedActions: ['geo-redeem'],
      }),
    });
    expect(updateFlagsResponse.status).to.equal(200);
    const updatedFlags = await updateFlagsResponse.json() as { pausedActions: string[] };
    expect(updatedFlags.pausedActions).to.deep.equal(['geo-redeem']);

    const pausedSponsorResponse = await fetch(`http://127.0.0.1:${relayerPort}/v1/actions/sponsor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'geo-redeem',
        merchant: 'merchant-1',
        transactionBase64: 'AQ==',
      }),
    });
    expect(pausedSponsorResponse.status).to.equal(503);
    const pausedSponsorPayload = await pausedSponsorResponse.json() as { error?: string };
    expect(pausedSponsorPayload.error).to.contain('paused');

    await stopChild(relayerProcess);
    relayerProcess = spawnRelayer();
    await waitForHealth(`http://127.0.0.1:${relayerPort}/v1/health`);

    const persistedFlagsResponse = await fetch(`http://127.0.0.1:${relayerPort}/v1/admin/runtime-flags`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(persistedFlagsResponse.status).to.equal(200);
    const persistedFlags = await persistedFlagsResponse.json() as { pausedActions: string[] };
    expect(persistedFlags.pausedActions).to.deep.equal(['geo-redeem']);
  });
});
