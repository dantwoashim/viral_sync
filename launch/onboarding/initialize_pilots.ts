import { existsSync, readFileSync } from 'fs';
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

interface PilotMerchantInput {
    name: string;
    adminPubkey: string;
    mintPubkey: string;
    bondLamports?: number;
    bondSol?: number;
    commissionRateBps: number;
    transferFeeBps?: number;
    minHoldBeforeShareSecs?: number;
}

interface PilotMerchantPlan extends PilotMerchantInput {
    merchantConfigPda: string;
    bondLamports: number;
    transferFeeBps: number;
    minHoldBeforeShareSecs: number;
}

function parsePublicKey(value: string, label: string) {
    try {
        return new PublicKey(value);
    } catch {
        throw new Error(`${label} must be a valid Solana public key.`);
    }
}

function parseDeployer(secret: string | undefined) {
    if (!secret) {
        return null;
    }

    const trimmed = secret.trim();
    const bytes = trimmed.startsWith('[')
        ? Uint8Array.from(JSON.parse(trimmed) as number[])
        : bs58.decode(trimmed);

    return Keypair.fromSecretKey(bytes);
}

function readPilotInput() {
    const inlineJson = process.env.PILOT_MERCHANTS_JSON;
    const filePath = process.env.PILOT_MERCHANTS_FILE;

    if (inlineJson) {
        return JSON.parse(inlineJson) as PilotMerchantInput[];
    }

    if (filePath && existsSync(filePath)) {
        return JSON.parse(readFileSync(filePath, 'utf8')) as PilotMerchantInput[];
    }

    throw new Error('Set PILOT_MERCHANTS_JSON or PILOT_MERCHANTS_FILE before preparing launch pilots.');
}

function normalizePilot(pilot: PilotMerchantInput, programId: PublicKey): PilotMerchantPlan {
    const admin = parsePublicKey(pilot.adminPubkey, `${pilot.name}.adminPubkey`);
    const mint = parsePublicKey(pilot.mintPubkey, `${pilot.name}.mintPubkey`);

    if (!pilot.name.trim()) {
        throw new Error('Pilot merchant name is required.');
    }
    if (!Number.isInteger(pilot.commissionRateBps) || pilot.commissionRateBps < 0 || pilot.commissionRateBps > 10_000) {
        throw new Error(`${pilot.name}.commissionRateBps must be an integer between 0 and 10000.`);
    }

    const transferFeeBps = pilot.transferFeeBps ?? 0;
    if (!Number.isInteger(transferFeeBps) || transferFeeBps < 0 || transferFeeBps >= 10_000) {
        throw new Error(`${pilot.name}.transferFeeBps must be an integer between 0 and 9999.`);
    }

    const minHoldBeforeShareSecs = pilot.minHoldBeforeShareSecs ?? 0;
    if (!Number.isInteger(minHoldBeforeShareSecs) || minHoldBeforeShareSecs < 0) {
        throw new Error(`${pilot.name}.minHoldBeforeShareSecs must be a non-negative integer.`);
    }

    const bondLamports = pilot.bondLamports ?? Math.round((pilot.bondSol ?? 0) * LAMPORTS_PER_SOL);
    if (!Number.isSafeInteger(bondLamports) || bondLamports < 0) {
        throw new Error(`${pilot.name}.bondLamports must be a safe non-negative integer.`);
    }

    const [merchantConfigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('merchant_v4'), mint.toBuffer()],
        programId,
    );

    return {
        ...pilot,
        adminPubkey: admin.toBase58(),
        mintPubkey: mint.toBase58(),
        merchantConfigPda: merchantConfigPda.toBase58(),
        bondLamports,
        transferFeeBps,
        minHoldBeforeShareSecs,
    };
}

export function buildPilotLaunchPlan(programId: PublicKey, pilots: PilotMerchantInput[]) {
    if (pilots.length === 0) {
        throw new Error('At least one pilot merchant is required.');
    }

    return pilots.map((pilot) => normalizePilot(pilot, programId));
}

async function main() {
    const programId = parsePublicKey(process.env.PROGRAM_ID || '', 'PROGRAM_ID');
    const deployer = parseDeployer(process.env.DEPLOYER_SECRET);
    const pilots = readPilotInput();
    const plan = buildPilotLaunchPlan(programId, pilots);

    const output = {
        programId: programId.toBase58(),
        deployer: deployer?.publicKey.toBase58() ?? null,
        generatedAt: new Date().toISOString(),
        submitOnChain: false,
        note: 'This script validates launch inputs and computes account addresses. Submit the resulting instructions through an audited deployment runner.',
        pilots: plan,
    };

    console.log(JSON.stringify(output, null, 2));
}

if (require.main === module) {
    void main().catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    });
}
