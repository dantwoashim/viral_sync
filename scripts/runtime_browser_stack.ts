import http, { type IncomingMessage, type ServerResponse } from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, spawnSync, type ChildProcess } from 'child_process';

import bs58 from 'bs58';
import { Keypair, PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('D9ds2V6y4GFGKbo8wF8qQiF81dzhkiznmZsHepcSN6Ta');
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const GEO_LAT = 27.7172;
const GEO_LNG = 85.3240;
const MOCK_SIGNATURE = 'mock-signature-geo-redeem';
const EXIT_ON_READY = process.env.VIRAL_SYNC_SMOKE_ONCE === 'true';
const SKIP_APP_BUILD = process.env.VIRAL_SYNC_SKIP_APP_BUILD === 'true';

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

function createMintBuffer(): Buffer {
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
    data.writeInt32LE(Math.round(GEO_LAT * 1_000_000), offset);
    offset += 4;
    data.writeInt32LE(Math.round(GEO_LNG * 1_000_000), offset);
    offset += 4;
    data.writeUInt32LE(250, offset);
    offset += 4;
    data.writeUInt8(1, offset);
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

async function waitForHttp(url: string): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < 45_000) {
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
            if (response.ok) {
                return;
            }
        } catch {
            // wait for service
        }
        await wait(300);
    }
    throw new Error(`Timed out waiting for ${url}`);
}

function spawnTypeScriptService(target: string, env: NodeJS.ProcessEnv): ChildProcess {
    return spawn(process.execPath, ['-r', 'ts-node/register/transpile-only', target], {
        cwd: process.cwd(),
        env: {
            ...process.env,
            ...env,
        },
        stdio: 'inherit',
    });
}

function spawnNpm(workdir: string, args: string[], env: NodeJS.ProcessEnv): ChildProcess {
    return spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
        cwd: workdir,
        env: {
            ...process.env,
            ...env,
        },
        stdio: 'inherit',
        shell: process.platform === 'win32',
    });
}

function runNpmSync(workdir: string, args: string[], env: NodeJS.ProcessEnv) {
    const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
        cwd: workdir,
        env: {
            ...process.env,
            ...env,
        },
        stdio: 'inherit',
        shell: process.platform === 'win32',
    });

    if (result.status !== 0) {
        throw new Error(`npm ${args.join(' ')} failed with status ${result.status ?? 'unknown'}`);
    }
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

