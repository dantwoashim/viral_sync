import { Connection, Transaction, VersionedTransaction } from '@solana/web3.js';

export interface EmbeddedWalletProvider {
    getWalletAddress(userId: string): Promise<string | null>;
    signTransaction<T extends Transaction | VersionedTransaction>(userId: string, tx: T): Promise<T>;
}

export class PrivyAuthBridge {
    private connection: Connection;

    constructor(
        private readonly walletProvider: EmbeddedWalletProvider,
        rpcUrl: string
    ) {
        this.connection = new Connection(rpcUrl, 'confirmed');
    }

    async getEmbeddedWalletAddress(userId: string): Promise<string> {
        const address = await this.walletProvider.getWalletAddress(userId);
        if (!address) {
            throw new Error('No embedded Solana wallet is available for this user.');
        }

        return address;
    }

    async signTransaction<T extends Transaction | VersionedTransaction>(userId: string, tx: T): Promise<T> {
        return this.walletProvider.signTransaction(userId, tx);
    }

    getConnection(): Connection {
        return this.connection;
    }
}
