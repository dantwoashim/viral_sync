import { PublicKey } from '@solana/web3.js';

export interface NotificationTransport {
    subscribe(userWallet: PublicKey, merchantMint: PublicKey): Promise<void>;
    sendCommissionAlert(userWallet: PublicKey, tokensEarned: number): Promise<void>;
}

export class DialectNotificationBridge {
    constructor(private readonly transport: NotificationTransport) {}

    async subscribeToMerchantAlerts(userWallet: PublicKey, merchantMint: PublicKey) {
        await this.transport.subscribe(userWallet, merchantMint);
    }

    async sendCommissionPushAlert(userWallet: PublicKey, tokensEarned: number) {
        await this.transport.sendCommissionAlert(userWallet, tokensEarned);
    }
}
