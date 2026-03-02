import express, { Request, Response } from 'express';
import cors from 'cors';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
// In a full environment: import { ActionGetResponse, ActionPostRequest, ActionPostResponse, createPostResponse, ACTIONS_CORS_HEADERS } from '@solana/actions';

const app = express();
app.use(express.json());

// Apply aggressive CORS dictated by the Solana Actions Spec
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Encoding', 'Accept-Encoding'],
}));

// Provide the mandatory headers for Solana Actions
const ACTIONS_CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Encoding, Accept-Encoding',
};

const connection = new Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');

/**
 * Handle OPTIONS identically per the Solana Action spec
 */
app.options('/actions/viral-sync', (req, res) => {
    res.set(ACTIONS_CORS_HEADERS).status(200).end();
});

/**
 * Endpoint: GET /actions/viral-sync
 * Goal: Deliver the UI metadata describing what the transaction achieves on-chain.
 * Twitter (X) dialers parse this to unfold the preview card.
 */
app.get('/actions/viral-sync', async (req: Request, res: Response) => {
    const { source, mint } = req.query;

    if (!source || !mint) {
        return res.status(400).json({ error: 'Missing source or mint parameters' });
    }

    const payload = {
        title: "Claim Viral-Sync Referral Token",
        icon: "https://viralsync.io/assets/action-hero.png",
        description: "You've been invited! Claim your escrowed connection token utilizing the V4 Transfer Hooks protocol so we can track the lineage of your purchases.",
        label: "Claim Escrow",
    };

    res.set(ACTIONS_CORS_HEADERS).json(payload);
});

/**
 * Endpoint: POST /actions/viral-sync
 * Goal: Ingest the interacting user's public key from the wallet adaptor,
 * construct the precise V4 `create_escrow_share` transaction, and return it.
 */
app.post('/actions/viral-sync', async (req: Request, res: Response) => {
    try {
        const { account } = req.body;
        const { source, mint } = req.query;

        if (!account) return res.status(400).json({ error: 'Missing user account' });

        const userPubkey = new PublicKey(account);
        const sourceGenPda = new PublicKey(source as string);
        const mintKey = new PublicKey(mint as string);

        // Here we would dynamically generate the instruction using Anchor:
        // const ix = await program.methods.createEscrowShare(new BN(1_000_000))
        //   .accounts({ ... })
        //   .instruction();

        // Building the skeleton transaction mapping
        const tx = new Transaction();
        const blockhash = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash.blockhash;
        tx.feePayer = userPubkey; // Replaced by Relayer in actual execution if sponsored

        // tx.add(ix);

        const serializedTx = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
        const base64Tx = serializedTx.toString('base64');

        const responsePayload = {
            transaction: base64Tx,
            message: "Escrow successfully claimed. Welcome to the loop!"
        };

        res.set(ACTIONS_CORS_HEADERS).status(200).json(responsePayload);

    } catch (err: any) {
        console.error(err);
        res.set(ACTIONS_CORS_HEADERS).status(500).json({ error: "Failed to generate action transaction" });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Blink Actions Server running on port ${PORT}`);
});
