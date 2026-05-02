import * as anchor from '@coral-xyz/anchor';
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import os from 'os';
import path from 'path';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from '@solana/web3.js';

type CliOptions = {
  rpcUrl: string;
  walletPath?: string;
  orgId: string;
  duplicateCheck: boolean;
  airdropSol: number;
};

const DEFAULT_RPC_URL = 'http://127.0.0.1:8899';
const IDL_PATH = path.join(process.cwd(), 'target', 'idl', 'viral_sync.json');
const PROGRAM_ID = new PublicKey('AeKT1B58Qi9rBtrtnMe11o4eXbVwHweKxGFNS5X3Vv46');

function usage() {
  return `
Usage:
  npm run localnet:register-merchant
  npm run localnet:register-merchant -- --duplicate-check
  npm run localnet:register-merchant -- --org thamel-brew-house --wallet ~/.config/solana/id.json

Options:
  --rpc <url>             Local validator RPC URL. Default: ${DEFAULT_RPC_URL}
  --wallet <path>         Keypair JSON file. Defaults to ANCHOR_WALLET, SOLANA_WALLET, or ~/.config/solana/id.json.
  --org <id>              Merchant org id to hash. Defaults to a unique localnet id.
  --duplicate-check       Submit the same registration twice and require the second transaction to fail.
  --airdrop-sol <number>  Request localnet SOL if balance is low. Default: 2
`;
}

function argValue(args: string[], name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage());
    process.exit(0);
  }

  const orgId = argValue(args, '--org') ?? `viral-sync-localnet-${Date.now().toString(36)}`;
  const airdropRaw = argValue(args, '--airdrop-sol') ?? '2';
  const airdropSol = Number(airdropRaw);

  if (!Number.isFinite(airdropSol) || airdropSol < 0) {
    throw new Error('--airdrop-sol must be a non-negative number.');
  }

  return {
    rpcUrl: argValue(args, '--rpc') ?? process.env.LOCALNET_RPC_URL ?? DEFAULT_RPC_URL,
    walletPath: argValue(args, '--wallet') ?? process.env.ANCHOR_WALLET ?? process.env.SOLANA_WALLET,
    orgId,
    duplicateCheck: args.includes('--duplicate-check'),
    airdropSol,
  };
}

function expandHome(filePath: string) {
  if (filePath === '~') {
    return os.homedir();
  }
  if (filePath.startsWith(`~${path.sep}`) || filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

function defaultWalletPath() {
  return path.join(os.homedir(), '.config', 'solana', 'id.json');
}

function loadWallet(walletPath?: string) {
  const resolved = expandHome(walletPath ?? defaultWalletPath());
  if (!existsSync(resolved)) {
    console.warn(`Wallet file not found at ${resolved}; using an ephemeral localnet keypair.`);
    return { keypair: Keypair.generate(), source: 'ephemeral' };
  }

  const secret = JSON.parse(readFileSync(resolved, 'utf8')) as number[];
  return {
    keypair: Keypair.fromSecretKey(Uint8Array.from(secret)),
    source: resolved,
  };
}

function loadIdl() {
  if (!existsSync(IDL_PATH)) {
    throw new Error(`IDL not found at ${IDL_PATH}. Run npm run build:program first.`);
  }

  return JSON.parse(readFileSync(IDL_PATH, 'utf8')) as anchor.Idl;
}

function orgHash(orgId: string) {
  return createHash('sha256').update(orgId).digest();
}

function findCausalMerchantPda(merchantAuthority: PublicKey, orgIdHash: Buffer) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('causal_merchant'), merchantAuthority.toBuffer(), orgIdHash],
    PROGRAM_ID,
  );
}

async function ensureProgramDeployed(connection: Connection) {
  const program = await connection.getAccountInfo(PROGRAM_ID);
  if (!program?.executable) {
    throw new Error(
      `Program ${PROGRAM_ID.toBase58()} is not deployed on this RPC. ` +
      'Start a local validator and deploy target/deploy/viral_sync.so before running this script.',
    );
  }
}

async function ensureLocalnetBalance(connection: Connection, publicKey: PublicKey, airdropSol: number) {
  const balance = await connection.getBalance(publicKey);
  if (balance >= 0.5 * LAMPORTS_PER_SOL || airdropSol === 0) {
    return balance;
  }

  const signature = await connection.requestAirdrop(publicKey, Math.round(airdropSol * LAMPORTS_PER_SOL));
  const blockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    signature,
    blockhash: blockhash.blockhash,
    lastValidBlockHeight: blockhash.lastValidBlockHeight,
  }, 'confirmed');

  return connection.getBalance(publicKey);
}

async function registerMerchant(program: anchor.Program, orgIdHash: Buffer, merchantConfig: PublicKey, merchantAuthority: PublicKey) {
  return (program.methods as unknown as {
    registerMerchant: (hash: number[]) => {
      accounts: (accounts: Record<string, PublicKey>) => { rpc: () => Promise<string> };
    };
  }).registerMerchant(Array.from(orgIdHash))
    .accounts({
      merchantConfig,
      merchantAuthority,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

async function main() {
  const options = parseArgs();
  const walletInfo = loadWallet(options.walletPath);
  const connection = new Connection(options.rpcUrl, 'confirmed');
  const wallet = new anchor.Wallet(walletInfo.keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });
  const idl = loadIdl();
  const program = new anchor.Program(idl, provider);
  const hash = orgHash(options.orgId);
  const [merchantConfig, bump] = findCausalMerchantPda(wallet.publicKey, hash);

  await ensureProgramDeployed(connection);
  const balance = await ensureLocalnetBalance(connection, wallet.publicKey, options.airdropSol);

  console.log(JSON.stringify({
    rpcUrl: options.rpcUrl,
    programId: PROGRAM_ID.toBase58(),
    wallet: wallet.publicKey.toBase58(),
    walletSource: walletInfo.source,
    balanceSol: balance / LAMPORTS_PER_SOL,
    orgId: options.orgId,
    orgIdHash: hash.toString('hex'),
    merchantConfig: merchantConfig.toBase58(),
    bump,
  }, null, 2));

  const existing = await connection.getAccountInfo(merchantConfig);
  if (existing) {
    console.log(`Merchant config already exists: ${merchantConfig.toBase58()}`);
    if (!options.duplicateCheck) {
      return;
    }
    throw new Error('Duplicate-check requires a fresh org id so the first registration can succeed.');
  }

  const signature = await registerMerchant(program, hash, merchantConfig, wallet.publicKey);
  console.log(`register_merchant signature: ${signature}`);

  const account = await (program.account as unknown as {
    causalMerchantConfig: { fetch: (address: PublicKey) => Promise<Record<string, unknown>> };
  }).causalMerchantConfig.fetch(merchantConfig);
  console.log(`registered merchant_config: ${merchantConfig.toBase58()}`);
  console.log(JSON.stringify(account, (_key, value) => {
    if (value instanceof PublicKey) {
      return value.toBase58();
    }
    return value;
  }, 2));

  if (!options.duplicateCheck) {
    return;
  }

  try {
    await registerMerchant(program, hash, merchantConfig, wallet.publicKey);
    throw new Error('Duplicate register_merchant unexpectedly succeeded.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/unexpectedly succeeded/i.test(message)) {
      throw error;
    }
    console.log('duplicate register_merchant rejected as expected.');
    console.log(message.split('\n')[0]);
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

