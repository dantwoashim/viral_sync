import { Keypair, PublicKey } from '@solana/web3.js';
import crypto from 'crypto';

// Core component of the physical Point-of-Sale integration.
// The store attestation server co-signs the final redemption transaction, so
// this helper now produces a short-lived payload with a unique nonce rather
// than a detached signature stored in the browser.

export class NFCSignerUtility {
    private merchantVaultAuth: Keypair;

    constructor(merchantVaultSecretHex: string) {
        // Load the Attestation private key mapped inside VaultEntry
        const secretKey = new Uint8Array(Buffer.from(merchantVaultSecretHex, 'hex'));
        this.merchantVaultAuth = Keypair.fromSecretKey(secretKey);
    }

    /**
     * Generates a short-lived attestation payload for the next redemption
     * transaction. The transaction itself must still be signed by the
     * attestation server keypair held by this device/service.
     */
    generateRotatingPayload(
        latMicro: number,
        lngMicro: number,
        redeemer: PublicKey,
        fence: PublicKey,
        bypassGeo = false
    ): {
        latMicro: number;
        lngMicro: number;
        issuedAt: number;
        nonce: bigint;
        bypassGeo: boolean;
        attestationServer: PublicKey;
        payloadDigestHex: string;
    } {
        const issuedAt = Math.floor(Date.now() / 1000);
        const nonceBuffer = crypto.randomBytes(8);
        const nonce = nonceBuffer.readBigUInt64LE(0);
        const payloadBuffer = Buffer.alloc(4 + 4 + 8 + 8 + 32 + 32 + 1);
        payloadBuffer.writeInt32LE(latMicro, 0);
        payloadBuffer.writeInt32LE(lngMicro, 4);
        payloadBuffer.writeBigInt64LE(BigInt(issuedAt), 8);
        payloadBuffer.writeBigUInt64LE(nonce, 16);
        redeemer.toBuffer().copy(payloadBuffer, 24);
        fence.toBuffer().copy(payloadBuffer, 56);
        payloadBuffer.writeUInt8(bypassGeo ? 1 : 0, 88);

        return {
            latMicro,
            lngMicro,
            issuedAt,
            nonce,
            bypassGeo,
            attestationServer: this.merchantVaultAuth.publicKey,
            payloadDigestHex: crypto.createHash('sha256').update(payloadBuffer).digest('hex'),
        };
    }
}
