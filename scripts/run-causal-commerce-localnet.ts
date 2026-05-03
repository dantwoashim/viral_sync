import * as anchor from '@coral-xyz/anchor';
import { createHash, randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';

type CliOptions = {
  rpcUrl: string;
  walletPath?: string;
  orgId: string;
  campaignId: string;
  receiptId: string;
  receiptIdHash?: Buffer;
  claimerNullifierHash?: Buffer;
  inviteHash?: Buffer;
  visitAttestationHash?: Buffer;
  rewardMint?: PublicKey;
  rewardPerVisit: anchor.BN;
  maxRedemptions: number;
  maxDepth: number;
  campaignDurationSeconds: number;
  fundAmount: anchor.BN;
  airdropSol: number;
  replayCheck: boolean;
  attackCheck: boolean;
  closeCheck: boolean;
  outputPath?: string;
};

type RpcBuilder = {
  signers: (signers: Keypair[]) => { rpc: () => Promise<string> };
  rpc: () => Promise<string>;
  instruction: () => Promise<TransactionInstruction>;
};

type ProgramMethods = {
  registerMerchant: (orgIdHash: number[]) => {
    accounts: (accounts: {
      merchantConfig: PublicKey;
      merchantAuthority: PublicKey;
      systemProgram: PublicKey;
    }) => RpcBuilder;
  };
  enrollTerminalDevice: (labelHash: number[]) => {
    accounts: (accounts: {
      merchantConfig: PublicKey;
      merchantAuthority: PublicKey;
      terminalAuthority: PublicKey;
      terminalDevice: PublicKey;
      systemProgram: PublicKey;
    }) => RpcBuilder;
  };
  issueClaimPass: (
    claimHash: number[],
    depth: number,
    lineageProofHash: number[],
    referrerReceipt: PublicKey,
  ) => {
    accounts: (accounts: {
      growthCampaign: PublicKey;
      merchantConfig: PublicKey;
      merchantAuthority: PublicKey;
      visitorAuthority: PublicKey;
      claimPass: PublicKey;
      systemProgram: PublicKey;
    }) => RpcBuilder;
  };
  setGrowthCampaignStatus: (status: Record<string, unknown>) => {
    accounts: (accounts: {
      growthCampaign: PublicKey;
      merchantAuthority: PublicKey;
    }) => RpcBuilder;
  };
  createGrowthCampaign: (
    campaignIdHash: number[],
    rewardPerVerifiedVisit: anchor.BN,
    maxRedemptions: number,
    maxDepth: number,
    referrerSplitBps: number,
    splitRulesHash: number[],
    fraudPolicyHash: number[],
    startsAt: anchor.BN,
    expiresAt: anchor.BN,
  ) => {
    accounts: (accounts: {
      merchantConfig: PublicKey;
      growthCampaign: PublicKey;
      merchantAuthority: PublicKey;
      rewardMint: PublicKey;
      systemProgram: PublicKey;
    }) => RpcBuilder;
  };
  fundGrowthBounty: (amount: anchor.BN) => {
    accounts: (accounts: {
      growthCampaign: PublicKey;
      rewardEscrow: PublicKey;
      merchantRewardAccount: PublicKey;
      rewardVault: PublicKey;
      rewardMint: PublicKey;
      merchantAuthority: PublicKey;
      systemProgram: PublicKey;
      tokenProgram: PublicKey;
      associatedTokenProgram: PublicKey;
    }) => RpcBuilder;
  };
  closeGrowthBounty: () => {
    accounts: (accounts: {
      growthCampaign: PublicKey;
      rewardEscrow: PublicKey;
      rewardVault: PublicKey;
      merchantRewardAccount: PublicKey;
      rewardMint: PublicKey;
      merchantAuthority: PublicKey;
      tokenProgram: PublicKey;
    }) => RpcBuilder;
  };
  recordCausalReceipt: (
    receiptIdHash: number[],
    parentReceiptIdHash: number[],
    referrerCommitment: number[],
    claimerNullifierHash: number[],
    inviteHash: number[],
    visitAttestationHash: number[],
    intentManifestHash: number[],
    riskScoreCommitment: number[],
    referrerBeneficiary: PublicKey,
    visitorBeneficiary: PublicKey,
  ) => {
    accounts: (accounts: {
      growthCampaign: PublicKey;
      merchantConfig: PublicKey;
      rewardEscrow: PublicKey;
      rewardVault: PublicKey;
      causalReceipt: PublicKey;
      nullifierRecord: PublicKey;
      claimPass: PublicKey;
      terminalDevice: PublicKey;
      terminalAuthority: PublicKey;
      visitorAuthority: PublicKey;
      merchantAuthority: PublicKey;
      systemProgram: PublicKey;
    }) => RpcBuilder;
  };
  settleReceiptReward: () => {
    accounts: (accounts: {
      growthCampaign: PublicKey;
      merchantConfig: PublicKey;
      rewardEscrow: PublicKey;
      rewardVault: PublicKey;
      causalReceipt: PublicKey;
      settlementRecord: PublicKey;
      referrerRewardAccount: PublicKey;
      visitorRewardAccount: PublicKey;
      rewardMint: PublicKey;
      merchantAuthority: PublicKey;
      systemProgram: PublicKey;
      tokenProgram: PublicKey;
    }) => RpcBuilder;
  };
};

const DEFAULT_RPC_URL = 'http://127.0.0.1:8899';
const IDL_PATH = path.join(process.cwd(), 'target', 'idl', 'viral_sync.json');
const PROGRAM_ID = new PublicKey('AeKT1B58Qi9rBtrtnMe11o4eXbVwHweKxGFNS5X3Vv46');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const MINT_SIZE = 82;
const DEFAULT_OUTPUT_PATH = path.join('tmp', 'localnet-causal-commerce.json');

function usage() {
  return `
Usage:
  npm run localnet:causal-commerce
  npm run localnet:causal-commerce -- --replay-check
  npm run localnet:causal-commerce -- --org thamel-brew-house --campaign first-100-visits --receipt receipt-001

Options:
  --rpc <url>                 Local validator RPC URL. Default: ${DEFAULT_RPC_URL}
  --wallet <path>             Keypair JSON file. Defaults to ANCHOR_WALLET, SOLANA_WALLET, or ~/.config/solana/id.json.
  --org <id>                  Merchant org id to hash. Defaults to a unique proof id.
  --campaign <id>             Campaign id to hash. Defaults to a unique proof id.
  --receipt <id>              Receipt id to hash. Defaults to a unique proof id.
  --receipt-id-hash <hex>     Use an existing 32-byte receipt hash instead of deriving one.
  --claimer-nullifier-hash <hex>
                              Use an existing 32-byte campaign nullifier hash.
  --invite-hash <hex>         Use an existing 32-byte invite hash.
  --visit-attestation-hash <hex>
                              Use an existing 32-byte visit attestation hash.
  --reward-mint <pubkey>      Existing SPL Token mint. If omitted, the script creates a localnet mint.
  --reward-per-visit <units>  Reward units reserved per verified visit. Default: 1000
  --max-redemptions <count>   Campaign cap. Default: 10
  --max-depth <count>         Referral depth cap. Default: 2
  --campaign-duration-seconds <seconds>
                              Campaign lifetime. Default: 2592000, or 5 when --close-check is used.
  --fund-amount <units>       Funded state amount. Default: reward-per-visit * max-redemptions
  --airdrop-sol <number>      Request localnet SOL if balance is low. Default: 2
  --replay-check              Require duplicate nullifier and duplicate settlement attempts to fail.
  --attack-check              Require wrong merchant and wrong beneficiary settlement attacks to fail.
  --close-check               Close the bounty, reclaim unused vault tokens, and close the vault ATA.
  --output <path>             Write a JSON manifest. Default: ${DEFAULT_OUTPUT_PATH}
`;
}

function argValue(args: string[], name: string) {
  const index = args.lastIndexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function parsePositiveInteger(raw: string, name: string) {
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${name} must be a positive integer.`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive safe integer.`);
  }
  return value;
}

function parseNonNegativeNumber(raw: string, name: string) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative number.`);
  }
  return value;
}

function parseHashHex(raw: string | undefined, name: string) {
  if (!raw) {
    return undefined;
  }
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error(`${name} must be a 32-byte hex string.`);
  }
  return Buffer.from(raw, 'hex');
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage());
    process.exit(0);
  }

  const rewardPerVisit = new anchor.BN(parsePositiveInteger(argValue(args, '--reward-per-visit') ?? '1000', '--reward-per-visit'));
  const maxRedemptions = parsePositiveInteger(argValue(args, '--max-redemptions') ?? '10', '--max-redemptions');
  const maxDepth = parsePositiveInteger(argValue(args, '--max-depth') ?? '2', '--max-depth');
  const closeCheck = args.includes('--close-check');
  const campaignDurationSeconds = parsePositiveInteger(
    argValue(args, '--campaign-duration-seconds') ?? (closeCheck ? '5' : String(60 * 60 * 24 * 30)),
    '--campaign-duration-seconds',
  );
  const fundAmount = new anchor.BN(argValue(args, '--fund-amount') ?? rewardPerVisit.mul(new anchor.BN(maxRedemptions)).toString());
  if (fundAmount.lte(new anchor.BN(0))) {
    throw new Error('--fund-amount must be positive.');
  }

  const rewardMintRaw = argValue(args, '--reward-mint');

  return {
    rpcUrl: argValue(args, '--rpc') ?? process.env.LOCALNET_RPC_URL ?? DEFAULT_RPC_URL,
    walletPath: argValue(args, '--wallet') ?? process.env.ANCHOR_WALLET ?? process.env.SOLANA_WALLET,
    orgId: argValue(args, '--org') ?? `viral-sync-devnet-org-${Date.now().toString(36)}`,
    campaignId: argValue(args, '--campaign') ?? `viral-sync-frontier-campaign-${Date.now().toString(36)}`,
    receiptId: argValue(args, '--receipt') ?? `viral-sync-frontier-receipt-${Date.now().toString(36)}`,
    receiptIdHash: parseHashHex(argValue(args, '--receipt-id-hash'), '--receipt-id-hash'),
    claimerNullifierHash: parseHashHex(argValue(args, '--claimer-nullifier-hash'), '--claimer-nullifier-hash'),
    inviteHash: parseHashHex(argValue(args, '--invite-hash'), '--invite-hash'),
    visitAttestationHash: parseHashHex(argValue(args, '--visit-attestation-hash'), '--visit-attestation-hash'),
    rewardMint: rewardMintRaw ? new PublicKey(rewardMintRaw) : undefined,
    rewardPerVisit,
    maxRedemptions,
    maxDepth,
    campaignDurationSeconds,
    fundAmount,
    airdropSol: parseNonNegativeNumber(argValue(args, '--airdrop-sol') ?? '2', '--airdrop-sol'),
    replayCheck: args.includes('--replay-check'),
    attackCheck: args.includes('--attack-check'),
    closeCheck,
    outputPath: argValue(args, '--output') ?? DEFAULT_OUTPUT_PATH,
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

function hashBytes(label: string, value: string) {
  return createHash('sha256').update(`${label}:${value}`).digest();
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right));

  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`).join(',')}}`;
}

function hashIntentManifest(value: Record<string, unknown>) {
  return createHash('sha256').update(canonicalJson(value)).digest();
}


type CausalReceiptEffectManifest = {
  version: string;
  action: string;
  expiresAt: string;
  rewardAmount: number;
  referrerSplitBps?: number;
  referrerBeneficiary: string;
  visitorBeneficiary: string;
  allowedInstructions: string[];
};

function validateCausalReceiptEffect(params: {
  manifest: CausalReceiptEffectManifest;
  action: string;
  accounts: Record<string, string>;
  rewardAmount: number;
  referrerSplitBps?: number;
  referrerBeneficiary: string;
  visitorBeneficiary: string;
  now?: Date;
}) {
  const now = params.now ?? new Date();

  if (params.manifest.version !== 'viral-sync-intent-v1') {
    return { ok: false as const, reason: 'Unsupported manifest version.' };
  }

  if (params.manifest.action !== 'record_causal_receipt_and_settle_reward') {
    return { ok: false as const, reason: 'Unsupported manifest action.' };
  }

  if (!params.manifest.allowedInstructions.includes(params.action)) {
    return { ok: false as const, reason: 'Instruction is not allowed by manifest.' };
  }

  if (new Date(params.manifest.expiresAt).getTime() <= now.getTime()) {
    return { ok: false as const, reason: 'Intent manifest expired.' };
  }

  if (params.rewardAmount > params.manifest.rewardAmount) {
    return { ok: false as const, reason: 'Reward amount exceeds manifest maximum.' };
  }

  if (
    typeof params.manifest.referrerSplitBps === 'number' &&
    typeof params.referrerSplitBps === 'number' &&
    params.referrerSplitBps !== params.manifest.referrerSplitBps
  ) {
    return { ok: false as const, reason: 'IntentMismatch: referrer split does not match manifest.' };
  }

  if (params.referrerBeneficiary !== params.manifest.referrerBeneficiary) {
    return { ok: false as const, reason: 'Referrer beneficiary does not match manifest.' };
  }

  if (params.visitorBeneficiary !== params.manifest.visitorBeneficiary) {
    return { ok: false as const, reason: 'Visitor beneficiary does not match manifest.' };
  }

  for (const account of ['growthCampaign', 'rewardEscrow', 'causalReceipt', 'nullifierRecord']) {
    if (!params.accounts[account]) {
      return { ok: false as const, reason: `Missing required account: ${account}.` };
    }
  }

  return {
    ok: true as const,
    reason: 'Effect matches Viral Sync causal receipt intent.',
    manifestHash: hashIntentManifest(params.manifest as unknown as Record<string, unknown>).toString('hex'),
  };
}

function detectCluster(rpcUrl: string) {
  if (rpcUrl.includes('devnet')) return 'devnet';
  if (rpcUrl.includes('testnet')) return 'testnet';
  if (rpcUrl.includes('mainnet')) return 'mainnet-beta';
  return 'localnet';
}

function explorerTx(signature: string | null | undefined, cluster: string) {
  if (!signature || cluster === 'localnet') return null;
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

function explorerAddress(address: PublicKey | string, cluster: string) {
  const value = typeof address === 'string' ? address : address.toBase58();
  if (cluster === 'localnet') return null;
  return `https://explorer.solana.com/address/${value}?cluster=${cluster}`;
}

