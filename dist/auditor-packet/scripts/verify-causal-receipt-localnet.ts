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
  hashes?: {
    intentManifestHash?: string;
    visitAttestationHash?: string;
    inviteHash?: string;
    claimerNullifierHash?: string;
    receiptIdHash?: string;
    lineageProofHash?: string;
  };
  pdas?: {
    causalReceipt?: string;
    rewardVault?: string;
    rewardMint?: string;
    merchantRewardAccount?: string;
    referrerAuthority?: string;
    terminalDevice?: string;
    terminalAuthority?: string;
    visitorAuthority?: string;
    claimPass?: string;
    settlementRecord?: string;
    nullifierRecord?: string;
    referrerRewardAccount?: string;
    visitorRewardAccount?: string;
  };
  tokenBalances?: {
    beforeSettlement?: {
      merchantRewardAccount?: string;
      referrerRewardAccount?: string;
      visitorRewardAccount?: string;
      treasuryRewardAccount?: string;
      rewardVault?: string;
    };
    afterSettlement?: {
      merchantRewardAccount?: string;
      referrerRewardAccount?: string;
      visitorRewardAccount?: string;
      treasuryRewardAccount?: string;
      rewardVault?: string;
    };
    afterClose?: {
      merchantRewardAccount?: string;
      rewardVault?: string;
    } | null;
  };
  attackEvidence?: Array<Record<string, unknown>>;
  childLineageProof?: {
    parentReceipt?: string;
    childReceipt?: string;
    childClaimPass?: string;
    parentReceiptIdHash?: string;
    childReceiptIdHash?: string;
    childLineageProofHash?: string;
    onChainParentReceiptVerified?: boolean;
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
const DEFAULT_PROGRAM_ID = new PublicKey('AeKT1B58Qi9rBtrtnMe11o4eXbVwHweKxGFNS5X3Vv46');
const SPL_TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

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

async function parsedTokenAccount(connection: Connection, tokenAccount: PublicKey) {
  const info = await connection.getParsedAccountInfo(tokenAccount, 'confirmed');
  if (!info.value) {
    throw new Error(`Token account ${tokenAccount.toBase58()} does not exist.`);
  }
  const parsed = (info.value.data as any)?.parsed?.info;
  if (!parsed?.mint || !parsed?.owner || parsed?.tokenAmount?.amount === undefined) {
    throw new Error(`Token account ${tokenAccount.toBase58()} is not a parsed SPL token account.`);
  }
  return {
    programOwner: info.value.owner,
    mint: new PublicKey(parsed.mint),
    owner: new PublicKey(parsed.owner),
    amount: new anchor.BN(parsed.tokenAmount.amount),
  };
}

async function tokenAccountClosed(connection: Connection, tokenAccount: PublicKey) {
  return (await connection.getAccountInfo(tokenAccount)) === null;
}

function findPda(seedPrefix: string, seeds: Buffer[], programId: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from(seedPrefix), ...seeds], programId);
}

