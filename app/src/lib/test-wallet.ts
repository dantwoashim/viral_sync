'use client';

import nacl from 'tweetnacl';
import { Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

export interface TestInjectedWalletProvider {
    publicKey?: PublicKey;
    connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey?: PublicKey }>;
    disconnect?: () => Promise<void>;
    signMessage?: (message: Uint8Array) => Promise<Uint8Array | { signature: Uint8Array }>;
    signTransaction?: (transaction: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
}

export interface TestWalletOption {
    id: string;
    label: string;
    provider: TestInjectedWalletProvider;
}

const TEST_MODE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_BROWSER_TEST_MODE === 'true';
const TEST_WALLETS = [
    {
        id: 'test-merchant',
        label: 'Test Merchant Wallet',
        secretBase64: process.env.NEXT_PUBLIC_TEST_MERCHANT_WALLET_SECRET_BASE64,
    },
    {
        id: 'test-consumer',
        label: 'Test Consumer Wallet',
        secretBase64: process.env.NEXT_PUBLIC_TEST_CONSUMER_WALLET_SECRET_BASE64,
    },
] as const;

function decodeBase64Secret(secretBase64: string): Uint8Array {
    const binary = typeof window === 'undefined'
        ? Buffer.from(secretBase64, 'base64').toString('binary')
        : window.atob(secretBase64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
}

function buildTestWalletProvider(secretBase64: string): TestInjectedWalletProvider {
    const secretKey = decodeBase64Secret(secretBase64);
    const keypair = Keypair.fromSecretKey(secretKey);

    return {
        publicKey: keypair.publicKey,
        async connect() {
            return { publicKey: keypair.publicKey };
        },
        async disconnect() {
            return;
        },
        async signMessage(message: Uint8Array) {
            return nacl.sign.detached(message, keypair.secretKey);
        },
        async signTransaction(transaction: Transaction | VersionedTransaction) {
            if (transaction instanceof VersionedTransaction) {
                transaction.sign([keypair]);
                return transaction;
            }

            transaction.partialSign(keypair);
            return transaction;
        },
    };
}

export function getTestWalletOptions(): TestWalletOption[] {
    if (!TEST_MODE_ENABLED) {
        return [];
    }

    return TEST_WALLETS
        .filter((wallet) => typeof wallet.secretBase64 === 'string' && wallet.secretBase64.length > 0)
        .map((wallet) => ({
            id: wallet.id,
            label: wallet.label,
            provider: buildTestWalletProvider(wallet.secretBase64 as string),
        }));
}

export function isBrowserTestModeEnabled(): boolean {
    return TEST_MODE_ENABLED;
}

export function getTestGeoOverride():
    | { latitude: number; longitude: number }
    | null {
    const raw = process.env.NEXT_PUBLIC_TEST_GEO_COORDS;
    if (!TEST_MODE_ENABLED || !raw) {
        return null;
    }

    const [latitudeRaw, longitudeRaw] = raw.split(',').map((value) => value.trim());
    const latitude = Number(latitudeRaw);
    const longitude = Number(longitudeRaw);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
    }

    return { latitude, longitude };
}