async function main() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'viral-sync-browser-stack-'));
    const rpc = new MockRpcServer();
    let actionProcess: ChildProcess | null = null;
    let relayerProcess: ChildProcess | null = null;
    let appProcess: ChildProcess | null = null;

    try {
        await rpc.start();

        const merchantAuthority = Keypair.generate();
        const merchantOperator = Keypair.generate();
        const consumerWallet = Keypair.generate();
        const mint = Keypair.generate().publicKey;
        const attestation = Keypair.generate();
        const relayer = Keypair.generate();
        const sourceAta = getAssociatedTokenAddressSync(mint, consumerWallet.publicKey);
        const vaultTokenAccount = Keypair.generate().publicKey;
        const fence = findGeoFencePda(mint, vaultTokenAccount);
        const merchantConfig = findMerchantConfigPda(mint);
        const vaultEntry = findVaultEntryPda(mint, vaultTokenAccount);
        const sourceGeneration = findTokenGenerationPda(mint, consumerWallet.publicKey);
        const destGeneration = findTokenGenerationPda(mint, merchantAuthority.publicKey);
        const geoNonce = findGeoNoncePda(fence, consumerWallet.publicKey);
        const validationState = findTransferHookValidationPda(mint);

        rpc.setAccount(fence, {
            owner: PROGRAM_ID.toBase58(),
            data: createGeoFenceBuffer({
                vault: vaultTokenAccount,
                merchant: merchantAuthority.publicKey,
                mint,
            }),
        });
        rpc.setAccount(mint, {
            owner: TOKEN_2022_PROGRAM_ID.toBase58(),
            data: createMintBuffer(),
        });
        rpc.setAccount(sourceAta, {
            owner: TOKEN_2022_PROGRAM_ID.toBase58(),
            data: createTokenAccountBuffer(mint, consumerWallet.publicKey, 250_000n),
        });
        rpc.setAccount(vaultTokenAccount, {
            owner: TOKEN_2022_PROGRAM_ID.toBase58(),
            data: createTokenAccountBuffer(mint, merchantAuthority.publicKey, 0n),
        });
        rpc.setAccount(merchantConfig, { owner: PROGRAM_ID.toBase58(), data: Buffer.from([1, 2, 3]) });
        rpc.setAccount(vaultEntry, { owner: PROGRAM_ID.toBase58(), data: Buffer.from([4, 5, 6]) });
        rpc.setAccount(sourceGeneration, { owner: PROGRAM_ID.toBase58(), data: Buffer.from([7, 8, 9]) });
        rpc.setAccount(destGeneration, { owner: PROGRAM_ID.toBase58(), data: Buffer.from([10, 11, 12]) });
        rpc.setAccount(validationState, { owner: PROGRAM_ID.toBase58(), data: Buffer.from([13, 14, 15]) });
        rpc.setAccount(geoNonce, { owner: PROGRAM_ID.toBase58(), data: Buffer.from([16, 17, 18]) });

        const actionPort = await getFreePort();
        const relayerPort = await getFreePort();
        const appPort = await getFreePort();
        const appOrigin = `http://127.0.0.1:${appPort}`;

        actionProcess = spawnTypeScriptService('server/actions/src/index.ts', {
            TS_NODE_PROJECT: path.join(process.cwd(), 'server/actions/tsconfig.json'),
            PORT: String(actionPort),
            RPC_URL: rpc.url,
            PROGRAM_ID: PROGRAM_ID.toBase58(),
            ACTION_ALLOW_ORIGINLESS: 'true',
            ACTION_ALLOWED_ORIGINS: appOrigin,
            ACTION_ALLOWED_MERCHANTS: merchantAuthority.publicKey.toBase58(),
            ACTION_ALLOWED_MINTS: mint.toBase58(),
            ACTION_ALLOWED_OPERATORS: `${merchantAuthority.publicKey.toBase58()}:${merchantOperator.publicKey.toBase58()}`,
            ACTION_ATTESTATION_SECRET: bs58.encode(attestation.secretKey),
            ACTION_RELAYER_PUBKEY: relayer.publicKey.toBase58(),
            ACTION_STATE_PATH: path.join(tempDir, 'actions-state.json'),
        });

        relayerProcess = spawnTypeScriptService('relayer/src/index.ts', {
            TS_NODE_PROJECT: path.join(process.cwd(), 'relayer/tsconfig.json'),
            PORT: String(relayerPort),
            RPC_URL: rpc.url,
            PROGRAM_ID: PROGRAM_ID.toBase58(),
            ALLOW_INSECURE_DEV_RELAY: 'true',
            RELAYER_ALLOWED_ORIGINS: appOrigin,
            RELAYER_SECRET: bs58.encode(relayer.secretKey),
            RELAYER_STATE_PATH: path.join(tempDir, 'relayer-state.json'),
            RELAYER_AUDIT_LOG_PATH: path.join(tempDir, 'relayer-audit.log'),
            RELAYER_DEFAULT_MERCHANT_BUDGET_LAMPORTS: '100000',
        });

        if (!SKIP_APP_BUILD) {
            runNpmSync(path.join(process.cwd(), 'app'), ['run', 'build'], {
                NEXT_PUBLIC_ENABLE_BROWSER_TEST_MODE: 'true',
                NEXT_PUBLIC_APP_MODE: 'live',
                NEXT_PUBLIC_TEST_GEO_COORDS: `${GEO_LAT},${GEO_LNG}`,
                NEXT_PUBLIC_TEST_MERCHANT_WALLET_SECRET_BASE64: Buffer.from(merchantOperator.secretKey).toString('base64'),
                NEXT_PUBLIC_TEST_CONSUMER_WALLET_SECRET_BASE64: Buffer.from(consumerWallet.secretKey).toString('base64'),
                NEXT_PUBLIC_PROGRAM_ID: PROGRAM_ID.toBase58(),
                NEXT_PUBLIC_SOLANA_RPC_URL: rpc.url,
                NEXT_PUBLIC_ACTIONS_URL: `http://127.0.0.1:${actionPort}`,
                NEXT_PUBLIC_RELAYER_URL: `http://127.0.0.1:${relayerPort}`,
                NEXT_PUBLIC_MERCHANT_PUBKEY: merchantAuthority.publicKey.toBase58(),
                NEXT_PUBLIC_MERCHANT_MINT: mint.toBase58(),
                NEXT_PUBLIC_REDEMPTION_FENCE: fence.toBase58(),
            });
        }

        appProcess = spawnNpm(path.join(process.cwd(), 'app'), ['run', 'start', '--', '--hostname', '127.0.0.1', '--port', String(appPort)], {
            NEXT_PUBLIC_ENABLE_BROWSER_TEST_MODE: 'true',
            NEXT_PUBLIC_APP_MODE: 'live',
            NEXT_PUBLIC_TEST_GEO_COORDS: `${GEO_LAT},${GEO_LNG}`,
            NEXT_PUBLIC_TEST_MERCHANT_WALLET_SECRET_BASE64: Buffer.from(merchantOperator.secretKey).toString('base64'),
            NEXT_PUBLIC_TEST_CONSUMER_WALLET_SECRET_BASE64: Buffer.from(consumerWallet.secretKey).toString('base64'),
            NEXT_PUBLIC_PROGRAM_ID: PROGRAM_ID.toBase58(),
            NEXT_PUBLIC_SOLANA_RPC_URL: rpc.url,
            NEXT_PUBLIC_ACTIONS_URL: `http://127.0.0.1:${actionPort}`,
            NEXT_PUBLIC_RELAYER_URL: `http://127.0.0.1:${relayerPort}`,
            NEXT_PUBLIC_MERCHANT_PUBKEY: merchantAuthority.publicKey.toBase58(),
            NEXT_PUBLIC_MERCHANT_MINT: mint.toBase58(),
            NEXT_PUBLIC_REDEMPTION_FENCE: fence.toBase58(),
            PORT: String(appPort),
        });

        await Promise.all([
            waitForHttp(`http://127.0.0.1:${actionPort}/v1/health`),
            waitForHttp(`http://127.0.0.1:${relayerPort}/v1/health`),
            waitForHttp(`http://127.0.0.1:${appPort}/login`),
        ]);

        console.log('');
        console.log('Viral Sync browser smoke stack is ready.');
        console.log(`App: http://127.0.0.1:${appPort}/login`);
        console.log(`Actions: http://127.0.0.1:${actionPort}/v1/health`);
        console.log(`Relayer: http://127.0.0.1:${relayerPort}/v1/health`);
        console.log('');
        console.log('Suggested flow:');
        console.log('1. Open /login and choose Merchant.');
        console.log('2. In the modal, choose "Test Merchant Wallet".');
        console.log('3. Open /pos, create a code, copy it.');
        console.log('4. Return to /login?switch=1, choose Consumer, then "Test Consumer Wallet".');
        console.log('5. Open /consumer/scan, paste the code, and submit.');
        console.log('');
        if (EXIT_ON_READY) {
            console.log('One-shot mode enabled. Shutting down after readiness check.');
        } else {
            console.log('Press Ctrl+C to stop the stack.');
        }

        const shutdown = async () => {
            await Promise.all([
                stopChild(appProcess),
                stopChild(relayerProcess),
                stopChild(actionProcess),
            ]);
            await rpc.stop();
            fs.rmSync(tempDir, { recursive: true, force: true });
            process.exit(0);
        };

        process.on('SIGINT', () => { void shutdown(); });
        process.on('SIGTERM', () => { void shutdown(); });

        if (EXIT_ON_READY) {
            await shutdown();
        }
    } catch (error: unknown) {
        await Promise.all([
            stopChild(appProcess),
            stopChild(relayerProcess),
            stopChild(actionProcess),
        ]);
        await rpc.stop();
        fs.rmSync(tempDir, { recursive: true, force: true });
        throw error;
    }
}

void main().catch((error: unknown) => {
    console.error('Failed to start browser smoke stack', error);
    process.exit(1);
});
