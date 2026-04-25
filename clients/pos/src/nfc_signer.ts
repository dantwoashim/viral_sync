import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';

export function buildAttestationMessage(latMicro: number, lngMicro: number, timestampSession: number) {
    if (!Number.isInteger(latMicro) || !Number.isInteger(lngMicro) || !Number.isInteger(timestampSession)) {
        throw new Error('Attestation payload values must be integers.');
    }

    const payloadBuffer = Buffer.alloc(4 + 4 + 8);
    payloadBuffer.writeInt32LE(latMicro, 0);
    payloadBuffer.writeInt32LE(lngMicro, 4);
    payloadBuffer.writeBigInt64LE(BigInt(timestampSession), 8);
    return payloadBuffer;
}

export class NFCSignerUtility {
    private merchantVaultAuth: Keypair;

    constructor(merchantVaultSecretHex: string) {
        const secretKey = new Uint8Array(Buffer.from(merchantVaultSecretHex, 'hex'));
        if (secretKey.length !== 64) {
            throw new Error('Merchant vault secret must be a 64-byte Ed25519 secret key encoded as hex.');
        }

        this.merchantVaultAuth = Keypair.fromSecretKey(secretKey);
    }

    generateRotatingPayload(latMicro: number, lngMicro: number): {
        latMicro: number,
        lngMicro: number,
        timestampSession: number,
        signatureHex: string
    } {
        const timestampSession = Math.floor(Date.now() / 1000); // 1-second precision
        const payloadBuffer = buildAttestationMessage(latMicro, lngMicro, timestampSession);
        const signature = nacl.sign.detached(payloadBuffer, this.merchantVaultAuth.secretKey);

        return {
            latMicro,
            lngMicro,
            timestampSession,
            signatureHex: Buffer.from(signature).toString('hex')
        };
    }
}