function zeroHash() {
  return Buffer.alloc(32);
}

function findPda(seedPrefix: string, seeds: Buffer[]) {
  return PublicKey.findProgramAddressSync([Buffer.from(seedPrefix), ...seeds], PROGRAM_ID);
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

async function fundSignerIfNeeded(connection: Connection, payer: Keypair, recipient: PublicKey, minimumLamports: number) {
  const balance = await connection.getBalance(recipient);
  if (balance >= minimumLamports) return null;
  const needed = minimumLamports - balance;
  const transaction = new Transaction().add(SystemProgram.transfer({
    fromPubkey: payer.publicKey,
    toPubkey: recipient,
    lamports: needed,
  }));
  return sendAndConfirmTransaction(connection, transaction, [payer], { commitment: 'confirmed' });
}

function createInitializeMintInstruction(mint: PublicKey, mintAuthority: PublicKey) {
  const data = Buffer.alloc(67);
  data.writeUInt8(0, 0);
  data.writeUInt8(0, 1);
  mintAuthority.toBuffer().copy(data, 2);
  data.writeUInt8(0, 34);
  PublicKey.default.toBuffer().copy(data, 35);

  return new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  });
}

function createMintToInstruction(mint: PublicKey, destination: PublicKey, authority: PublicKey, amount: anchor.BN) {
  const data = Buffer.alloc(9);
  data.writeUInt8(7, 0);
  data.writeBigUInt64LE(BigInt(amount.toString()), 1);

  return new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    data,
  });
}

function findAssociatedTokenAddress(owner: PublicKey, mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

function createAssociatedTokenAccountInstruction(payer: PublicKey, owner: PublicKey, mint: PublicKey, ata: PublicKey) {
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.alloc(0),
  });
}

async function ensureAssociatedTokenAccount(connection: Connection, payer: Keypair, owner: PublicKey, mint: PublicKey) {
  const address = findAssociatedTokenAddress(owner, mint);
  if (await connection.getAccountInfo(address)) {
    return { address, signature: null };
  }

  const transaction = new Transaction().add(
    createAssociatedTokenAccountInstruction(payer.publicKey, owner, mint, address),
  );
  const signature = await sendAndConfirmTransaction(connection, transaction, [payer], {
    commitment: 'confirmed',
  });
  return { address, signature };
}

async function mintRewardTokens(connection: Connection, payer: Keypair, mint: PublicKey, destination: PublicKey, amount: anchor.BN) {
  const transaction = new Transaction().add(
    createMintToInstruction(mint, destination, payer.publicKey, amount),
  );
  return sendAndConfirmTransaction(connection, transaction, [payer], {
    commitment: 'confirmed',
  });
}

async function tokenAmount(connection: Connection, tokenAccount: PublicKey) {
  const balance = await connection.getTokenAccountBalance(tokenAccount);
  return balance.value.amount;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tokenAmountOrClosed(connection: Connection, tokenAccount: PublicKey) {
  const account = await connection.getAccountInfo(tokenAccount);
  if (!account) {
    return 'closed';
  }

  return tokenAmount(connection, tokenAccount);
}

async function createLocalnetRewardMint(connection: Connection, payer: Keypair) {
  const mint = Keypair.generate();
  const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      lamports,
      space: MINT_SIZE,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(mint.publicKey, payer.publicKey),
  );
  const signature = await sendAndConfirmTransaction(connection, transaction, [payer, mint], {
    commitment: 'confirmed',
  });

  return { publicKey: mint.publicKey, signature };
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

async function fetchAccount<T>(program: anchor.Program, accountName: string, address: PublicKey) {
  const account = (program.account as unknown as Record<string, { fetch: (address: PublicKey) => Promise<T> }>)[accountName];
  if (!account) {
    throw new Error(`IDL account client is missing ${accountName}. Run npm run build:program.`);
  }
  return account.fetch(address);
}


function publicKeyFromAccountField(value: unknown, label: string) {
  if (value instanceof PublicKey) return value;
  if (typeof value === 'string') return new PublicKey(value);
  if (value && typeof value === 'object' && typeof (value as { toBase58?: unknown }).toBase58 === 'function') {
    return new PublicKey((value as { toBase58: () => string }).toBase58());
  }
  throw new Error(`Existing campaign is missing a usable ${label} public key. Rebuild the IDL and rerun the proof script.`);
}

function bnFromAccountField(value: unknown, label: string) {
  if (anchor.BN.isBN(value as object)) return value as anchor.BN;
  if (typeof value === 'number') return new anchor.BN(value);
  if (typeof value === 'string') return new anchor.BN(value);
  if (value && typeof value === 'object' && typeof (value as { toString?: unknown }).toString === 'function') {
    return new anchor.BN((value as { toString: () => string }).toString());
  }
  throw new Error(`Existing campaign is missing a usable ${label} amount. Rebuild the IDL and rerun the proof script.`);
}

function bnMin(left: anchor.BN, right: anchor.BN) {
  return left.lte(right) ? left : right;
}

async function tryFetchGrowthCampaign(program: anchor.Program, growthCampaign: PublicKey) {
  try {
    return await fetchAccount<Record<string, unknown>>(program, 'growthCampaign', growthCampaign);
  } catch {
    return undefined;
  }
}

async function maybeRegisterMerchant(
  program: anchor.Program,
  methods: ProgramMethods,
  merchantSigner: Keypair,
  merchantConfig: PublicKey,
  merchantAuthority: PublicKey,
  orgIdHash: Buffer,
) {
  try {
    await fetchAccount(program, 'causalMerchantConfig', merchantConfig);
    return { signature: null, reused: true };
  } catch {
    const signature = await methods.registerMerchant(Array.from(orgIdHash))
      .accounts({
        merchantConfig,
      merchantAuthority,
      systemProgram: SystemProgram.programId,
    })
      .signers([merchantSigner])
      .rpc();
    return { signature, reused: false };
  }
}

async function maybeCreateCampaign(params: {
  program: anchor.Program;
  methods: ProgramMethods;
  merchantConfig: PublicKey;
  growthCampaign: PublicKey;
  merchantAuthority: PublicKey;
  merchantSigner: Keypair;
  rewardMint: PublicKey;
  campaignIdHash: Buffer;
  rewardPerVisit: anchor.BN;
  maxRedemptions: number;
  maxDepth: number;
  referrerSplitBps: number;
  splitRulesHash: Buffer;
  fraudPolicyHash: Buffer;
  campaignDurationSeconds: number;
}) {
  try {
    await fetchAccount(params.program, 'growthCampaign', params.growthCampaign);
    return { signature: null, reused: true };
  } catch {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const signature = await params.methods.createGrowthCampaign(
      Array.from(params.campaignIdHash),
      params.rewardPerVisit,
      params.maxRedemptions,
      params.maxDepth,
      params.referrerSplitBps,
      Array.from(params.splitRulesHash),
      Array.from(params.fraudPolicyHash),
      new anchor.BN(nowSeconds - 60),
      new anchor.BN(nowSeconds + params.campaignDurationSeconds),
    )
      .accounts({
        merchantConfig: params.merchantConfig,
        growthCampaign: params.growthCampaign,
        merchantAuthority: params.merchantAuthority,
        rewardMint: params.rewardMint,
        systemProgram: SystemProgram.programId,
      })
      .signers([params.merchantSigner])
      .rpc();
    return { signature, reused: false };
  }
}

type AttackSnapshotContext = {
  connection: Connection;
  keys: PublicKey[];
  proofSource: 'devnet_transaction_execution' | 'localnet_transaction_execution';
};

let attackSnapshotContext: AttackSnapshotContext | undefined;

async function accountSnapshot(connection: Connection, keys: PublicKey[]) {
  const infos = await connection.getMultipleAccountsInfo(keys, 'confirmed');
  return infos.map((info, index) => ({
    address: keys[index].toBase58(),
    exists: Boolean(info),
    lamports: info?.lamports ?? 0,
    owner: info?.owner?.toBase58() ?? null,
    executable: info?.executable ?? false,
    dataHash: info ? createHash('sha256').update(info.data).digest('hex') : null,
  }));
}

function hashJson(value: unknown) {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function sameSnapshot(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function classifyFailure(message: string): 'program_rejection' | 'client_error' | 'rpc_error' | 'setup_error' {
  const text = message.toLowerCase();
  if (
    text.includes('custom program error') ||
    text.includes('anchorerror') ||
    text.includes('error code:') ||
    text.includes('error number:') ||
    text.includes('program log:') ||
    text.includes('constraint') ||
    text.includes('seeds constraint') ||
    text.includes('accountalreadyinitialized') ||
    text.includes('already in use') ||
    text.includes('already initialized') ||
    text.includes('account is already initialized') ||
    text.includes('invalidclaimpass') ||
    text.includes('invalidterminal') ||
    text.includes('invalidvisitor') ||
    text.includes('invalidreward') ||
    text.includes('campaigninactive') ||
    text.includes('maxdepthexceeded') ||
    text.includes('claimpassalreadyrecorded') ||
    text.includes('intentmismatch') ||
    text.includes('signature verification failed') ||
    text.includes('missing signature') ||
    (text.includes('invalid') && text.includes('authority'))
  ) {
    return 'program_rejection';
  }
  if (text.includes('blockhash') || text.includes('rpc') || text.includes('429') || text.includes('timeout')) {
    return 'rpc_error';
  }
  if (text.includes('insufficient funds') || text.includes('not found') || text.includes('not deployed')) {
    return 'setup_error';
  }
  return 'client_error';
}

async function expectRejected(label: string, action: () => Promise<unknown>, extraWatchKeys: PublicKey[] = []) {
  const watchedKeys = attackSnapshotContext
    ? [...attackSnapshotContext.keys, ...extraWatchKeys]
    : extraWatchKeys;
  const snapshot = attackSnapshotContext
    ? await accountSnapshot(attackSnapshotContext.connection, watchedKeys)
    : undefined;

  try {
    await action();
  } catch (error) {
    const fullMessage = error instanceof Error ? error.message : String(error);
    const after = attackSnapshotContext
      ? await accountSnapshot(attackSnapshotContext.connection, watchedKeys)
      : undefined;
    const mutationVerified = Boolean(snapshot && after);
    const accountsMutated = mutationVerified ? !sameSnapshot(snapshot, after) : false;
    return {
      label,
      rejected: true,
      message: fullMessage,
      shortMessage: fullMessage.split('\n')[0],
      logs: (error as { logs?: string[] })?.logs ?? [],
      source: attackSnapshotContext?.proofSource ?? 'transaction_rejection_evidence',
      failureKind: classifyFailure(fullMessage),
      accountsMutated,
      accountsMutationVerified: mutationVerified,
      accountSnapshotHashBefore: snapshot ? hashJson(snapshot) : undefined,
      accountSnapshotHashAfter: after ? hashJson(after) : undefined,
    };
  }

  throw new Error(`${label} unexpectedly succeeded.`);
}

async function sendProgramInstruction(
  connection: Connection,
  payer: Keypair,
  builder: RpcBuilder,
  extraSigners: Keypair[] = [],
) {
  const transaction = new Transaction().add(await builder.instruction());
  const blockhash = await connection.getLatestBlockhash('confirmed');
  transaction.feePayer = payer.publicKey;
  transaction.recentBlockhash = blockhash.blockhash;
  const signers = [
    payer,
    ...extraSigners.filter((signer) => !signer.publicKey.equals(payer.publicKey)),
  ];
  transaction.sign(...signers);
  return sendAndConfirmTransaction(connection, transaction, signers, {
    commitment: 'confirmed',
  });
}


function hashExistingFiles(pathsToHash: string[]): string | null {
  const hash = createHash('sha256');
  let count = 0;
  const visit = (item: string) => {
    const resolved = path.resolve(item);
    if (!existsSync(resolved)) return;
    const stat = require('fs').statSync(resolved) as import('fs').Stats;
    if (stat.isDirectory()) {
      for (const child of require('fs').readdirSync(resolved).sort()) visit(path.join(resolved, child));
      return;
    }
    hash.update(resolved.replace(process.cwd(), '').replace(/\\/g, '/'));
    hash.update('\0');
    hash.update(readFileSync(resolved));
    hash.update('\0');
    count += 1;
  };
  pathsToHash.forEach(visit);
  return count > 0 ? hash.digest('hex') : null;
}

function proofHashes() {
  return {
    programSourceHash: hashExistingFiles(['programs/viral_sync/src']),
    idlHash: hashExistingFiles(['target/idl/viral_sync.json']),
    proofGeneratorHash: hashExistingFiles(['scripts/run-causal-commerce-localnet.ts']),
    verifierHash: hashExistingFiles(['scripts/verify-causal-receipt-localnet.ts', 'sdk/src/index.ts']),
  };
}

type AttackEvidence = {
  id: string;
  title: string;
  attempted: boolean;
  expected: 'rejected';
  observed: 'rejected' | 'accepted' | 'not_proven';
  errorCode: string;
  expectedErrorCode: string;
  expectedErrorPatterns: string[];
  actualError: string;
  expectedErrorMatched: boolean;
  failureKind: 'program_rejection' | 'client_error' | 'rpc_error' | 'setup_error' | 'intent_validator_rejection';
  instruction: string;
  accountsMutated: boolean;
  accountsMutationVerified: boolean;
  accountSnapshotHashBefore?: string;
  accountSnapshotHashAfter?: string;
  proofSource: string;
  reason: string;
};

function normalizeErrorText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9: _-]/g, ' ');
}