function hashArrayToHex(value: number[] | Uint8Array) {
  return Buffer.from(value).toString('hex');
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
  const programId = manifest?.programId ? new PublicKey(manifest.programId) : DEFAULT_PROGRAM_ID;
  const causalReceiptPda = options.receipt;

  type Receipt = {
    campaign: PublicKey;
    merchantConfig: PublicKey;
    receiptIdHash: number[];
    claimerNullifierHash: number[];
    rewardAmount: anchor.BN;
    settledAmount: anchor.BN;
    intentManifestHash?: number[];
    visitAttestationHash?: number[];
    inviteHash?: number[];
    lineageProofHash?: number[];
    parentReceiptIdHash?: number[];
    status: unknown;
    settledAt: anchor.BN;
    terminalDevice?: PublicKey;
    terminalAuthority?: PublicKey;
    visitorAuthority?: PublicKey;
    claimPass?: PublicKey;
    lineageGeneration?: number;
    attestationModel?: unknown;
  };
  type Campaign = {
    merchantAuthority?: PublicKey;
    merchantConfig?: PublicKey;
    rewardMint: PublicKey;
    rewardPerVerifiedVisit: anchor.BN;
    totalSettled: anchor.BN;
    maxDepth?: number;
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
    protocolFee?: anchor.BN;
  };
  type Nullifier = {
    campaign: PublicKey;
    firstReceipt: PublicKey;
  };
  type ClaimPass = {
    campaign: PublicKey;
    visitorAuthority: PublicKey;
    status: unknown;
    firstReceipt: PublicKey;
    depth: number;
    lineageProofHash: number[];
    referrerReceipt?: PublicKey;
  };
  type TerminalDevice = {
    merchantConfig: PublicKey;
    merchantAuthority: PublicKey;
    terminalAuthority: PublicKey;
    status: unknown;
  };

  const receipt = await fetchAccount<Receipt>(program, 'causalReceipt', causalReceiptPda);
  const campaign = await fetchAccount<Campaign>(program, 'growthCampaign', receipt.campaign);
  const [rewardEscrowPda] = findPda('reward_escrow', [receipt.campaign.toBuffer(), campaign.rewardMint.toBuffer()], programId);
  const [settlementRecordPda] = findPda('settlement', [causalReceiptPda.toBuffer()], programId);
  const [nullifierRecordPda] = findPda('campaign_nullifier', [
    receipt.campaign.toBuffer(),
    Buffer.from(receipt.claimerNullifierHash),
  ], programId);
  const escrow = await fetchAccount<Escrow>(program, 'rewardEscrow', rewardEscrowPda);
  const settlement = await fetchAccount<Settlement>(program, 'settlementRecord', settlementRecordPda);
  const nullifier = await fetchAccount<Nullifier>(program, 'nullifierRecord', nullifierRecordPda);
  const claimPassPda = receipt.claimPass ?? (manifest?.pdas?.claimPass ? new PublicKey(manifest.pdas.claimPass) : undefined);
  const claimPass = claimPassPda ? await fetchAccount<ClaimPass>(program, 'claimPass', claimPassPda) : undefined;
  const terminalDevicePda = receipt.terminalDevice ?? (manifest?.pdas?.terminalDevice ? new PublicKey(manifest.pdas.terminalDevice) : undefined);
  const terminalDeviceAccount = terminalDevicePda ? await fetchAccount<TerminalDevice>(program, 'terminalDevice', terminalDevicePda) : undefined;
  const childReceiptPda = manifest?.childLineageProof?.childReceipt ? new PublicKey(manifest.childLineageProof.childReceipt) : undefined;
  const childReceipt = childReceiptPda ? await fetchAccount<Receipt>(program, 'causalReceipt', childReceiptPda) : undefined;
  const childClaimPassPda = manifest?.childLineageProof?.childClaimPass ? new PublicKey(manifest.childLineageProof.childClaimPass) : undefined;
  const childClaimPass = childClaimPassPda ? await fetchAccount<ClaimPass>(program, 'claimPass', childClaimPassPda) : undefined;

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
  if (manifest?.hashes?.intentManifestHash) {
    const actualIntentManifestHash = receipt.intentManifestHash ? hashArrayToHex(receipt.intentManifestHash) : undefined;
    if (actualIntentManifestHash !== manifest.hashes.intentManifestHash) {
      failures.push(`receipt intent_manifest_hash expected ${manifest.hashes.intentManifestHash} but got ${actualIntentManifestHash ?? 'missing'}`);
    }
  }


  if (manifest?.hashes?.visitAttestationHash) {
    const actual = receipt.visitAttestationHash ? hashArrayToHex(receipt.visitAttestationHash) : undefined;
    if (actual !== manifest.hashes.visitAttestationHash) failures.push(`receipt visitAttestationHash expected ${manifest.hashes.visitAttestationHash} but got ${actual ?? 'missing'}`);
  }
  if (manifest?.hashes?.inviteHash) {
    const actual = receipt.inviteHash ? hashArrayToHex(receipt.inviteHash) : undefined;
    if (actual !== manifest.hashes.inviteHash) failures.push(`receipt inviteHash expected ${manifest.hashes.inviteHash} but got ${actual ?? 'missing'}`);
  }
  if (manifest?.hashes?.claimerNullifierHash) {
    const actual = receipt.claimerNullifierHash ? hashArrayToHex(receipt.claimerNullifierHash) : undefined;
    if (actual !== manifest.hashes.claimerNullifierHash) failures.push(`receipt claimerNullifierHash expected ${manifest.hashes.claimerNullifierHash} but got ${actual ?? 'missing'}`);
  }
  if (manifest?.hashes?.receiptIdHash) {
    const actual = receipt.receiptIdHash ? hashArrayToHex(receipt.receiptIdHash) : undefined;
    if (actual !== manifest.hashes.receiptIdHash) failures.push(`receipt receiptIdHash expected ${manifest.hashes.receiptIdHash} but got ${actual ?? 'missing'}`);
  }
  if (manifest?.hashes?.lineageProofHash) {
    const expected = manifest.hashes.lineageProofHash;
    const claimLineage = claimPass?.lineageProofHash ? hashArrayToHex(claimPass.lineageProofHash) : undefined;
    const receiptLineage = receipt.lineageProofHash ? hashArrayToHex(receipt.lineageProofHash) : undefined;
    if (claimLineage !== expected) failures.push(`claim pass lineageProofHash expected ${expected} but got ${claimLineage ?? 'missing'}`);
    if (receiptLineage !== expected) failures.push(`receipt lineageProofHash expected ${expected} but got ${receiptLineage ?? 'missing'}`);
  }

  if (manifest?.pdas?.terminalDevice && receipt.terminalDevice) {
    expectPublicKey('receipt terminal device', receipt.terminalDevice, new PublicKey(manifest.pdas.terminalDevice), failures);
  } else if (!receipt.terminalDevice) {
    failures.push('receipt terminal_device is missing');
  }
  if (manifest?.pdas?.terminalAuthority && receipt.terminalAuthority) {
    expectPublicKey('receipt terminal authority', receipt.terminalAuthority, new PublicKey(manifest.pdas.terminalAuthority), failures);
  } else if (!receipt.terminalAuthority) {
    failures.push('receipt terminal_authority is missing');
  }

  if (terminalDeviceAccount && terminalDevicePda) {
    if (enumName(terminalDeviceAccount.status) !== 'active') failures.push(`terminal device status is ${enumName(terminalDeviceAccount.status)}, expected active`);
    expectPublicKey('terminal device merchant config', terminalDeviceAccount.merchantConfig, receipt.merchantConfig, failures);
    if (campaign.merchantAuthority) expectPublicKey('terminal device merchant authority', terminalDeviceAccount.merchantAuthority, campaign.merchantAuthority, failures);
    if (receipt.terminalAuthority) expectPublicKey('terminal device terminal authority', terminalDeviceAccount.terminalAuthority, receipt.terminalAuthority, failures);
  } else {
    failures.push('terminal device account is missing');
  }

  if (manifest?.pdas?.visitorAuthority && receipt.visitorAuthority) {
    expectPublicKey('receipt visitor authority', receipt.visitorAuthority, new PublicKey(manifest.pdas.visitorAuthority), failures);
  } else if (!receipt.visitorAuthority) {
    failures.push('receipt visitor_authority is missing');
  }
  if (claimPass) {
    expectPublicKey('claim pass campaign', claimPass.campaign, receipt.campaign, failures);
    if (receipt.visitorAuthority) {
      expectPublicKey('claim pass visitor authority', claimPass.visitorAuthority, receipt.visitorAuthority, failures);
    }
    expectPublicKey('claim pass first receipt', claimPass.firstReceipt, causalReceiptPda, failures);
    if (enumName(claimPass.status) !== 'recorded') {
      failures.push(`claim pass status is ${enumName(claimPass.status)}, expected recorded`);
    }
    if (typeof campaign.maxDepth === 'number' && claimPass.depth > campaign.maxDepth) {
      failures.push(`claim pass depth ${claimPass.depth} exceeds campaign maxDepth ${campaign.maxDepth}`);
    }
    const receiptParentHash = receipt.parentReceiptIdHash ? hashArrayToHex(receipt.parentReceiptIdHash) : undefined;
    const zeroHash = '0'.repeat(64);
    const referrerReceipt = claimPass.referrerReceipt?.toBase58();
    if (claimPass.depth === 1) {
      if (referrerReceipt && referrerReceipt !== PublicKey.default.toBase58()) {
        failures.push(`root claim pass referrer receipt is ${referrerReceipt}, expected default pubkey`);
      }
      if (receiptParentHash && receiptParentHash !== zeroHash) {
        failures.push(`root receipt parent hash is ${receiptParentHash}, expected zero hash`);
      }
    } else {
      if (!referrerReceipt || referrerReceipt === PublicKey.default.toBase58()) {
        failures.push('child claim pass must reference a non-default parent receipt');
      }
      if (!receiptParentHash || receiptParentHash === zeroHash) {
        failures.push('child receipt must include a non-zero parent receipt hash');
      }
    }
  } else {
    failures.push('claim pass account is missing');
  }

  if (manifest?.childLineageProof) {
    if (!childReceipt || !childClaimPass || !childReceiptPda || !childClaimPassPda) {
      failures.push('child lineage proof is present but child receipt or claim pass account is missing');
    } else {
      expectPublicKey('child lineage parent receipt', new PublicKey(manifest.childLineageProof.parentReceipt ?? PublicKey.default.toBase58()), causalReceiptPda, failures);
      expectPublicKey('child receipt campaign', childReceipt.campaign, receipt.campaign, failures);
      expectPublicKey('child claim pass campaign', childClaimPass.campaign, receipt.campaign, failures);
      expectPublicKey('child claim pass first receipt', childClaimPass.firstReceipt, childReceiptPda, failures);
      expectPublicKey('child claim pass referrer receipt', childClaimPass.referrerReceipt ?? PublicKey.default, causalReceiptPda, failures);
      if (enumName(childClaimPass.status) !== 'recorded') {
        failures.push(`child claim pass status is ${enumName(childClaimPass.status)}, expected recorded`);
      }
      if (childReceipt.lineageGeneration !== (receipt.lineageGeneration ?? 0) + 1) {
        failures.push(`child lineage generation ${childReceipt.lineageGeneration} does not extend parent generation ${receipt.lineageGeneration ?? 'missing'}`);
      }
      const childParentHash = childReceipt.parentReceiptIdHash ? hashArrayToHex(childReceipt.parentReceiptIdHash) : undefined;
      const parentReceiptHash = receipt.receiptIdHash ? hashArrayToHex(receipt.receiptIdHash) : undefined;
      if (childParentHash !== parentReceiptHash) {
        failures.push(`child parent receipt hash expected ${parentReceiptHash ?? 'missing'} but got ${childParentHash ?? 'missing'}`);
      }
      if (manifest.childLineageProof.parentReceiptIdHash && childParentHash !== manifest.childLineageProof.parentReceiptIdHash) {
        failures.push(`child proof parent hash expected ${manifest.childLineageProof.parentReceiptIdHash} but got ${childParentHash ?? 'missing'}`);
      }
      if (manifest.childLineageProof.childReceiptIdHash) {
        const childReceiptHash = childReceipt.receiptIdHash ? hashArrayToHex(childReceipt.receiptIdHash) : undefined;
        if (childReceiptHash !== manifest.childLineageProof.childReceiptIdHash) {
          failures.push(`child receipt hash expected ${manifest.childLineageProof.childReceiptIdHash} but got ${childReceiptHash ?? 'missing'}`);
        }
      }
      if (manifest.childLineageProof.childLineageProofHash) {
        const childLineageHash = childClaimPass.lineageProofHash ? hashArrayToHex(childClaimPass.lineageProofHash) : undefined;
        if (childLineageHash !== manifest.childLineageProof.childLineageProofHash) {
          failures.push(`child lineage proof hash expected ${manifest.childLineageProof.childLineageProofHash} but got ${childLineageHash ?? 'missing'}`);
        }
      }
    }
  }

  expectBn('settled amount', receipt.settledAmount, receipt.rewardAmount, failures);
  expectBn('campaign reward per visit', campaign.rewardPerVerifiedVisit, receipt.rewardAmount, failures);
  const protocolFee = settlement.protocolFee ?? new anchor.BN(0);
  if (!settlement.referrerAmount.add(settlement.visitorAmount).add(protocolFee).eq(receipt.rewardAmount)) {
    failures.push('settlement split plus protocol fee does not add up to receipt reward amount');
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

  const tokenAccountChecks: Record<string, boolean> = {};
  if (manifest?.pdas?.referrerRewardAccount) {
    const referrerToken = await parsedTokenAccount(connection, new PublicKey(manifest.pdas.referrerRewardAccount));
    tokenAccountChecks.referrerTokenProgramOwner = referrerToken.programOwner.equals(SPL_TOKEN_PROGRAM_ID);
    tokenAccountChecks.referrerTokenMintMatches = referrerToken.mint.equals(campaign.rewardMint);
    tokenAccountChecks.referrerTokenOwnerMatches = manifest.pdas.referrerAuthority
      ? referrerToken.owner.equals(new PublicKey(manifest.pdas.referrerAuthority))
      : true;
  }
  if (manifest?.pdas?.visitorRewardAccount) {
    const visitorToken = await parsedTokenAccount(connection, new PublicKey(manifest.pdas.visitorRewardAccount));
    tokenAccountChecks.visitorTokenProgramOwner = visitorToken.programOwner.equals(SPL_TOKEN_PROGRAM_ID);
    tokenAccountChecks.visitorTokenMintMatches = visitorToken.mint.equals(campaign.rewardMint);
    tokenAccountChecks.visitorTokenOwnerMatches = manifest.pdas.visitorAuthority
      ? visitorToken.owner.equals(new PublicKey(manifest.pdas.visitorAuthority))
      : true;
  }
  if (manifest?.pdas?.rewardVault && manifest?.tokenBalances?.afterClose?.rewardVault !== 'closed') {
    const vaultToken = await parsedTokenAccount(connection, new PublicKey(manifest.pdas.rewardVault));
    tokenAccountChecks.vaultTokenProgramOwner = vaultToken.programOwner.equals(SPL_TOKEN_PROGRAM_ID);
    tokenAccountChecks.vaultTokenMintMatches = vaultToken.mint.equals(campaign.rewardMint);
    tokenAccountChecks.vaultTokenOwnerMatches = vaultToken.owner.equals(rewardEscrowPda);
  }
  for (const [label, ok] of Object.entries(tokenAccountChecks)) {
    if (!ok) failures.push(`token account check failed: ${label}`);
  }

  const beforeSettlement = manifest?.tokenBalances?.beforeSettlement;
  const afterSettlement = manifest?.tokenBalances?.afterSettlement;
  const referrerPayoutDeltaMatches = Boolean(beforeSettlement?.referrerRewardAccount && afterSettlement?.referrerRewardAccount &&
    new anchor.BN(afterSettlement.referrerRewardAccount).sub(new anchor.BN(beforeSettlement.referrerRewardAccount)).eq(settlement.referrerAmount));
  const visitorPayoutDeltaMatches = Boolean(beforeSettlement?.visitorRewardAccount && afterSettlement?.visitorRewardAccount &&
    new anchor.BN(afterSettlement.visitorRewardAccount).sub(new anchor.BN(beforeSettlement.visitorRewardAccount)).eq(settlement.visitorAmount));
  const protocolFeeDeltaMatches = Boolean(beforeSettlement?.treasuryRewardAccount && afterSettlement?.treasuryRewardAccount &&
    new anchor.BN(afterSettlement.treasuryRewardAccount).sub(new anchor.BN(beforeSettlement.treasuryRewardAccount)).eq(protocolFee));
  const vaultPayoutDeltaMatches = Boolean(beforeSettlement?.rewardVault && afterSettlement?.rewardVault &&
    new anchor.BN(beforeSettlement.rewardVault).sub(new anchor.BN(afterSettlement.rewardVault)).eq(settlement.referrerAmount.add(settlement.visitorAmount).add(protocolFee)));
  if (beforeSettlement && afterSettlement) {
    if (!referrerPayoutDeltaMatches) failures.push('referrer payout delta does not match settlement amount');
    if (!visitorPayoutDeltaMatches) failures.push('visitor payout delta does not match settlement amount');
    if (!protocolFeeDeltaMatches) failures.push('protocol fee delta does not match settlement amount');
    if (!vaultPayoutDeltaMatches) failures.push('reward vault payout delta does not match settlement amount');
  }

  const expectedReferrer = settlement.referrerAmount;
  const expectedVisitor = settlement.visitorAmount;
  const splitVerified = expectedReferrer.add(expectedVisitor).add(protocolFee).eq(receipt.rewardAmount);
  const escrowAccountingVerified = escrow.totalSettled.gte(receipt.rewardAmount) && escrow.totalFunded.gte(escrow.totalSettled.add(escrow.totalReserved));
  if (!splitVerified) failures.push('settlement split does not equal receipt reward amount');
  if (!escrowAccountingVerified) failures.push('reward escrow accounting is inconsistent');

  const terminalDevicePresent = Boolean(receipt.terminalDevice && terminalDevicePda && terminalDeviceAccount);
  const terminalDeviceAccountVerified = Boolean(terminalDeviceAccount && enumName(terminalDeviceAccount.status) === 'active' && terminalDeviceAccount.merchantConfig.equals(receipt.merchantConfig));
  const terminalAuthorityVerified = Boolean(terminalDeviceAccount && receipt.terminalAuthority && terminalDeviceAccount.terminalAuthority.equals(receipt.terminalAuthority));
  const terminalMerchantBindingVerified = Boolean(terminalDeviceAccount && (!campaign.merchantAuthority || terminalDeviceAccount.merchantAuthority.equals(campaign.merchantAuthority)));
  const visitorAuthorityVerified = Boolean(receipt.visitorAuthority && (!manifest?.pdas?.visitorAuthority || receipt.visitorAuthority.equals(new PublicKey(manifest.pdas.visitorAuthority))));
  const claimPassCampaignVerified = Boolean(claimPass && claimPass.campaign.equals(receipt.campaign));
  const claimPassVisitorVerified = Boolean(claimPass && receipt.visitorAuthority && claimPass.visitorAuthority.equals(receipt.visitorAuthority));
  const claimPassLineageHashVerified = !manifest?.hashes?.lineageProofHash || Boolean(claimPass?.lineageProofHash && hashArrayToHex(claimPass.lineageProofHash) === manifest.hashes.lineageProofHash);
  const receiptLineageHashVerified = !manifest?.hashes?.lineageProofHash || Boolean(receipt.lineageProofHash && hashArrayToHex(receipt.lineageProofHash) === manifest.hashes.lineageProofHash);
  const terminalChecks = {
    accountExists: Boolean(terminalDeviceAccount),
    statusActive: Boolean(terminalDeviceAccount && enumName(terminalDeviceAccount.status) === 'active'),
    merchantConfigMatches: Boolean(terminalDeviceAccount && terminalDeviceAccount.merchantConfig.equals(receipt.merchantConfig)),
    terminalAuthorityMatches: Boolean(terminalDeviceAccount && receipt.terminalAuthority && terminalDeviceAccount.terminalAuthority.equals(receipt.terminalAuthority)),
    merchantAuthorityMatches: Boolean(terminalDeviceAccount && (!campaign.merchantAuthority || terminalDeviceAccount.merchantAuthority.equals(campaign.merchantAuthority))),
  };
  const lineageChecks = {
    manifestMatchesClaimPass: claimPassLineageHashVerified,
    manifestMatchesReceipt: receiptLineageHashVerified,
    claimPassMatchesReceipt: Boolean(
      claimPass &&
      receipt.lineageProofHash &&
      claimPass.lineageProofHash &&
      hashArrayToHex(claimPass.lineageProofHash) === hashArrayToHex(receipt.lineageProofHash),
    ),
    rootParentConsistency: Boolean(
      claimPass &&
      (
        (claimPass.depth === 1 &&
          claimPass.referrerReceipt?.equals(PublicKey.default) &&
          (!receipt.parentReceiptIdHash || hashArrayToHex(receipt.parentReceiptIdHash) === '0'.repeat(64))) ||
        (claimPass.depth > 1 &&
          claimPass.referrerReceipt &&
          !claimPass.referrerReceipt.equals(PublicKey.default) &&
          receipt.parentReceiptIdHash &&
          hashArrayToHex(receipt.parentReceiptIdHash) !== '0'.repeat(64))
      ),
    ),
    childParentReceiptVerified: !manifest?.childLineageProof || Boolean(
      childReceipt &&
      childClaimPass &&
      childReceiptPda &&
      childClaimPass.firstReceipt.equals(childReceiptPda) &&
      childClaimPass.referrerReceipt?.equals(causalReceiptPda) &&
      childReceipt.campaign.equals(receipt.campaign) &&
      childReceipt.parentReceiptIdHash &&
      receipt.receiptIdHash &&
      hashArrayToHex(childReceipt.parentReceiptIdHash) === hashArrayToHex(receipt.receiptIdHash) &&
      childReceipt.lineageGeneration === (receipt.lineageGeneration ?? 0) + 1 &&
      manifest.childLineageProof.onChainParentReceiptVerified === true
    ),
  };
  const nullifierAccountVerified = Boolean(nullifier.campaign.equals(receipt.campaign) && nullifier.firstReceipt.equals(causalReceiptPda));
  const settlementAccountVerified = Boolean(settlement.receipt.equals(causalReceiptPda) && settlement.campaign.equals(receipt.campaign));
  const duplicateAttack = manifest?.attackEvidence?.find((entry: any) => entry?.id === 'duplicate-nullifier');
  const duplicateNullifierAttackRejected = Boolean(duplicateAttack?.observed === 'rejected' && duplicateAttack?.expectedErrorMatched === true);
  const receiptNullifierHashPresent = Boolean(receipt.claimerNullifierHash && Buffer.from(receipt.claimerNullifierHash).some((byte) => byte !== 0));
  const nullifierChecks = {
    nullifierAccountExists: Boolean(nullifier),
    nullifierCampaignMatches: Boolean(nullifier.campaign.equals(receipt.campaign)),
    nullifierReceiptMatches: Boolean(nullifier.firstReceipt.equals(causalReceiptPda)),
    receiptNullifierHashPresent,
    duplicateNullifierAttackRejected,
  };
  const settlementChecks = {
    receiptSettled: enumName(receipt.status) === 'settled',
    settlementAccountExists: Boolean(settlement),
    settlementReceiptMatches: Boolean(settlement.receipt.equals(causalReceiptPda)),
    settlementCampaignMatches: Boolean(settlement.campaign.equals(receipt.campaign)),
    payoutSumMatches: splitVerified,
    referrerPayoutDeltaMatches,
    visitorPayoutDeltaMatches,
    protocolFeeDeltaMatches,
    vaultPayoutDeltaMatches,
    escrowAccountingMatches: escrowAccountingVerified,
  };
  const terminalVerified = Object.values(terminalChecks).every(Boolean);
  const visitorVerified = visitorAuthorityVerified && claimPassVisitorVerified;
  const lineageVerified = Boolean(claimPass && enumName(claimPass.status) === 'recorded' && claimPassCampaignVerified && Object.values(lineageChecks).every(Boolean) && (typeof campaign.maxDepth !== 'number' || claimPass.depth <= campaign.maxDepth));
  const nullifierVerified = Object.values(nullifierChecks).every(Boolean);
  const settlementVerified = Object.values(settlementChecks).every(Boolean);

  const result = {
    ok: failures.length === 0,
    rpcUrl: options.rpcUrl,
    manifestPath: options.manifestPath,
    programId: programId.toBase58(),
    pdas: {
      causalReceipt: causalReceiptPda.toBase58(),
      growthCampaign: receipt.campaign.toBase58(),
      merchantConfig: receipt.merchantConfig.toBase58(),
      rewardEscrow: rewardEscrowPda.toBase58(),
      rewardVault: escrow.rewardVault.toBase58(),
      settlementRecord: settlementRecordPda.toBase58(),
      nullifierRecord: nullifierRecordPda.toBase58(),
      terminalDevice: receipt.terminalDevice?.toBase58(),
      terminalAuthority: receipt.terminalAuthority?.toBase58(),
      visitorAuthority: receipt.visitorAuthority?.toBase58(),
      claimPass: claimPassPda?.toBase58(),
    },
    attestationVerified: terminalVerified && visitorVerified && lineageVerified,
    terminalDevicePresent,
    terminalDeviceAccountVerified,
    terminalAuthorityVerified,
    terminalMerchantBindingVerified,
    visitorAuthorityVerified,
    claimPassCampaignVerified,
    claimPassVisitorVerified,
    claimPassLineageHashVerified,
    receiptLineageHashVerified,
    nullifierAccountVerified,
    settlementAccountVerified,
    splitVerified,
    escrowAccountingVerified,
    duplicateNullifierAttackRejected,
    terminalChecks,
    lineageChecks,
    nullifierChecks,
    settlementChecks,
    tokenAccountChecks,
    terminalVerified,
    visitorVerified,
    lineageVerified,
    nullifierVerified,
    settlementVerified,
    receipt: normalize(receipt),
    campaign: normalize(campaign),
    rewardEscrow: normalize(escrow),
    settlementRecord: normalize(settlement),
    nullifierRecord: normalize(nullifier),
    claimPass: normalize(claimPass),
    childReceipt: normalize(childReceipt),
    childClaimPass: normalize(childClaimPass),
    terminalDevice: normalize(terminalDeviceAccount),
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
