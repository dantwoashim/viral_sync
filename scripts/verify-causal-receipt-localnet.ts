import * as anchor from '@coral-xyz/anchor';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import {
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';

type ManifestShape = {
  rpcUrl?: string;
  programId?: string;
  pdas?: {
    causalReceipt?: string;
    rewardVault?: string;
    merchantRewardAccount?: string;
    referrerRewardAccount?: string;
    visitorRewardAccount?: string;
  };
  tokenBalances?: {
    afterClose?: {
      merchantRewardAccount?: string;
      rewardVault?: string;
    } | null;
  };
};

type CliOptions = {
  rpcUrl: string;
  walletPath?: string;
  manifestPath?: string;
  receipt: PublicKey;
  outputPath?: string;
};

const DEFAULT_RPC_URL = 'http://127.0.0.1:8899';
const IDL_PATH = path.join(process.cwd(), 'target', 'idl', 'viral_sync.json');
const PROGRAM_ID = new PublicKey('AeKT1B58Qi9rBtrtnMe11o4eXbVwHweKxGFNS5X3Vv46');

function usage() {
  return `
Usage:
  npm run localnet:verify-receipt -- --manifest tmp/localnet-causal-commerce.json
  npm run localnet:verify-receipt -- --receipt <causal-receipt-pda>

Options:
  --rpc <url>        Local validator RPC URL. Default: ${DEFAULT_RPC_URL}
  --wallet <path>    Optional keypair JSON file for the Anchor provider.
  --manifest <path>  Manifest written by npm run localnet:causal-commerce.
  --receipt <pubkey> Causal Receipt PDA to verify.
  --output <path>    Write verifier JSON to a file.
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

  const manifestPath = argValue(args, '--manifest');
  const manifest = manifestPath ? loadManifest(manifestPath) : undefined;
  const receiptRaw = argValue(args, '--receipt') ?? manifest?.pdas?.causalReceipt;
  if (!receiptRaw) {
    throw new Error('Provide --receipt or --manifest with pdas.causalReceipt.');
  }

  return {
    rpcUrl: argValue(args, '--rpc') ?? manifest?.rpcUrl ?? process.env.LOCALNET_RPC_URL ?? DEFAULT_RPC_URL,
    walletPath: argValue(args, '--wallet') ?? process.env.ANCHOR_WALLET ?? process.env.SOLANA_WALLET,
    manifestPath,
    receipt: new PublicKey(receiptRaw),
    outputPath: argValue(args, '--output'),
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

function loadManifest(manifestPath: string): ManifestShape {
  const resolved = path.resolve(manifestPath);
  if (!existsSync(resolved)) {
    throw new Error(`Manifest not found at ${resolved}.`);
  }
  return JSON.parse(readFileSync(resolved, 'utf8')) as ManifestShape;
}

async function tokenAmount(connection: Connection, tokenAccount: PublicKey) {
  const balance = await connection.getTokenAccountBalance(tokenAccount);
  return new anchor.BN(balance.value.amount);
}

async function tokenAccountClosed(connection: Connection, tokenAccount: PublicKey) {
  return (await connection.getAccountInfo(tokenAccount)) === null;
}

function findPda(seedPrefix: string, seeds: Buffer[]) {
  return PublicKey.findProgramAddressSync([Buffer.from(seedPrefix), ...seeds], PROGRAM_ID);
}

async function fetchAccount<T>(program: anchor.Program, accountName: string, address: PublicKey) {
  const account = (program.account as unknown as Record<string, { fetch: (address: PublicKey) => Promise<T> }>)[accountName];
  if (!account) {
    throw new Error(`IDL account client is missing ${accountName}. Run npm run build:program.`);
  }
  return account.fetch(address);
}

function normalize(value: unknown): unknown {
  if (value instanceof PublicKey) {
    return value.toBase58();
  }
  if (anchor.BN.isBN(value as object)) {
    return (value as anchor.BN).toString();
  }
  if (Array.isArray(value)) {
    return value.map(normalize);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, normalize(child)]));
  }
  return value;
}

function enumName(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)[0];
  }
  return String(value);
}

function expectPublicKey(label: string, actual: PublicKey, expected: PublicKey, failures: string[]) {
  if (!actual.equals(expected)) {
    failures.push(`${label} expected ${expected.toBase58()} but got ${actual.toBase58()}`);
  }
}

function expectBn(label: string, actual: anchor.BN, expected: anchor.BN, failures: string[]) {
  if (!actual.eq(expected)) {
    failures.push(`${label} expected ${expected.toString()} but got ${actual.toString()}`);
  }
}

function writeJson(outputPath: string, value: unknown) {
  const resolved = path.resolve(outputPath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(value, null, 2)}\n`);
  return resolved;
}

