import * as anchor from '@coral-xyz/anchor';
import { createHash } from 'crypto';
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
  rewardMint?: PublicKey;
  rewardPerVisit: anchor.BN;
  maxRedemptions: number;
  maxDepth: number;
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
};

type ProgramMethods = {
  registerMerchant: (orgIdHash: number[]) => {
    accounts: (accounts: {
      merchantConfig: PublicKey;
      merchantAuthority: PublicKey;
      systemProgram: PublicKey;
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
    riskScoreCommitment: number[],
    referrerBeneficiary: PublicKey,
    visitorBeneficiary: PublicKey,
  ) => {
    accounts: (accounts: {
      growthCampaign: PublicKey;
      rewardEscrow: PublicKey;
      rewardVault: PublicKey;
      causalReceipt: PublicKey;
      nullifierRecord: PublicKey;
      merchantAuthority: PublicKey;
      systemProgram: PublicKey;
    }) => RpcBuilder;
  };
  settleReceiptReward: () => {
    accounts: (accounts: {
      growthCampaign: PublicKey;
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
const PROGRAM_ID = new PublicKey('8D5chmUeb97oxykaBv7CTFpZnBotVAMnqYAvyk6qcQz9');
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
  --org <id>                  Merchant org id to hash. Defaults to a unique localnet id.
  --campaign <id>             Campaign id to hash. Defaults to a unique localnet id.
  --receipt <id>              Receipt id to hash. Defaults to a unique localnet id.
  --reward-mint <pubkey>      Existing SPL Token mint. If omitted, the script creates a localnet mint.
  --reward-per-visit <units>  Reward units reserved per verified visit. Default: 1000
  --max-redemptions <count>   Campaign cap. Default: 10
  --max-depth <count>         Referral depth cap. Default: 2
  --fund-amount <units>       Funded state amount. Default: reward-per-visit * max-redemptions
  --airdrop-sol <number>      Request localnet SOL if balance is low. Default: 2
  --replay-check              Require duplicate nullifier and duplicate settlement attempts to fail.
  --attack-check              Require wrong merchant and wrong beneficiary settlement attacks to fail.
  --close-check               Close the bounty, reclaim unused vault tokens, and close the vault ATA.
  --output <path>             Write a JSON manifest. Default: ${DEFAULT_OUTPUT_PATH}
`;
}

function argValue(args: string[], name: string) {
  const index = args.indexOf(name);
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

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage());
    process.exit(0);
  }

  const rewardPerVisit = new anchor.BN(parsePositiveInteger(argValue(args, '--reward-per-visit') ?? '1000', '--reward-per-visit'));
  const maxRedemptions = parsePositiveInteger(argValue(args, '--max-redemptions') ?? '10', '--max-redemptions');
  const maxDepth = parsePositiveInteger(argValue(args, '--max-depth') ?? '2', '--max-depth');
  const fundAmount = new anchor.BN(argValue(args, '--fund-amount') ?? rewardPerVisit.mul(new anchor.BN(maxRedemptions)).toString());
  if (fundAmount.lte(new anchor.BN(0))) {
    throw new Error('--fund-amount must be positive.');
  }

  const rewardMintRaw = argValue(args, '--reward-mint');

  return {
    rpcUrl: argValue(args, '--rpc') ?? process.env.LOCALNET_RPC_URL ?? DEFAULT_RPC_URL,
    walletPath: argValue(args, '--wallet') ?? process.env.ANCHOR_WALLET ?? process.env.SOLANA_WALLET,
    orgId: argValue(args, '--org') ?? `viral-sync-localnet-org-${Date.now().toString(36)}`,
    campaignId: argValue(args, '--campaign') ?? `viral-sync-localnet-campaign-${Date.now().toString(36)}`,
    receiptId: argValue(args, '--receipt') ?? `viral-sync-localnet-receipt-${Date.now().toString(36)}`,
    rewardMint: rewardMintRaw ? new PublicKey(rewardMintRaw) : undefined,
    rewardPerVisit,
    maxRedemptions,
    maxDepth,
    fundAmount,
    airdropSol: parseNonNegativeNumber(argValue(args, '--airdrop-sol') ?? '2', '--airdrop-sol'),
    replayCheck: args.includes('--replay-check'),
    attackCheck: args.includes('--attack-check'),
    closeCheck: args.includes('--close-check'),
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

async function maybeRegisterMerchant(
  program: anchor.Program,
  methods: ProgramMethods,
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
  rewardMint: PublicKey;
  campaignIdHash: Buffer;
  rewardPerVisit: anchor.BN;
  maxRedemptions: number;
  maxDepth: number;
  referrerSplitBps: number;
  splitRulesHash: Buffer;
  fraudPolicyHash: Buffer;
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
      new anchor.BN(nowSeconds + 60 * 60 * 24 * 30),
    )
      .accounts({
        merchantConfig: params.merchantConfig,
        growthCampaign: params.growthCampaign,
        merchantAuthority: params.merchantAuthority,
        rewardMint: params.rewardMint,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    return { signature, reused: false };
  }
}

async function expectRejected(label: string, action: () => Promise<unknown>) {
  try {
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] : String(error);
    return { label, rejected: true, message };
  }

  throw new Error(`${label} unexpectedly succeeded.`);
}

function writeManifest(outputPath: string, manifest: Record<string, unknown>) {
  const resolved = path.resolve(outputPath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(manifest, null, 2)}\n`);
  return resolved;
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
  const program = new anchor.Program(loadIdl(), provider);
  const methods = program.methods as unknown as ProgramMethods;

  await ensureProgramDeployed(connection);
  const balance = await ensureLocalnetBalance(connection, wallet.publicKey, options.airdropSol);

  const orgIdHash = hashBytes('org', options.orgId);
  const campaignIdHash = hashBytes('campaign', options.campaignId);
  const receiptIdHash = hashBytes('receipt', options.receiptId);
  const parentReceiptIdHash = zeroHash();
  const referrerCommitment = hashBytes('referrer', `${options.campaignId}:referrer`);
  const claimerNullifierHash = hashBytes('claimer-nullifier', `${options.campaignId}:visitor`);
  const inviteHash = hashBytes('invite', `${options.campaignId}:invite`);
  const visitAttestationHash = hashBytes('visit-attestation', `${options.receiptId}:staff-and-visitor`);
  const riskScoreCommitment = hashBytes('risk-score', `${options.receiptId}:low`);
  const splitRulesHash = hashBytes('split-rules', 'referrer-80-visitor-20');
  const fraudPolicyHash = hashBytes('fraud-policy', 'single-nullifier-staff-challenge-v1');

  const [merchantConfig, merchantConfigBump] = findPda('causal_merchant', [wallet.publicKey.toBuffer(), orgIdHash]);
  const [growthCampaign, growthCampaignBump] = findPda('growth_campaign', [merchantConfig.toBuffer(), campaignIdHash]);

  let rewardMint = options.rewardMint;
  let createMintSignature: string | null = null;
  if (!rewardMint) {
    const mint = await createLocalnetRewardMint(connection, walletInfo.keypair);
    rewardMint = mint.publicKey;
    createMintSignature = mint.signature;
  }

  const [rewardEscrow, rewardEscrowBump] = findPda('reward_escrow', [growthCampaign.toBuffer(), rewardMint.toBuffer()]);
  const [causalReceipt, causalReceiptBump] = findPda('causal_receipt', [growthCampaign.toBuffer(), receiptIdHash]);
  const [nullifierRecord, nullifierRecordBump] = findPda('campaign_nullifier', [growthCampaign.toBuffer(), claimerNullifierHash]);
  const [settlementRecord, settlementRecordBump] = findPda('settlement', [causalReceipt.toBuffer()]);
  const referrerAuthority = Keypair.generate();
  const visitorAuthority = Keypair.generate();
  const attackerAuthority = Keypair.generate();
  const merchantRewardAccount = await ensureAssociatedTokenAccount(connection, walletInfo.keypair, wallet.publicKey, rewardMint);
  const rewardVault = await ensureAssociatedTokenAccount(connection, walletInfo.keypair, rewardEscrow, rewardMint);
  const referrerRewardAccount = await ensureAssociatedTokenAccount(connection, walletInfo.keypair, referrerAuthority.publicKey, rewardMint);
  const visitorRewardAccount = await ensureAssociatedTokenAccount(connection, walletInfo.keypair, visitorAuthority.publicKey, rewardMint);
  const attackerRewardAccount = await ensureAssociatedTokenAccount(connection, walletInfo.keypair, attackerAuthority.publicKey, rewardMint);
  const mintRewardTokensSignature = await mintRewardTokens(
    connection,
    walletInfo.keypair,
    rewardMint,
    merchantRewardAccount.address,
    options.fundAmount,
  );
  const tokenBalancesBefore = {
    merchantRewardAccount: await tokenAmount(connection, merchantRewardAccount.address),
    rewardVault: await tokenAmount(connection, rewardVault.address),
    referrerRewardAccount: await tokenAmount(connection, referrerRewardAccount.address),
    visitorRewardAccount: await tokenAmount(connection, visitorRewardAccount.address),
  };

  const registerMerchant = await maybeRegisterMerchant(
    program,
    methods,
    merchantConfig,
    wallet.publicKey,
    orgIdHash,
  );

  const createGrowthCampaign = await maybeCreateCampaign({
    program,
    methods,
    merchantConfig,
    growthCampaign,
    merchantAuthority: wallet.publicKey,
    rewardMint,
    campaignIdHash,
    rewardPerVisit: options.rewardPerVisit,
    maxRedemptions: options.maxRedemptions,
    maxDepth: options.maxDepth,
    referrerSplitBps: 8_000,
    splitRulesHash,
    fraudPolicyHash,
  });

  const fundGrowthBounty = await methods.fundGrowthBounty(options.fundAmount)
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
    })
    .rpc();

  const recordCausalReceipt = await methods.recordCausalReceipt(
    Array.from(receiptIdHash),
    Array.from(parentReceiptIdHash),
    Array.from(referrerCommitment),
    Array.from(claimerNullifierHash),
    Array.from(inviteHash),
    Array.from(visitAttestationHash),
    Array.from(riskScoreCommitment),
    referrerAuthority.publicKey,
    visitorAuthority.publicKey,
  )
    .accounts({
      growthCampaign,
      rewardEscrow,
      rewardVault: rewardVault.address,
      causalReceipt,
      nullifierRecord,
      merchantAuthority: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const replayChecks: unknown[] = [];
  if (options.replayCheck || options.attackCheck) {
    const replayReceiptIdHash = hashBytes('receipt', `${options.receiptId}:replay`);
    const [replayReceipt] = findPda('causal_receipt', [growthCampaign.toBuffer(), replayReceiptIdHash]);
    replayChecks.push(await expectRejected('duplicate campaign nullifier', () => methods.recordCausalReceipt(
      Array.from(replayReceiptIdHash),
      Array.from(parentReceiptIdHash),
      Array.from(referrerCommitment),
      Array.from(claimerNullifierHash),
      Array.from(inviteHash),
      Array.from(visitAttestationHash),
      Array.from(riskScoreCommitment),
      referrerAuthority.publicKey,
      visitorAuthority.publicKey,
    )
      .accounts({
        growthCampaign,
        rewardEscrow,
        rewardVault: rewardVault.address,
        causalReceipt: replayReceipt,
        nullifierRecord,
        merchantAuthority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()));
  }

  if (options.attackCheck) {
    replayChecks.push(await expectRejected('wrong merchant authority cannot settle receipt', () => methods.settleReceiptReward()
      .accounts({
        growthCampaign,
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
      })
      .signers([attackerAuthority])
      .rpc()));
    replayChecks.push(await expectRejected('wrong beneficiary token account cannot receive settlement', () => methods.settleReceiptReward()
      .accounts({
        growthCampaign,
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
      })
      .rpc()));
  }

  const settleReceiptReward = await methods.settleReceiptReward()
    .accounts({
      growthCampaign,
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
    })
    .rpc();

  if (options.replayCheck) {
    replayChecks.push(await expectRejected('duplicate receipt settlement', () => methods.settleReceiptReward()
      .accounts({
        growthCampaign,
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
      })
      .rpc()));
  }

  const tokenBalancesAfter = {
    merchantRewardAccount: await tokenAmount(connection, merchantRewardAccount.address),
    rewardVault: await tokenAmount(connection, rewardVault.address),
    referrerRewardAccount: await tokenAmount(connection, referrerRewardAccount.address),
    visitorRewardAccount: await tokenAmount(connection, visitorRewardAccount.address),
  };

  let closeGrowthBounty: string | null = null;
  let tokenBalancesAfterClose: Record<string, string> | null = null;
  if (options.closeCheck) {
    closeGrowthBounty = await methods.closeGrowthBounty()
      .accounts({
        growthCampaign,
        rewardEscrow,
        rewardVault: rewardVault.address,
        merchantRewardAccount: merchantRewardAccount.address,
        rewardMint,
        merchantAuthority: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

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

  const manifest = {
    kind: 'viral-sync-localnet-causal-commerce',
    rpcUrl: options.rpcUrl,
    programId: PROGRAM_ID.toBase58(),
    wallet: wallet.publicKey.toBase58(),
    walletSource: walletInfo.source,
    initialBalanceSol: balance / LAMPORTS_PER_SOL,
    inputs: {
      orgId: options.orgId,
      campaignId: options.campaignId,
      receiptId: options.receiptId,
      rewardPerVisit: options.rewardPerVisit.toString(),
      maxRedemptions: options.maxRedemptions,
      maxDepth: options.maxDepth,
      fundAmount: options.fundAmount.toString(),
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
      splitRulesHash: splitRulesHash.toString('hex'),
      fraudPolicyHash: fraudPolicyHash.toString('hex'),
    },
    pdas: {
      merchantConfig: merchantConfig.toBase58(),
      merchantConfigBump,
      growthCampaign: growthCampaign.toBase58(),
      growthCampaignBump,
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
      mintRewardTokens: mintRewardTokensSignature,
      registerMerchant,
      createGrowthCampaign,
      fundGrowthBounty,
      recordCausalReceipt,
      settleReceiptReward,
      closeGrowthBounty,
    },
    replayChecks,
    tokenBalances: {
      before: tokenBalancesBefore,
      after: tokenBalancesAfter,
      afterClose: tokenBalancesAfterClose,
    },
    accounts,
    verifierCommand: `npm run localnet:verify-receipt -- --manifest ${options.outputPath ?? DEFAULT_OUTPUT_PATH}`,
    limitation: 'localnet proves SPL Token custody, payout, vault reclaim, and vault account close; production mainnet still requires external audit and funded relayer operations.',
  };

  const resolvedOutput = options.outputPath ? writeManifest(options.outputPath, manifest) : undefined;
  console.log(JSON.stringify({ ...manifest, outputPath: resolvedOutput }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