function expectedErrorMatched(actualError: string, expectedPatterns: string[]): boolean {
  const text = normalizeErrorText(actualError);
  return expectedPatterns.some((pattern) => {
    const raw = normalizeErrorText(pattern);
    const short = normalizeErrorText(pattern.split('::').pop() ?? pattern);
    return raw.length > 0 && (text.includes(raw) || text.includes(short));
  });
}

function expectedPatternsFor(errorCode: string): string[] {
  const short = errorCode.split('::').pop() ?? errorCode;
  const aliases: Record<string, string[]> = {
    AccountAlreadyInitialized: ['account already initialized', 'already initialized', 'already in use'],
    MissingRequiredSignature: ['missing required signature', 'signature verification failed'],
    ConstraintTokenOwner: ['constraint token owner', 'token owner', 'owner constraint'],
    InvalidRewardMint: ['invalid reward mint', 'reward mint'],
    InvalidTerminalAuthority: ['invalid terminal authority', 'terminal authority'],
    InvalidTerminalDevice: ['invalid terminal device', 'terminal device'],
    InvalidVisitorAuthority: ['invalid visitor authority', 'visitor authority'],
    InvalidClaimPass: ['invalid claim pass', 'claim pass'],
    ClaimPassAlreadyRecorded: ['claim pass already recorded', 'already recorded'],
    MaxDepthExceeded: ['max depth exceeded', 'depth exceeds'],
    CampaignInactive: ['campaign inactive', 'paused', 'expired campaign'],
    RewardAmountExceedsManifest: ['reward amount exceeds manifest', 'exceeds manifest'],
    IntentValidatorRejected: ['intent validator rejected', 'not allowed by manifest', 'does not match manifest', 'exceeds manifest'],
  };
  return [
    errorCode,
    short,
    short.replace(/([a-z0-9])([A-Z])/g, '$1 $2'),
    `error code: ${short}`,
    `error number: ${short}`,
    'custom program error',
    ...(aliases[short] ?? []),
  ];
}

function replayEvidence(id: string, title: string, instruction: string, check: any, errorCode = 'ProgramRejected'): AttackEvidence {
  const rejected = check?.rejected === true;
  const actualError = String(check?.message ?? check?.label ?? 'No structured rejection evidence generated.');
  const expectedErrorPatterns = expectedPatternsFor(errorCode);
  return {
    id,
    title,
    attempted: true,
    expected: 'rejected',
    observed: rejected ? 'rejected' : check ? 'accepted' : 'not_proven',
    errorCode: rejected ? errorCode : 'MissingEvidence',
    expectedErrorCode: errorCode,
    expectedErrorPatterns,
    actualError,
    expectedErrorMatched: rejected && expectedErrorMatched(actualError, expectedErrorPatterns),
    failureKind: check?.failureKind ?? 'client_error',
    instruction,
    accountsMutated: check?.accountsMutated === true,
    accountsMutationVerified: check?.accountsMutationVerified === true,
    accountSnapshotHashBefore: check?.accountSnapshotHashBefore,
    accountSnapshotHashAfter: check?.accountSnapshotHashAfter,
    proofSource: check?.source ?? 'transaction_rejection_evidence',
    reason: check?.shortMessage ?? actualError,
  };
}

function intentEvidence(id: string, title: string, check: any, errorCode = 'IntentValidatorRejected'): AttackEvidence {
  const rejected = check?.ok === false;
  const actualError = String(check?.reason ?? check?.label ?? 'No structured intent rejection evidence generated.');
  const expectedErrorPatterns = expectedPatternsFor(errorCode);
  return {
    id,
    title,
    attempted: true,
    expected: 'rejected',
    observed: rejected ? 'rejected' : check ? 'accepted' : 'not_proven',
    errorCode: rejected ? errorCode : 'MissingEvidence',
    expectedErrorCode: errorCode,
    expectedErrorPatterns,
    actualError,
    expectedErrorMatched: rejected && expectedErrorMatched(actualError, expectedErrorPatterns),
    failureKind: rejected ? 'intent_validator_rejection' : 'client_error',
    instruction: 'record_causal_receipt',
    accountsMutated: false,
    accountsMutationVerified: true,
    proofSource: 'intent_validator_check',
    reason: actualError,
  };
}