async function main() {
  const options = parseArgs();
  const manifest = options.manifestPath ? loadManifest(options.manifestPath) : undefined;
  const walletInfo = loadWallet(options.walletPath);
  const connection = new Connection(options.rpcUrl, 'confirmed');
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(walletInfo.keypair), {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });
  const program = new anchor.Program(loadIdl(), provider);
  const causalReceiptPda = options.receipt;

  type Receipt = {
    campaign: PublicKey;
    merchantConfig: PublicKey;
    receiptIdHash: number[];
    claimerNullifierHash: number[];
    rewardAmount: anchor.BN;
    settledAmount: anchor.BN;
    status: unknown;
    settledAt: anchor.BN;
  };
  type Campaign = {
    rewardMint: PublicKey;
    rewardPerVerifiedVisit: anchor.BN;
    totalSettled: anchor.BN;
    status: unknown;
  };
  type Escrow = {
    campaign: PublicKey;
    rewardMint: PublicKey;
    rewardVault: PublicKey;
    totalFunded: anchor.BN;
    totalReserved: anchor.BN;
    totalSettled: anchor.BN;
  };
  type Settlement = {
    receipt: PublicKey;
    campaign: PublicKey;
    referrerAmount: anchor.BN;
    visitorAmount: anchor.BN;
  };
  type Nullifier = {
    campaign: PublicKey;
    firstReceipt: PublicKey;
  };

  const receipt = await fetchAccount<Receipt>(program, 'causalReceipt', causalReceiptPda);
  const campaign = await fetchAccount<Campaign>(program, 'growthCampaign', receipt.campaign);
  const [rewardEscrowPda] = findPda('reward_escrow', [receipt.campaign.toBuffer(), campaign.rewardMint.toBuffer()]);
  const [settlementRecordPda] = findPda('settlement', [causalReceiptPda.toBuffer()]);
  const [nullifierRecordPda] = findPda('campaign_nullifier', [
    receipt.campaign.toBuffer(),
    Buffer.from(receipt.claimerNullifierHash),
  ]);
  const escrow = await fetchAccount<Escrow>(program, 'rewardEscrow', rewardEscrowPda);
  const settlement = await fetchAccount<Settlement>(program, 'settlementRecord', settlementRecordPda);
  const nullifier = await fetchAccount<Nullifier>(program, 'nullifierRecord', nullifierRecordPda);

  const failures: string[] = [];
  expectPublicKey('receipt campaign', receipt.campaign, settlement.campaign, failures);
  expectPublicKey('settlement receipt', settlement.receipt, causalReceiptPda, failures);
  expectPublicKey('escrow campaign', escrow.campaign, receipt.campaign, failures);
  expectPublicKey('escrow reward mint', escrow.rewardMint, campaign.rewardMint, failures);
  if (manifest?.pdas?.rewardVault) {
    expectPublicKey('escrow reward vault', escrow.rewardVault, new PublicKey(manifest.pdas.rewardVault), failures);
  }
  expectPublicKey('nullifier campaign', nullifier.campaign, receipt.campaign, failures);
  expectPublicKey('nullifier first receipt', nullifier.firstReceipt, causalReceiptPda, failures);
  expectBn('settled amount', receipt.settledAmount, receipt.rewardAmount, failures);
  expectBn('campaign reward per visit', campaign.rewardPerVerifiedVisit, receipt.rewardAmount, failures);
  if (!settlement.referrerAmount.add(settlement.visitorAmount).eq(receipt.rewardAmount)) {
    failures.push('settlement split does not add up to receipt reward amount');
  }
  if (enumName(receipt.status) !== 'settled') {
    failures.push(`receipt status is ${enumName(receipt.status)}, expected settled`);
  }
  if (receipt.settledAt.lte(new anchor.BN(0))) {
    failures.push('receipt settled_at is not set');
  }
  if (escrow.totalSettled.lt(receipt.rewardAmount)) {
    failures.push('escrow total_settled is lower than receipt reward amount');
  }
  const tokenBalances: Record<string, string> = {};
  if (manifest?.tokenBalances?.afterClose?.rewardVault === 'closed') {
    const closed = await tokenAccountClosed(connection, escrow.rewardVault);
    tokenBalances.rewardVault = closed ? 'closed' : (await tokenAmount(connection, escrow.rewardVault)).toString();
    if (!closed) {
      failures.push('reward vault token account is still open after close check');
    }
    if (enumName(campaign.status) !== 'closed') {
      failures.push(`campaign status is ${enumName(campaign.status)}, expected closed after close check`);
    }
    if (manifest?.pdas?.merchantRewardAccount && manifest.tokenBalances.afterClose.merchantRewardAccount) {
      const merchantBalance = await tokenAmount(connection, new PublicKey(manifest.pdas.merchantRewardAccount));
      tokenBalances.merchantRewardAccount = merchantBalance.toString();
      expectBn(
        'merchant reclaimed token balance',
        merchantBalance,
        new anchor.BN(manifest.tokenBalances.afterClose.merchantRewardAccount),
        failures,
      );
    }
  } else {
    tokenBalances.rewardVault = (await tokenAmount(connection, escrow.rewardVault)).toString();
  }
  if (manifest?.pdas?.referrerRewardAccount) {
    const referrerBalance = await tokenAmount(connection, new PublicKey(manifest.pdas.referrerRewardAccount));
    tokenBalances.referrerRewardAccount = referrerBalance.toString();
    expectBn('referrer token payout', referrerBalance, settlement.referrerAmount, failures);
  }
  if (manifest?.pdas?.visitorRewardAccount) {
    const visitorBalance = await tokenAmount(connection, new PublicKey(manifest.pdas.visitorRewardAccount));
    tokenBalances.visitorRewardAccount = visitorBalance.toString();
    expectBn('visitor token payout', visitorBalance, settlement.visitorAmount, failures);
  }

  const result = {
    ok: failures.length === 0,
    rpcUrl: options.rpcUrl,
    manifestPath: options.manifestPath,
    programId: PROGRAM_ID.toBase58(),
    walletSource: walletInfo.source,
    pdas: {
      causalReceipt: causalReceiptPda.toBase58(),
      growthCampaign: receipt.campaign.toBase58(),
      merchantConfig: receipt.merchantConfig.toBase58(),
      rewardEscrow: rewardEscrowPda.toBase58(),
      rewardVault: escrow.rewardVault.toBase58(),
      settlementRecord: settlementRecordPda.toBase58(),
      nullifierRecord: nullifierRecordPda.toBase58(),
    },
    receipt: normalize(receipt),
    campaign: normalize(campaign),
    rewardEscrow: normalize(escrow),
    settlementRecord: normalize(settlement),
    nullifierRecord: normalize(nullifier),
    tokenBalances,
    failures,
  };

  const outputPath = options.outputPath ? writeJson(options.outputPath, result) : undefined;
  console.log(JSON.stringify({ ...result, outputPath }, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
