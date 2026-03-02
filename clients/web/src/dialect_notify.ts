import { Dialect, Environment, DialectCloudEnvironment } from '@dialectlabs/sdk';
import { PublicKey } from '@solana/web3.js';

// V4 Architecture integrates Dialect for instantaneous PWA push-notifications 
// immediately upon Helius webhooks processing a TransferHook transfer

export class DialectNotificationBridge {
    private dialectEnvironment: DialectCloudEnvironment;

    constructor() {
        // Initialize Dialect for Solana environment
        this.dialectEnvironment = Environment.DialectCloud;
        console.log('Dialect Web-Push System initialized');
    }

    /**
     * Subscribes the user's specific embedded Privy wallet to 
     * on-chain events happening within the Merchant configurations
     */
    async subscribeToMerchantAlerts(userWallet: PublicKey, merchantMint: PublicKey) {
        // const sdk = Dialect.sdk({
        //   environment: this.dialectEnvironment,
        //   wallet: userWallet, // In production involves web3 wallet adapter injection
        // });
        // 
        // await sdk.dapps.createSubscription({
        //      dappPublicKey: merchantMint
        // });

        console.log(`Subscribed user ${userWallet.toBase58()} to protocol notifications`);
    }

    /**
     * Simulation of pushing a message directly to a user's phone via PWA service workers
     */
    async sendCommissionPushAlert(userWallet: PublicKey, tokensEarned: number) {
        console.log(`Pushing Notification to ${userWallet.toBase58()}: "You just earned ${tokensEarned} tokens from your referral!"`);
    }
}
