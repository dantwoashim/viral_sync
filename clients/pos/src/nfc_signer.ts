import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';

// Core component of V4 Architecture's physical Point-of-Sale integration.
// Prevents people from spoofing geo-locations by requiring a cryptographic
// signature generated *locally* at the physical store server and piped into NFC.

export class NFCSignerUtility {
    private merchantVaultAuth: Keypair;

    constructor(merchantVaultSecretHex: string) {
        // Load the Attestation private key mapped inside VaultEntry
        const secretKey = new Uint8Array(Buffer.from(merchantVaultSecretHex, 'hex'));
        this.merchantVaultAuth = Keypair.fromSecretKey(secretKey);
    }

    /**
     * Generates a 64-byte Ed25519 signature of the current GPS 
     * coordinates + timestamp embedded inside the NFC tag.
     */
    generateRotatingPayload(latMicro: number, lngMicro: number): {
        latMicro: number,
        lngMicro: number,
        timestampSession: number,
        signatureHex: string
    } {
        const timestampSession = Math.floor(Date.now() / 1000); // 1-second precision

        // Structure payload tightly bound avoiding replay attacks across stores
        const payloadBuffer = Buffer.alloc(4 + 4 + 4);
        payloadBuffer.writeInt32LE(latMicro, 0);
        payloadBuffer.writeInt32LE(lngMicro, 4);
        payloadBuffer.writeInt32LE(timestampSession, 8);

        const signature = nacl.sign.detached(payloadBuffer, this.merchantVaultAuth.secretKey);

        return {
            latMicro,
            lngMicro,
            timestampSession,
            signatureHex: Buffer.from(signature).toString('hex')
        };
    }
}