function writeManifest(outputPath: string, manifest: Record<string, unknown>) {
  const resolved = path.resolve(outputPath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(manifest, null, 2)}\n`);
  return resolved;
}

async function main() {
  const options = parseArgs();
  const cluster = detectCluster(options.rpcUrl);
  const walletInfo = loadWallet(options.walletPath);
  const connection = new Connection(options.rpcUrl, 'confirmed');
  const wallet = new anchor.Wallet(walletInfo.keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });
  const program = new anchor.Program(loadIdl(), provider);
  const methods = program.methods as unknown as ProgramMethods;

  console.error(`Using wallet ${wallet.publicKey.toBase58()} from ${walletInfo.source}`);
  await ensureProgramDeployed(connection);
  const balance = await ensureLocalnetBalance(connection, wallet.publicKey, options.airdropSol);

  const orgIdHash = hashBytes('org', options.orgId);
  const campaignIdHash = hashBytes('campaign', options.campaignId);
  const receiptIdHash = options.receiptIdHash ?? hashBytes('receipt', options.receiptId);
  const parentReceiptIdHash = zeroHash();
  const referrerCommitment = hashBytes('referrer', `${options.campaignId}:referrer`);
  const claimerNullifierHash = options.claimerNullifierHash ?? hashBytes('claimer-nullifier', `${options.campaignId}:visitor`);
  const inviteHash = options.inviteHash ?? hashBytes('invite', `${options.campaignId}:invite`);
  const visitAttestationHash = options.visitAttestationHash ?? hashBytes('visit-attestation', `${options.receiptId}:staff-and-visitor`);
  const riskScoreCommitment = hashBytes('risk-score', `${options.receiptId}:low`);
  const splitRulesHash = hashBytes('split-rules', 'referrer-80-visitor-20');
  const fraudPolicyHash = hashBytes('fraud-policy', 'single-nullifier-staff-challenge-v1');
  const referrerAuthority = Keypair.generate();
  const visitorAuthority = Keypair.generate();
  const terminalAuthority = Keypair.generate();
  const attackerAuthority = Keypair.generate();
  const fundAttackerAuthority = options.attackCheck
    ? await fundSignerIfNeeded(connection, walletInfo.keypair, attackerAuthority.publicKey, Math.round(0.02 * LAMPORTS_PER_SOL))
    : null;
  const claimHash = hashBytes('claim-pass', `${options.campaignId}:visitor-claim-pass`);
  const lineageProofHash = hashBytes('lineage-proof', `${options.campaignId}:visitor-depth-1`);
  const terminalLabelHash = hashBytes('terminal-label', `${options.orgId}:counter-terminal-1`);
  const manifestIssuedAtDate = new Date();
  const manifestExpiresAtDate = new Date(manifestIssuedAtDate.getTime() + 24 * 60 * 60_000);
  const intentManifest = {
    version: 'viral-sync-intent-v1',
    action: 'record_causal_receipt_and_settle_reward',
    chain: cluster,
    programId: PROGRAM_ID.toBase58(),
    orgIdHash: orgIdHash.toString('hex'),
    campaignIdHash: campaignIdHash.toString('hex'),
    receiptIdHash: receiptIdHash.toString('hex'),
    claimerNullifierHash: claimerNullifierHash.toString('hex'),
    inviteHash: inviteHash.toString('hex'),
    visitAttestationHash: visitAttestationHash.toString('hex'),
    rewardPerVisit: options.rewardPerVisit.toString(),
    rewardAmount: Number(options.rewardPerVisit.toString()),
    maxRedemptions: options.maxRedemptions,
    referrerSplitBps: 8_000,
    referrerBeneficiary: referrerAuthority.publicKey.toBase58(),
    visitorBeneficiary: visitorAuthority.publicKey.toBase58(),
    attestationModel: 'merchant_terminal_visitor_signed',
    proofLevel: 'counter_attested',
    terminalAuthority: terminalAuthority.publicKey.toBase58(),
    visitorAuthority: visitorAuthority.publicKey.toBase58(),
    claimHash: claimHash.toString('hex'),
    lineageProofHash: lineageProofHash.toString('hex'),
    lineageGeneration: 1,
    allowedInstructions: [
      'record_causal_receipt',
      'settle_receipt_reward',
    ],
    allowedPrograms: [
      PROGRAM_ID.toBase58(),
      TOKEN_PROGRAM_ID.toBase58(),
      ASSOCIATED_TOKEN_PROGRAM_ID.toBase58(),
      SystemProgram.programId.toBase58(),
    ],
    forbiddenEffects: [
      'set_authority',
      'assign_account_owner',
      'unknown_token_transfer',
      'close_user_token_account',
      'delegate_token_account',
      'unknown_writable_account',
      'extra_sol_transfer',
      'wrong_beneficiary',
      'wrong_reward_amount',
      'duplicate_nullifier',
    ],
    issuedAt: manifestIssuedAtDate.toISOString(),
    expiresAt: manifestExpiresAtDate.toISOString(),
    expirySemantics: 'Intent expiry is evaluated at receipt creation/effect-check time, not at judge review time.',
    nonce: randomUUID(),
  };

  const [merchantConfig, merchantConfigBump] = findPda('causal_merchant', [wallet.publicKey.toBuffer(), orgIdHash]);
  const [growthCampaign, growthCampaignBump] = findPda('growth_campaign', [merchantConfig.toBuffer(), campaignIdHash]);
  const [terminalDevice, terminalDeviceBump] = findPda('terminal_device', [merchantConfig.toBuffer(), terminalAuthority.publicKey.toBuffer()]);
  const [claimPass, claimPassBump] = findPda('claim_pass', [growthCampaign.toBuffer(), visitorAuthority.publicKey.toBuffer(), claimHash]);

  const existingGrowthCampaign = await tryFetchGrowthCampaign(program, growthCampaign);
  let rewardMint = options.rewardMint;
  let createMintSignature: string | null = null;

  if (existingGrowthCampaign) {
    const existingRewardMint = publicKeyFromAccountField(existingGrowthCampaign.rewardMint, 'rewardMint');
    if (rewardMint && !rewardMint.equals(existingRewardMint)) {
      throw new Error(`Existing campaign ${growthCampaign.toBase58()} uses reward mint ${existingRewardMint.toBase58()}, but --reward-mint was ${rewardMint.toBase58()}. Use a new --campaign or pass the existing mint.`);
    }
    rewardMint = existingRewardMint;
    console.error(`existing growth campaign found; reusing reward mint ${rewardMint.toBase58()}`);
  }

  if (!rewardMint) {
    const mint = await createLocalnetRewardMint(connection, walletInfo.keypair);
    rewardMint = mint.publicKey;
    createMintSignature = mint.signature;
  }

  const [rewardEscrow, rewardEscrowBump] = findPda('reward_escrow', [growthCampaign.toBuffer(), rewardMint.toBuffer()]);
  const [causalReceipt, causalReceiptBump] = findPda('causal_receipt', [growthCampaign.toBuffer(), receiptIdHash]);
  const [nullifierRecord, nullifierRecordBump] = findPda('campaign_nullifier', [growthCampaign.toBuffer(), claimerNullifierHash]);
  const [settlementRecord, settlementRecordBump] = findPda('settlement', [causalReceipt.toBuffer()]);
  const intentManifestHash = hashIntentManifest(intentManifest);
  const merchantRewardAccount = await ensureAssociatedTokenAccount(connection, walletInfo.keypair, wallet.publicKey, rewardMint);
  const rewardVault = await ensureAssociatedTokenAccount(connection, walletInfo.keypair, rewardEscrow, rewardMint);
  const referrerRewardAccount = await ensureAssociatedTokenAccount(connection, walletInfo.keypair, referrerAuthority.publicKey, rewardMint);
  const visitorRewardAccount = await ensureAssociatedTokenAccount(connection, walletInfo.keypair, visitorAuthority.publicKey, rewardMint);
  const attackerRewardAccount = await ensureAssociatedTokenAccount(connection, walletInfo.keypair, attackerAuthority.publicKey, rewardMint);
  const maxCapacity = options.rewardPerVisit.mul(new anchor.BN(options.maxRedemptions));
  const alreadyFunded = existingGrowthCampaign
    ? bnFromAccountField(existingGrowthCampaign.totalFunded, 'totalFunded')
    : new anchor.BN(0);
  if (alreadyFunded.gt(maxCapacity)) {
    throw new Error(`Existing campaign is already funded above the requested capacity (${alreadyFunded.toString()} > ${maxCapacity.toString()}). Use a new --campaign or align --reward-per-visit/--max-redemptions.`);
  }
  const remainingCapacity = maxCapacity.sub(alreadyFunded);
  const amountToFund = bnMin(options.fundAmount, remainingCapacity);

  let mintRewardTokensSignature: string | null = null;
  if (amountToFund.gt(new anchor.BN(0))) {
    mintRewardTokensSignature = await mintRewardTokens(
      connection,
      walletInfo.keypair,
      rewardMint,
      merchantRewardAccount.address,
      amountToFund,
    );
  } else {
    console.error(`campaign already funded to capacity (${alreadyFunded.toString()}/${maxCapacity.toString()}); skipping mintRewardTokens and fundGrowthBounty`);
  }
  const tokenBalancesBefore = {
    merchantRewardAccount: await tokenAmount(connection, merchantRewardAccount.address),
    rewardVault: await tokenAmount(connection, rewardVault.address),
    referrerRewardAccount: await tokenAmount(connection, referrerRewardAccount.address),
    visitorRewardAccount: await tokenAmount(connection, visitorRewardAccount.address),
  };

  const registerMerchant = await maybeRegisterMerchant(
    program,
    methods,
    walletInfo.keypair,
    merchantConfig,
    wallet.publicKey,
    orgIdHash,
  );
  console.error('registerMerchant complete');

  const enrollTerminalDevice = await sendProgramInstruction(connection, walletInfo.keypair, methods.enrollTerminalDevice(
    Array.from(terminalLabelHash),
  )
    .accounts({
      merchantConfig,
      merchantAuthority: wallet.publicKey,
      terminalAuthority: terminalAuthority.publicKey,
      terminalDevice,
      systemProgram: SystemProgram.programId,
    }), [terminalAuthority]);
  console.error('enrollTerminalDevice complete');

  const createGrowthCampaign = await maybeCreateCampaign({
    program,
    methods,
    merchantConfig,
    growthCampaign,
    merchantAuthority: wallet.publicKey,
    merchantSigner: walletInfo.keypair,
    rewardMint,
    campaignIdHash,
    rewardPerVisit: options.rewardPerVisit,
    maxRedemptions: options.maxRedemptions,
    maxDepth: options.maxDepth,
    referrerSplitBps: 8_000,
    splitRulesHash,
    fraudPolicyHash,
    campaignDurationSeconds: options.campaignDurationSeconds,
  });
  console.error('createGrowthCampaign complete');

  const issueClaimPass = await sendProgramInstruction(connection, walletInfo.keypair, methods.issueClaimPass(
    Array.from(claimHash),
    1,
    Array.from(lineageProofHash),
    PublicKey.default,
  )
    .accounts({
      growthCampaign,
      merchantConfig,
      merchantAuthority: wallet.publicKey,
      visitorAuthority: visitorAuthority.publicKey,
      claimPass,
      systemProgram: SystemProgram.programId,
    }));
  console.error('issueClaimPass complete');

  let fundGrowthBounty: string | null = null;
  if (amountToFund.gt(new anchor.BN(0))) {
    fundGrowthBounty = await sendProgramInstruction(connection, walletInfo.keypair, methods.fundGrowthBounty(amountToFund)
      .accounts({
        growthCampaign,
        rewardEscrow,
        merchantRewardAccount: merchantRewardAccount.address,
        rewardVault: rewardVault.address,
        rewardMint,
        merchantAuthority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      }));
    console.error(`fundGrowthBounty complete for ${amountToFund.toString()} units`);
  } else {
    console.error('fundGrowthBounty skipped because the campaign is already funded to capacity');
  }

  const replayChecks: unknown[] = [];
  attackSnapshotContext = {
    connection,
    keys: [
      merchantConfig,
      growthCampaign,
      terminalDevice,
      claimPass,
      causalReceipt,
      nullifierRecord,
      settlementRecord,
      rewardEscrow,
      rewardVault.address,
      referrerRewardAccount.address,
      visitorRewardAccount.address,
    ],
    proofSource: cluster === 'devnet' ? 'devnet_transaction_execution' : 'localnet_transaction_execution',
  };
  if (options.attackCheck) {
    const merchantOnlyReceiptIdHash = hashBytes('receipt', `${options.receiptId}:merchant-only`);
    const merchantOnlyNullifierHash = hashBytes('claimer-nullifier', `${options.campaignId}:merchant-only`);
    const [merchantOnlyReceipt] = findPda('causal_receipt', [growthCampaign.toBuffer(), merchantOnlyReceiptIdHash]);
    const [merchantOnlyNullifier] = findPda('campaign_nullifier', [growthCampaign.toBuffer(), merchantOnlyNullifierHash]);
    replayChecks.push(await expectRejected('merchant-only receipt rejected', () => sendProgramInstruction(connection, walletInfo.keypair, methods.recordCausalReceipt(
      Array.from(merchantOnlyReceiptIdHash),
      Array.from(parentReceiptIdHash),
      Array.from(referrerCommitment),
      Array.from(merchantOnlyNullifierHash),
      Array.from(inviteHash),
      Array.from(visitAttestationHash),
      Array.from(intentManifestHash),
      Array.from(riskScoreCommitment),
      referrerAuthority.publicKey,
      visitorAuthority.publicKey,
    )
      .accounts({
        growthCampaign,
        merchantConfig,
        rewardEscrow,
        rewardVault: rewardVault.address,
        causalReceipt: merchantOnlyReceipt,
        nullifierRecord: merchantOnlyNullifier,
        claimPass,
        terminalDevice,
        terminalAuthority: terminalAuthority.publicKey,
        visitorAuthority: visitorAuthority.publicKey,
        merchantAuthority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })), [merchantOnlyReceipt, merchantOnlyNullifier]));

    const wrongTerminalReceiptIdHash = hashBytes('receipt', `${options.receiptId}:wrong-terminal`);
    const wrongTerminalNullifierHash = hashBytes('claimer-nullifier', `${options.campaignId}:wrong-terminal`);
    const [wrongTerminalReceipt] = findPda('causal_receipt', [growthCampaign.toBuffer(), wrongTerminalReceiptIdHash]);
    const [wrongTerminalNullifier] = findPda('campaign_nullifier', [growthCampaign.toBuffer(), wrongTerminalNullifierHash]);
    const [wrongTerminalDevice] = findPda('terminal_device', [merchantConfig.toBuffer(), attackerAuthority.publicKey.toBuffer()]);
    replayChecks.push(await expectRejected('wrong terminal signer rejected', () => sendProgramInstruction(connection, walletInfo.keypair, methods.recordCausalReceipt(
      Array.from(wrongTerminalReceiptIdHash),
      Array.from(parentReceiptIdHash),
      Array.from(referrerCommitment),
      Array.from(wrongTerminalNullifierHash),
      Array.from(inviteHash),
      Array.from(visitAttestationHash),
      Array.from(intentManifestHash),
      Array.from(riskScoreCommitment),
      referrerAuthority.publicKey,
      visitorAuthority.publicKey,
    )
      .accounts({
        growthCampaign,
        merchantConfig,
        rewardEscrow,
        rewardVault: rewardVault.address,
        causalReceipt: wrongTerminalReceipt,
        nullifierRecord: wrongTerminalNullifier,
        claimPass,
        terminalDevice: wrongTerminalDevice,
        terminalAuthority: attackerAuthority.publicKey,
        visitorAuthority: visitorAuthority.publicKey,
        merchantAuthority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      }), [attackerAuthority, visitorAuthority]), [wrongTerminalReceipt, wrongTerminalNullifier, wrongTerminalDevice]));

    const terminalMismatchReceiptIdHash = hashBytes('receipt', `${options.receiptId}:terminal-mismatch`);
    const terminalMismatchNullifierHash = hashBytes('claimer-nullifier', `${options.campaignId}:terminal-mismatch`);
    const [terminalMismatchReceipt] = findPda('causal_receipt', [growthCampaign.toBuffer(), terminalMismatchReceiptIdHash]);
    const [terminalMismatchNullifier] = findPda('campaign_nullifier', [growthCampaign.toBuffer(), terminalMismatchNullifierHash]);
    replayChecks.push(await expectRejected('enrolled terminal account with wrong terminal signer rejected', () => sendProgramInstruction(connection, walletInfo.keypair, methods.recordCausalReceipt(
      Array.from(terminalMismatchReceiptIdHash),
      Array.from(parentReceiptIdHash),
      Array.from(referrerCommitment),
      Array.from(terminalMismatchNullifierHash),
      Array.from(inviteHash),
      Array.from(visitAttestationHash),
      Array.from(intentManifestHash),
      Array.from(riskScoreCommitment),
      referrerAuthority.publicKey,
      visitorAuthority.publicKey,
    )
      .accounts({
        growthCampaign,
        merchantConfig,
        rewardEscrow,
        rewardVault: rewardVault.address,
        causalReceipt: terminalMismatchReceipt,
        nullifierRecord: terminalMismatchNullifier,
        claimPass,
        terminalDevice,
        terminalAuthority: attackerAuthority.publicKey,
        visitorAuthority: visitorAuthority.publicKey,
        merchantAuthority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      }), [attackerAuthority, visitorAuthority]), [terminalMismatchReceipt, terminalMismatchNullifier]));

    const wrongVisitorAuthority = Keypair.generate();
    const wrongVisitorReceiptIdHash = hashBytes('receipt', `${options.receiptId}:wrong-visitor-signer`);
    const wrongVisitorNullifierHash = hashBytes('claimer-nullifier', `${options.campaignId}:wrong-visitor-signer`);
    const [wrongVisitorReceipt] = findPda('causal_receipt', [growthCampaign.toBuffer(), wrongVisitorReceiptIdHash]);
    const [wrongVisitorNullifier] = findPda('campaign_nullifier', [growthCampaign.toBuffer(), wrongVisitorNullifierHash]);
    replayChecks.push(await expectRejected('visitor signer does not match claim pass visitor rejected', () => sendProgramInstruction(connection, walletInfo.keypair, methods.recordCausalReceipt(
      Array.from(wrongVisitorReceiptIdHash),
      Array.from(parentReceiptIdHash),
      Array.from(referrerCommitment),
      Array.from(wrongVisitorNullifierHash),
      Array.from(inviteHash),
      Array.from(visitAttestationHash),
      Array.from(intentManifestHash),
      Array.from(riskScoreCommitment),
      referrerAuthority.publicKey,
      wrongVisitorAuthority.publicKey,
    )
      .accounts({
        growthCampaign,
        merchantConfig,
        rewardEscrow,
        rewardVault: rewardVault.address,
        causalReceipt: wrongVisitorReceipt,
        nullifierRecord: wrongVisitorNullifier,
        claimPass,
        terminalDevice,
        terminalAuthority: terminalAuthority.publicKey,
        visitorAuthority: wrongVisitorAuthority.publicKey,
        merchantAuthority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      }), [terminalAuthority, wrongVisitorAuthority]), [wrongVisitorReceipt, wrongVisitorNullifier]));

    const wrongVisitorBeneficiaryReceiptIdHash = hashBytes('receipt', `${options.receiptId}:wrong-visitor-beneficiary`);
    const wrongVisitorBeneficiaryNullifierHash = hashBytes('claimer-nullifier', `${options.campaignId}:wrong-visitor-beneficiary`);
    const [wrongVisitorBeneficiaryReceipt] = findPda('causal_receipt', [growthCampaign.toBuffer(), wrongVisitorBeneficiaryReceiptIdHash]);
    const [wrongVisitorBeneficiaryNullifier] = findPda('campaign_nullifier', [growthCampaign.toBuffer(), wrongVisitorBeneficiaryNullifierHash]);
    replayChecks.push(await expectRejected('receipt visitor beneficiary must match visitor signer rejected', () => sendProgramInstruction(connection, walletInfo.keypair, methods.recordCausalReceipt(
      Array.from(wrongVisitorBeneficiaryReceiptIdHash),
      Array.from(parentReceiptIdHash),
      Array.from(referrerCommitment),
      Array.from(wrongVisitorBeneficiaryNullifierHash),
      Array.from(inviteHash),
      Array.from(visitAttestationHash),
      Array.from(intentManifestHash),
      Array.from(riskScoreCommitment),
      referrerAuthority.publicKey,
      attackerAuthority.publicKey,
    )
      .accounts({
        growthCampaign,
        merchantConfig,
        rewardEscrow,
        rewardVault: rewardVault.address,
        causalReceipt: wrongVisitorBeneficiaryReceipt,
        nullifierRecord: wrongVisitorBeneficiaryNullifier,
        claimPass,
        terminalDevice,
        terminalAuthority: terminalAuthority.publicKey,
        visitorAuthority: visitorAuthority.publicKey,
        merchantAuthority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      }), [terminalAuthority, visitorAuthority]), [wrongVisitorBeneficiaryReceipt, wrongVisitorBeneficiaryNullifier]));

    const tooDeepClaimHash = hashBytes('claim-pass', `${options.campaignId}:too-deep`);
    const [tooDeepClaimPass] = findPda('claim_pass', [growthCampaign.toBuffer(), visitorAuthority.publicKey.toBuffer(), tooDeepClaimHash]);
    replayChecks.push(await expectRejected('claim pass depth exceeds maxDepth rejected', () => sendProgramInstruction(connection, walletInfo.keypair, methods.issueClaimPass(
      Array.from(tooDeepClaimHash),
      options.maxDepth + 1,
      Array.from(hashBytes('lineage-proof', `${options.campaignId}:too-deep`)),
      PublicKey.default,
    )
      .accounts({
        growthCampaign,
        merchantConfig,
        merchantAuthority: wallet.publicKey,
        visitorAuthority: visitorAuthority.publicKey,
        claimPass: tooDeepClaimPass,
        systemProgram: SystemProgram.programId,
      })), [tooDeepClaimPass]));

    const differentMerchantOrgHash = hashBytes('org', `${options.orgId}:different-merchant`);
    const [differentMerchantConfig] = findPda('causal_merchant', [attackerAuthority.publicKey.toBuffer(), differentMerchantOrgHash]);
    await maybeRegisterMerchant(
      program,
      methods,
      attackerAuthority,
      differentMerchantConfig,
      attackerAuthority.publicKey,
      differentMerchantOrgHash,
    );
    const differentMerchantTerminalAuthority = Keypair.generate();
    const [differentMerchantTerminalDevice] = findPda('terminal_device', [
      differentMerchantConfig.toBuffer(),
      differentMerchantTerminalAuthority.publicKey.toBuffer(),
    ]);
    await sendProgramInstruction(connection, walletInfo.keypair, methods.enrollTerminalDevice(
      Array.from(hashBytes('terminal-label', `${options.orgId}:different-merchant-terminal`)),
    )
      .accounts({
        merchantConfig: differentMerchantConfig,
        merchantAuthority: attackerAuthority.publicKey,
        terminalAuthority: differentMerchantTerminalAuthority.publicKey,
        terminalDevice: differentMerchantTerminalDevice,
        systemProgram: SystemProgram.programId,
      }), [attackerAuthority, differentMerchantTerminalAuthority]);
    const differentMerchantTerminalReceiptIdHash = hashBytes('receipt', `${options.receiptId}:different-merchant-terminal`);
    const differentMerchantTerminalNullifierHash = hashBytes('claimer-nullifier', `${options.campaignId}:different-merchant-terminal`);
    const [differentMerchantTerminalReceipt] = findPda('causal_receipt', [growthCampaign.toBuffer(), differentMerchantTerminalReceiptIdHash]);
    const [differentMerchantTerminalNullifier] = findPda('campaign_nullifier', [growthCampaign.toBuffer(), differentMerchantTerminalNullifierHash]);
    replayChecks.push(await expectRejected('different merchant terminal rejected', () => sendProgramInstruction(connection, walletInfo.keypair, methods.recordCausalReceipt(
      Array.from(differentMerchantTerminalReceiptIdHash),
      Array.from(parentReceiptIdHash),
      Array.from(referrerCommitment),
      Array.from(differentMerchantTerminalNullifierHash),
      Array.from(inviteHash),
      Array.from(visitAttestationHash),
      Array.from(intentManifestHash),
      Array.from(riskScoreCommitment),
      referrerAuthority.publicKey,
      visitorAuthority.publicKey,
    )
      .accounts({
        growthCampaign,
        merchantConfig,
        rewardEscrow,
        rewardVault: rewardVault.address,
        causalReceipt: differentMerchantTerminalReceipt,
        nullifierRecord: differentMerchantTerminalNullifier,
        claimPass,
        terminalDevice: differentMerchantTerminalDevice,
        terminalAuthority: differentMerchantTerminalAuthority.publicKey,
        visitorAuthority: visitorAuthority.publicKey,
        merchantAuthority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      }), [differentMerchantTerminalAuthority, visitorAuthority]), [differentMerchantTerminalReceipt, differentMerchantTerminalNullifier, differentMerchantTerminalDevice]));

    const mismatchCampaignIdHash = hashBytes('campaign', `${options.campaignId}:claim-pass-campaign-mismatch`);
    const [mismatchCampaign] = findPda('growth_campaign', [merchantConfig.toBuffer(), mismatchCampaignIdHash]);
    await maybeCreateCampaign({
      program,
      methods,
      merchantConfig,
      growthCampaign: mismatchCampaign,
      merchantAuthority: wallet.publicKey,
      merchantSigner: walletInfo.keypair,
      rewardMint,
      campaignIdHash: mismatchCampaignIdHash,
      rewardPerVisit: options.rewardPerVisit,
      maxRedemptions: options.maxRedemptions,
      maxDepth: options.maxDepth,
      referrerSplitBps: 8_000,
      splitRulesHash,
      fraudPolicyHash,
      campaignDurationSeconds: options.campaignDurationSeconds,
    });
    const mismatchClaimHash = hashBytes('claim-pass', `${options.campaignId}:claim-pass-campaign-mismatch`);
    const [mismatchClaimPass] = findPda('claim_pass', [mismatchCampaign.toBuffer(), visitorAuthority.publicKey.toBuffer(), mismatchClaimHash]);
    await sendProgramInstruction(connection, walletInfo.keypair, methods.issueClaimPass(
      Array.from(mismatchClaimHash),
      1,
      Array.from(hashBytes('lineage-proof', `${options.campaignId}:claim-pass-campaign-mismatch`)),
      PublicKey.default,
    )
      .accounts({
        growthCampaign: mismatchCampaign,
        merchantConfig,
        merchantAuthority: wallet.publicKey,
        visitorAuthority: visitorAuthority.publicKey,
        claimPass: mismatchClaimPass,
        systemProgram: SystemProgram.programId,
      }));
    const mismatchReceiptIdHash = hashBytes('receipt', `${options.receiptId}:claim-pass-campaign-mismatch`);
    const mismatchNullifierHash = hashBytes('claimer-nullifier', `${options.campaignId}:claim-pass-campaign-mismatch`);
    const [mismatchReceipt] = findPda('causal_receipt', [growthCampaign.toBuffer(), mismatchReceiptIdHash]);
    const [mismatchNullifier] = findPda('campaign_nullifier', [growthCampaign.toBuffer(), mismatchNullifierHash]);
    replayChecks.push(await expectRejected('claim pass campaign mismatch rejected', () => sendProgramInstruction(connection, walletInfo.keypair, methods.recordCausalReceipt(
      Array.from(mismatchReceiptIdHash),
      Array.from(parentReceiptIdHash),
      Array.from(referrerCommitment),
      Array.from(mismatchNullifierHash),
      Array.from(inviteHash),
      Array.from(visitAttestationHash),
      Array.from(intentManifestHash),
      Array.from(riskScoreCommitment),
      referrerAuthority.publicKey,
      visitorAuthority.publicKey,
    )
      .accounts({
        growthCampaign,
        merchantConfig,
        rewardEscrow,
        rewardVault: rewardVault.address,
        causalReceipt: mismatchReceipt,
        nullifierRecord: mismatchNullifier,
        claimPass: mismatchClaimPass,
        terminalDevice,
        terminalAuthority: terminalAuthority.publicKey,
        visitorAuthority: visitorAuthority.publicKey,
        merchantAuthority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      }), [terminalAuthority, visitorAuthority]), [mismatchReceipt, mismatchNullifier, mismatchClaimPass]));

    const wrongMint = await createLocalnetRewardMint(connection, walletInfo.keypair);
    const wrongMintMerchantAta = await ensureAssociatedTokenAccount(connection, walletInfo.keypair, wallet.publicKey, wrongMint.publicKey);
    await mintRewardTokens(connection, walletInfo.keypair, wrongMint.publicKey, wrongMintMerchantAta.address, new anchor.BN(1));
    replayChecks.push(await expectRejected('wrong reward mint rejected', () => sendProgramInstruction(connection, walletInfo.keypair, methods.fundGrowthBounty(new anchor.BN(1))
      .accounts({
        growthCampaign,
        rewardEscrow,
        merchantRewardAccount: wrongMintMerchantAta.address,
        rewardVault: rewardVault.address,
        rewardMint: wrongMint.publicKey,
        merchantAuthority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })), [wrongMintMerchantAta.address]));

    const pausedCampaignIdHash = hashBytes('campaign', `${options.campaignId}:paused-attack`);
    const [pausedCampaign] = findPda('growth_campaign', [merchantConfig.toBuffer(), pausedCampaignIdHash]);
    await maybeCreateCampaign({
      program,
      methods,
      merchantConfig,
      growthCampaign: pausedCampaign,
      merchantAuthority: wallet.publicKey,
      merchantSigner: walletInfo.keypair,
      rewardMint,
      campaignIdHash: pausedCampaignIdHash,
      rewardPerVisit: options.rewardPerVisit,
      maxRedemptions: options.maxRedemptions,
      maxDepth: options.maxDepth,
      referrerSplitBps: 8_000,
      splitRulesHash,
      fraudPolicyHash,
      campaignDurationSeconds: options.campaignDurationSeconds,
    });
    const [pausedRewardEscrow] = findPda('reward_escrow', [pausedCampaign.toBuffer(), rewardMint.toBuffer()]);
    const pausedRewardVault = await ensureAssociatedTokenAccount(connection, walletInfo.keypair, pausedRewardEscrow, rewardMint);
    await mintRewardTokens(connection, walletInfo.keypair, rewardMint, merchantRewardAccount.address, options.rewardPerVisit);
    await sendProgramInstruction(connection, walletInfo.keypair, methods.fundGrowthBounty(options.rewardPerVisit)
      .accounts({
        growthCampaign: pausedCampaign,
        rewardEscrow: pausedRewardEscrow,
        merchantRewardAccount: merchantRewardAccount.address,
        rewardVault: pausedRewardVault.address,
        rewardMint,
        merchantAuthority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      }));
    const pausedClaimHash = hashBytes('claim-pass', `${options.campaignId}:paused-attack`);
    const [pausedClaimPass] = findPda('claim_pass', [pausedCampaign.toBuffer(), visitorAuthority.publicKey.toBuffer(), pausedClaimHash]);
    await sendProgramInstruction(connection, walletInfo.keypair, methods.issueClaimPass(
      Array.from(pausedClaimHash),
      1,
      Array.from(hashBytes('lineage-proof', `${options.campaignId}:paused-attack`)),
      PublicKey.default,
    )
      .accounts({
        growthCampaign: pausedCampaign,
        merchantConfig,
        merchantAuthority: wallet.publicKey,
        visitorAuthority: visitorAuthority.publicKey,
        claimPass: pausedClaimPass,
        systemProgram: SystemProgram.programId,
      }));
    await sendProgramInstruction(connection, walletInfo.keypair, methods.setGrowthCampaignStatus({ paused: {} })
      .accounts({
        growthCampaign: pausedCampaign,
        merchantAuthority: wallet.publicKey,
      }));
    const pausedReceiptIdHash = hashBytes('receipt', `${options.receiptId}:paused-campaign`);
    const pausedNullifierHash = hashBytes('claimer-nullifier', `${options.campaignId}:paused-campaign`);
    const [pausedReceipt] = findPda('causal_receipt', [pausedCampaign.toBuffer(), pausedReceiptIdHash]);
    const [pausedNullifier] = findPda('campaign_nullifier', [pausedCampaign.toBuffer(), pausedNullifierHash]);
    replayChecks.push(await expectRejected('paused or expired campaign receipt attempt rejected', () => sendProgramInstruction(connection, walletInfo.keypair, methods.recordCausalReceipt(
      Array.from(pausedReceiptIdHash),
      Array.from(parentReceiptIdHash),
      Array.from(referrerCommitment),
      Array.from(pausedNullifierHash),
      Array.from(inviteHash),
      Array.from(visitAttestationHash),
      Array.from(intentManifestHash),
      Array.from(riskScoreCommitment),
      referrerAuthority.publicKey,
      visitorAuthority.publicKey,
    )
      .accounts({
        growthCampaign: pausedCampaign,
        merchantConfig,
        rewardEscrow: pausedRewardEscrow,
        rewardVault: pausedRewardVault.address,
        causalReceipt: pausedReceipt,
        nullifierRecord: pausedNullifier,
        claimPass: pausedClaimPass,
        terminalDevice,
        terminalAuthority: terminalAuthority.publicKey,
        visitorAuthority: visitorAuthority.publicKey,
        merchantAuthority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      }), [terminalAuthority, visitorAuthority]), [pausedReceipt, pausedNullifier, pausedClaimPass]));
  }

  const recordCausalReceipt = await sendProgramInstruction(connection, walletInfo.keypair, methods.recordCausalReceipt(
    Array.from(receiptIdHash),
    Array.from(parentReceiptIdHash),
    Array.from(referrerCommitment),
    Array.from(claimerNullifierHash),
    Array.from(inviteHash),
    Array.from(visitAttestationHash),
    Array.from(intentManifestHash),
    Array.from(riskScoreCommitment),
    referrerAuthority.publicKey,
    visitorAuthority.publicKey,
  )
    .accounts({
      growthCampaign,
      merchantConfig,
      rewardEscrow,
      rewardVault: rewardVault.address,
      causalReceipt,
      nullifierRecord,
      claimPass,
      terminalDevice,
      terminalAuthority: terminalAuthority.publicKey,
      visitorAuthority: visitorAuthority.publicKey,
      merchantAuthority: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    }), [terminalAuthority, visitorAuthority]);
  console.error('recordCausalReceipt complete');

  if (options.attackCheck) {
    const recordedClaimReceiptIdHash = hashBytes('receipt', `${options.receiptId}:recorded-claim-pass`);
    const recordedClaimNullifierHash = hashBytes('claimer-nullifier', `${options.campaignId}:recorded-claim-pass`);
    const [recordedClaimReceipt] = findPda('causal_receipt', [growthCampaign.toBuffer(), recordedClaimReceiptIdHash]);
    const [recordedClaimNullifier] = findPda('campaign_nullifier', [growthCampaign.toBuffer(), recordedClaimNullifierHash]);
    replayChecks.push(await expectRejected('claim pass already recorded rejected', () => sendProgramInstruction(connection, walletInfo.keypair, methods.recordCausalReceipt(
      Array.from(recordedClaimReceiptIdHash),
      Array.from(parentReceiptIdHash),
      Array.from(referrerCommitment),
      Array.from(recordedClaimNullifierHash),
      Array.from(inviteHash),
      Array.from(visitAttestationHash),
      Array.from(intentManifestHash),
      Array.from(riskScoreCommitment),
      referrerAuthority.publicKey,
      visitorAuthority.publicKey,
    )
      .accounts({
        growthCampaign,
        merchantConfig,
        rewardEscrow,
        rewardVault: rewardVault.address,
        causalReceipt: recordedClaimReceipt,
        nullifierRecord: recordedClaimNullifier,
        claimPass,
        terminalDevice,
        terminalAuthority: terminalAuthority.publicKey,
        visitorAuthority: visitorAuthority.publicKey,
        merchantAuthority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      }), [terminalAuthority, visitorAuthority]), [recordedClaimReceipt, recordedClaimNullifier, claimPass]));
  }

  let issueReplayClaimPass: string | null = null;
  if (options.replayCheck || options.attackCheck) {
    const replayClaimHash = hashBytes('claim-pass', `${options.campaignId}:replay-claim-pass`);
    const replayLineageProofHash = hashBytes('lineage-proof', `${options.campaignId}:replay-claim-pass`);
    const [replayClaimPass] = findPda('claim_pass', [growthCampaign.toBuffer(), visitorAuthority.publicKey.toBuffer(), replayClaimHash]);
    issueReplayClaimPass = await sendProgramInstruction(connection, walletInfo.keypair, methods.issueClaimPass(
      Array.from(replayClaimHash),
      1,
      Array.from(replayLineageProofHash),
      PublicKey.default,
    )
      .accounts({
        growthCampaign,
        merchantConfig,
        merchantAuthority: wallet.publicKey,
        visitorAuthority: visitorAuthority.publicKey,
        claimPass: replayClaimPass,
        systemProgram: SystemProgram.programId,
      }));

    const replayReceiptIdHash = hashBytes('receipt', `${options.receiptId}:replay`);
    const [replayReceipt] = findPda('causal_receipt', [growthCampaign.toBuffer(), replayReceiptIdHash]);
    replayChecks.push(await expectRejected('duplicate campaign nullifier', () => sendProgramInstruction(connection, walletInfo.keypair, methods.recordCausalReceipt(
      Array.from(replayReceiptIdHash),
      Array.from(parentReceiptIdHash),
      Array.from(referrerCommitment),
      Array.from(claimerNullifierHash),
      Array.from(inviteHash),
      Array.from(visitAttestationHash),
      Array.from(intentManifestHash),
      Array.from(riskScoreCommitment),
      referrerAuthority.publicKey,
      visitorAuthority.publicKey,
    )
      .accounts({
        growthCampaign,
        merchantConfig,
        rewardEscrow,
        rewardVault: rewardVault.address,
        causalReceipt: replayReceipt,
        nullifierRecord,
        claimPass: replayClaimPass,
        terminalDevice,
        terminalAuthority: terminalAuthority.publicKey,
        visitorAuthority: visitorAuthority.publicKey,
        merchantAuthority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      }), [terminalAuthority, visitorAuthority]), [replayReceipt, nullifierRecord, replayClaimPass]));
  }

  if (options.attackCheck) {
    replayChecks.push(await expectRejected('wrong merchant authority cannot settle receipt', () => sendProgramInstruction(connection, walletInfo.keypair, methods.settleReceiptReward()
      .accounts({
        growthCampaign,
        merchantConfig,
        rewardEscrow,
        rewardVault: rewardVault.address,
        causalReceipt,
        settlementRecord,
        referrerRewardAccount: referrerRewardAccount.address,
        visitorRewardAccount: visitorRewardAccount.address,
        rewardMint,
        merchantAuthority: attackerAuthority.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      }), [attackerAuthority]), [settlementRecord]));
    replayChecks.push(await expectRejected('wrong beneficiary token account cannot receive settlement', () => sendProgramInstruction(connection, walletInfo.keypair, methods.settleReceiptReward()
      .accounts({
        growthCampaign,
        merchantConfig,
        rewardEscrow,
        rewardVault: rewardVault.address,
        causalReceipt,
        settlementRecord,
        referrerRewardAccount: attackerRewardAccount.address,
        visitorRewardAccount: visitorRewardAccount.address,
        rewardMint,
        merchantAuthority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })), [settlementRecord, attackerRewardAccount.address]));
  }

  if (options.attackCheck) {
    replayChecks.push(await expectRejected('wrong reward vault rejected', () => sendProgramInstruction(connection, walletInfo.keypair, methods.settleReceiptReward()
      .accounts({
        growthCampaign,
        merchantConfig,
        rewardEscrow,
        rewardVault: attackerRewardAccount.address,
        causalReceipt,
        settlementRecord,
        referrerRewardAccount: referrerRewardAccount.address,
        visitorRewardAccount: visitorRewardAccount.address,
        rewardMint,
        merchantAuthority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })), [settlementRecord, attackerRewardAccount.address]));
  }

  const tokenBalancesBeforeSettlement = {
    merchantRewardAccount: await tokenAmount(connection, merchantRewardAccount.address),
    rewardVault: await tokenAmount(connection, rewardVault.address),
    referrerRewardAccount: await tokenAmount(connection, referrerRewardAccount.address),
    visitorRewardAccount: await tokenAmount(connection, visitorRewardAccount.address),
  };

  const settleReceiptReward = await sendProgramInstruction(connection, walletInfo.keypair, methods.settleReceiptReward()
    .accounts({
      growthCampaign,
      merchantConfig,
      rewardEscrow,
      rewardVault: rewardVault.address,
      causalReceipt,
      settlementRecord,
      referrerRewardAccount: referrerRewardAccount.address,
      visitorRewardAccount: visitorRewardAccount.address,
      rewardMint,
      merchantAuthority: wallet.publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    }));

  if (options.replayCheck) {
    replayChecks.push(await expectRejected('duplicate receipt settlement', () => sendProgramInstruction(connection, walletInfo.keypair, methods.settleReceiptReward()
      .accounts({
        growthCampaign,
        merchantConfig,
        rewardEscrow,
        rewardVault: rewardVault.address,
        causalReceipt,
        settlementRecord,
        referrerRewardAccount: referrerRewardAccount.address,
        visitorRewardAccount: visitorRewardAccount.address,
        rewardMint,
        merchantAuthority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })), [settlementRecord]));
  }

  const tokenBalancesAfter = {
    merchantRewardAccount: await tokenAmount(connection, merchantRewardAccount.address),
    rewardVault: await tokenAmount(connection, rewardVault.address),
    referrerRewardAccount: await tokenAmount(connection, referrerRewardAccount.address),
    visitorRewardAccount: await tokenAmount(connection, visitorRewardAccount.address),
  };
  const tokenBalancesAfterSettlement = tokenBalancesAfter;

  let closeGrowthBounty: string | null = null;
  let tokenBalancesAfterClose: Record<string, string> | null = null;
  if (options.closeCheck) {
    const campaignExpiresAtMs = (Math.floor(Date.now() / 1000) + options.campaignDurationSeconds + 1) * 1000;
    const waitMs = Math.max(0, campaignExpiresAtMs - Date.now());
    if (waitMs > 0) {
      console.error(`waiting ${waitMs}ms for campaign expiry before close check`);
      await sleep(waitMs);
    }

    closeGrowthBounty = await sendProgramInstruction(connection, walletInfo.keypair, methods.closeGrowthBounty()
      .accounts({
        growthCampaign,
        rewardEscrow,
        rewardVault: rewardVault.address,
        merchantRewardAccount: merchantRewardAccount.address,
        rewardMint,
        merchantAuthority: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      }));

    tokenBalancesAfterClose = {
      merchantRewardAccount: await tokenAmount(connection, merchantRewardAccount.address),
      rewardVault: await tokenAmountOrClosed(connection, rewardVault.address),
      referrerRewardAccount: await tokenAmount(connection, referrerRewardAccount.address),
      visitorRewardAccount: await tokenAmount(connection, visitorRewardAccount.address),
    };
  }

  const accounts = {
    merchantConfig: normalize(await fetchAccount(program, 'causalMerchantConfig', merchantConfig)),
    growthCampaign: normalize(await fetchAccount(program, 'growthCampaign', growthCampaign)),
    rewardEscrow: normalize(await fetchAccount(program, 'rewardEscrow', rewardEscrow)),
    causalReceipt: normalize(await fetchAccount(program, 'causalReceipt', causalReceipt)),
    nullifierRecord: normalize(await fetchAccount(program, 'nullifierRecord', nullifierRecord)),
    settlementRecord: normalize(await fetchAccount(program, 'settlementRecord', settlementRecord)),
  };

  const effectAccounts = {
    growthCampaign: growthCampaign.toBase58(),
    rewardEscrow: rewardEscrow.toBase58(),
    causalReceipt: causalReceipt.toBase58(),
    nullifierRecord: nullifierRecord.toBase58(),
  };
  const effectCheckedAt = new Date().toISOString();
  const effectCheckNow = new Date(effectCheckedAt);
  const effectChecks = [
    {
      label: 'Valid receipt effect',
      ...validateCausalReceiptEffect({
        manifest: intentManifest,
        action: 'record_causal_receipt',
        accounts: effectAccounts,
        rewardAmount: Number(options.rewardPerVisit.toString()),
        referrerSplitBps: 8_000,
        referrerBeneficiary: referrerAuthority.publicKey.toBase58(),
        visitorBeneficiary: visitorAuthority.publicKey.toBase58(),
        now: effectCheckNow,
      }),
    },
    {
      label: 'Wrong referrer beneficiary',
      ...validateCausalReceiptEffect({
        manifest: intentManifest,
        action: 'record_causal_receipt',
        accounts: effectAccounts,
        rewardAmount: Number(options.rewardPerVisit.toString()),
        referrerSplitBps: 8_000,
        referrerBeneficiary: attackerAuthority.publicKey.toBase58(),
        visitorBeneficiary: visitorAuthority.publicKey.toBase58(),
        now: effectCheckNow,
      }),
    },
    {
      label: 'Inflated reward',
      ...validateCausalReceiptEffect({
        manifest: intentManifest,
        action: 'record_causal_receipt',
        accounts: effectAccounts,
        rewardAmount: Number(options.rewardPerVisit.toString()) * 10,
        referrerSplitBps: 8_000,
        referrerBeneficiary: referrerAuthority.publicKey.toBase58(),
        visitorBeneficiary: visitorAuthority.publicKey.toBase58(),
        now: effectCheckNow,
      }),
    },
    {
      label: 'Forbidden instruction',
      ...validateCausalReceiptEffect({
        manifest: intentManifest,
        action: 'set_authority',
        accounts: effectAccounts,
        rewardAmount: Number(options.rewardPerVisit.toString()),
        referrerSplitBps: 9_500,
        referrerBeneficiary: referrerAuthority.publicKey.toBase58(),
        visitorBeneficiary: visitorAuthority.publicKey.toBase58(),
        now: effectCheckNow,
      }),
    },
    {
      label: 'Inflated split bps',
      ...validateCausalReceiptEffect({
        manifest: intentManifest,
        action: 'record_causal_receipt',
        accounts: effectAccounts,
        rewardAmount: Number(options.rewardPerVisit.toString()),
        referrerSplitBps: 9_500,
        referrerBeneficiary: referrerAuthority.publicKey.toBase58(),
        visitorBeneficiary: visitorAuthority.publicKey.toBase58(),
        now: effectCheckNow,
      }),
    },
  ];

  const replayByLabel = (needle: string) => replayChecks.find((item: any) => String(item?.label ?? '').toLowerCase().includes(needle.toLowerCase())) as any;
  const effectByLabel = (needle: string) => effectChecks.find((item: any) => String(item?.label ?? '').toLowerCase().includes(needle.toLowerCase())) as any;
  const attackEvidence: AttackEvidence[] = [
    replayEvidence('merchant-only-receipt', 'Merchant tries to fake receipt alone', 'record_causal_receipt', replayByLabel('merchant-only'), 'MissingRequiredSignature'),
    replayEvidence('wrong-terminal-signer', 'Wrong terminal signer', 'record_causal_receipt', replayByLabel('wrong terminal signer'), 'InvalidTerminalAuthority'),
    replayEvidence('different-merchant-terminal', 'Enrolled terminal from different merchant', 'record_causal_receipt', replayByLabel('different merchant terminal'), 'InvalidTerminalDevice'),
    replayEvidence('terminal-account-signer-mismatch', 'Correct terminal account with wrong signer', 'record_causal_receipt', replayByLabel('enrolled terminal account'), 'InvalidTerminalAuthority'),
    replayEvidence('visitor-signer-mismatch', 'Visitor signer mismatch', 'record_causal_receipt', replayByLabel('visitor signer does not match'), 'InvalidVisitorAuthority'),
    replayEvidence('visitor-beneficiary-mismatch', 'Visitor beneficiary mismatch', 'record_causal_receipt', replayByLabel('visitor beneficiary'), 'InvalidVisitorAuthority'),
    replayEvidence('claim-pass-reused', 'Claim pass already recorded', 'record_causal_receipt', replayByLabel('claim pass already'), 'ClaimPassAlreadyRecorded'),
    replayEvidence('claim-pass-campaign-mismatch', 'Claim pass campaign mismatch', 'record_causal_receipt', replayByLabel('claim pass campaign'), 'InvalidClaimPass'),
    replayEvidence('claim-pass-depth-exceeds-max-depth', 'Claim pass depth exceeds campaign max depth', 'issue_claim_pass', replayByLabel('depth exceeds'), 'MaxDepthExceeded'),
    replayEvidence('duplicate-nullifier', 'Duplicate receipt nullifier', 'record_causal_receipt', replayByLabel('duplicate campaign nullifier'), 'AccountAlreadyInitialized'),
    intentEvidence('inflated-reward-amount', 'Inflated reward amount', effectByLabel('Inflated reward'), 'RewardAmountExceedsManifest'),
    intentEvidence('inflated-split-bps', 'Inflated referrer split bps', effectByLabel('Inflated split bps'), 'IntentMismatch'),
    replayEvidence('wrong-reward-mint', 'Wrong reward mint', 'fund_growth_bounty', replayByLabel('wrong reward mint'), 'InvalidRewardMint'),
    replayEvidence('wrong-reward-vault', 'Wrong reward vault', 'settle_receipt_reward', replayByLabel('wrong reward vault'), 'ConstraintTokenOwner'),
    replayEvidence('settlement-replay', 'Settlement replay', 'settle_receipt_reward', replayByLabel('duplicate receipt settlement'), 'AccountAlreadyInitialized'),
    replayEvidence('paused-or-expired-campaign', 'Paused or expired campaign receipt attempt', 'record_causal_receipt', replayByLabel('paused') ?? replayByLabel('expired campaign'), 'CampaignInactive'),
  ];

  if (options.attackCheck) {
    const incompleteAttackEvidence = attackEvidence.filter((entry) => (
      entry.observed !== 'rejected' ||
      entry.expectedErrorMatched !== true ||
      entry.accountsMutated !== false ||
      entry.accountsMutationVerified !== true ||
      !['program_rejection', 'intent_validator_rejection'].includes(entry.failureKind)
    ));
    if (attackEvidence.length !== 16 || incompleteAttackEvidence.length > 0) {
      throw new Error(
        `Fraud gauntlet incomplete: ${attackEvidence.length}/16 cases emitted; ${incompleteAttackEvidence.length} cases not rejected: ${incompleteAttackEvidence
          .map((entry) => `${entry.id}:${entry.observed}:${entry.failureKind}:${String(entry.actualError).slice(0, 160)}`)
          .join(', ')}`,
      );
    }
  }

  const verifierCommand = cluster === 'devnet'
    ? 'npm run devnet:verify-receipt -- --output tmp/devnet-causal-commerce-verifier.json'
    : `npm run localnet:verify-receipt -- --manifest ${options.outputPath ?? DEFAULT_OUTPUT_PATH}`;

  const manifest = {
    kind: `viral-sync-${cluster}-causal-commerce`,
    cluster,
    proofStatus: 'verified',
    proofStatusNote:
      'Counter-attested devnet proof generated with terminal, visitor, claim-pass, settlement, nullifier, and fraud-gauntlet evidence.',
    generatedAt: new Date().toISOString(),
    effectCheckedAt,
    rpcUrl: options.rpcUrl,
    programId: PROGRAM_ID.toBase58(),
    wallet: wallet.publicKey.toBase58(),
    initialBalanceSol: balance / LAMPORTS_PER_SOL,
    inputs: {
      orgId: options.orgId,
      campaignId: options.campaignId,
      receiptId: options.receiptId,
      rewardPerVisit: options.rewardPerVisit.toString(),
      maxRedemptions: options.maxRedemptions,
      maxDepth: options.maxDepth,
      campaignDurationSeconds: options.campaignDurationSeconds,
      fundAmount: options.fundAmount.toString(),
      amountToFund: amountToFund.toString(),
      alreadyFunded: alreadyFunded.toString(),
      remainingCapacity: remainingCapacity.toString(),
      maxCapacity: maxCapacity.toString(),
      replayCheck: options.replayCheck,
      attackCheck: options.attackCheck,
      closeCheck: options.closeCheck,
    },
    hashes: {
      orgIdHash: orgIdHash.toString('hex'),
      campaignIdHash: campaignIdHash.toString('hex'),
      receiptIdHash: receiptIdHash.toString('hex'),
      claimerNullifierHash: claimerNullifierHash.toString('hex'),
      inviteHash: inviteHash.toString('hex'),
      visitAttestationHash: visitAttestationHash.toString('hex'),
      intentManifestHash: intentManifestHash.toString('hex'),
      splitRulesHash: splitRulesHash.toString('hex'),
      fraudPolicyHash: fraudPolicyHash.toString('hex'),
    },
    intentManifest,
    intentManifestHash: intentManifestHash.toString('hex'),
    pdas: {
      merchantConfig: merchantConfig.toBase58(),
      merchantConfigBump,
      growthCampaign: growthCampaign.toBase58(),
      growthCampaignBump,
      terminalDevice: terminalDevice.toBase58(),
      terminalDeviceBump,
      terminalAuthority: terminalAuthority.publicKey.toBase58(),
      claimPass: claimPass.toBase58(),
      claimPassBump,
      claimHash: claimHash.toString('hex'),
      lineageProofHash: lineageProofHash.toString('hex'),
      lineageGeneration: 1,
      rewardMint: rewardMint.toBase58(),
      merchantRewardAccount: merchantRewardAccount.address.toBase58(),
      rewardEscrow: rewardEscrow.toBase58(),
      rewardEscrowBump,
      rewardVault: rewardVault.address.toBase58(),
      causalReceipt: causalReceipt.toBase58(),
      causalReceiptBump,
      nullifierRecord: nullifierRecord.toBase58(),
      nullifierRecordBump,
      settlementRecord: settlementRecord.toBase58(),
      settlementRecordBump,
      referrerAuthority: referrerAuthority.publicKey.toBase58(),
      referrerRewardAccount: referrerRewardAccount.address.toBase58(),
      visitorAuthority: visitorAuthority.publicKey.toBase58(),
      visitorRewardAccount: visitorRewardAccount.address.toBase58(),
      attackerAuthority: attackerAuthority.publicKey.toBase58(),
      attackerRewardAccount: attackerRewardAccount.address.toBase58(),
    },
    signatures: {
      createRewardMint: createMintSignature,
      createMerchantRewardAccount: merchantRewardAccount.signature,
      createRewardVault: rewardVault.signature,
      createReferrerRewardAccount: referrerRewardAccount.signature,
      createVisitorRewardAccount: visitorRewardAccount.signature,
      fundAttackerAuthority,
      mintRewardTokens: mintRewardTokensSignature,
      registerMerchant,
      enrollTerminalDevice,
      createGrowthCampaign,
      issueClaimPass,
      issueReplayClaimPass,
      fundGrowthBounty,
      recordCausalReceipt,
      settleReceiptReward,
      closeGrowthBounty,
    },
    // Compatibility alias for live app confirmation paths that expect proof.transactions.
    transactions: {
      recordCausalReceipt,
      settleReceiptReward,
    },
    explorerLinks: {
      transactions: {
        createRewardMint: explorerTx(createMintSignature, cluster),
        createMerchantRewardAccount: explorerTx(merchantRewardAccount.signature, cluster),
        createRewardVault: explorerTx(rewardVault.signature, cluster),
        createReferrerRewardAccount: explorerTx(referrerRewardAccount.signature, cluster),
        createVisitorRewardAccount: explorerTx(visitorRewardAccount.signature, cluster),
        mintRewardTokens: explorerTx(mintRewardTokensSignature, cluster),
        registerMerchant: explorerTx(registerMerchant.signature, cluster),
        enrollTerminalDevice: explorerTx(enrollTerminalDevice, cluster),
        createGrowthCampaign: explorerTx(createGrowthCampaign.signature, cluster),
        issueClaimPass: explorerTx(issueClaimPass, cluster),
        fundGrowthBounty: explorerTx(fundGrowthBounty, cluster),
        recordCausalReceipt: explorerTx(recordCausalReceipt, cluster),
        settleReceiptReward: explorerTx(settleReceiptReward, cluster),
        closeGrowthBounty: explorerTx(closeGrowthBounty, cluster),
      },
      accounts: {
        merchantConfig: explorerAddress(merchantConfig, cluster),
        growthCampaign: explorerAddress(growthCampaign, cluster),
        rewardMint: explorerAddress(rewardMint, cluster),
        terminalDevice: explorerAddress(terminalDevice, cluster),
        claimPass: explorerAddress(claimPass, cluster),
        rewardEscrow: explorerAddress(rewardEscrow, cluster),
        rewardVault: explorerAddress(rewardVault.address, cluster),
        causalReceipt: explorerAddress(causalReceipt, cluster),
        nullifierRecord: explorerAddress(nullifierRecord, cluster),
        settlementRecord: explorerAddress(settlementRecord, cluster),
      },
    },
    attestationModel: 'merchant_terminal_visitor_signed',
    proofLevel: 'counter_attested',
    terminalVerified: true,
    visitorVerified: true,
    lineageVerified: true,
    settlementVerified: true,
    nullifierVerified: true,
    ...proofHashes(),
    attackEvidence,
    replayChecks,
    effectChecks,
    tokenBalances: {
      before: tokenBalancesBefore,
      beforeSettlement: tokenBalancesBeforeSettlement,
      afterSettlement: tokenBalancesAfterSettlement,
      after: tokenBalancesAfter,
      afterClose: tokenBalancesAfterClose,
    },
    accounts,
    verifierCommand,
    limitation: `${cluster} proof path verifies counter attestation (merchant + enrolled terminal + visitor), claim-pass account lineage, SPL custody, nullifier replay rejection, payout, and intent manifest hash commitment. It does not claim GPS or independent physical-world oracle proof.`,
  };

  const resolvedOutput = options.outputPath ? writeManifest(options.outputPath, manifest) : undefined;
  console.log(JSON.stringify({ ...manifest, outputPath: resolvedOutput }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
