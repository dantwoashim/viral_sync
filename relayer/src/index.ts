import express from 'express';
import cors from 'cors';
import { Connection, Keypair, VersionedTransaction, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// The Relayer Authority Keypair executing and paying for user gas fees
const RELAYER_SECRET = process.env.RELAYER_SECRET || '';
const relayerKeypair = RELAYER_SECRET
    ? Keypair.fromSecretKey(bs58.decode(RELAYER_SECRET))
    : Keypair.generate(); // Fallback for dev

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

// Rate limiting: max 30 relay requests per minute per IP
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const timestamps = rateLimitMap.get(ip) || [];
    const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (recent.length >= RATE_LIMIT_MAX) return false;
    recent.push(now);
    rateLimitMap.set(ip, recent);
    return true;
}

// Clean up rate limit map periodically
setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of rateLimitMap.entries()) {
        const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
        if (recent.length === 0) rateLimitMap.delete(ip);
        else rateLimitMap.set(ip, recent);
    }
}, 30_000);

/* ── Health Endpoint ── */

app.get('/health', async (_req, res) => {
    try {
        const balance = await connection.getBalance(relayerKeypair.publicKey);
        res.json({
            status: 'ok',
            relayerPubkey: relayerKeypair.publicKey.toBase58(),
            balance,
            balanceSOL: balance / 1e9,
            rpcUrl: RPC_URL.replace(/\/\/.*:.*@/, '//***@'), // Mask credentials
            uptime: process.uptime(),
        });
    } catch (error: any) {
        res.status(500).json({ status: 'error', error: error.message });
    }
});

/* ── Relay Endpoint ── */

app.post('/relay', async (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    // Rate limit check
    if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Try again in 60 seconds.' });
    }

    try {
        const { transactionBase64 } = req.body;
        if (!transactionBase64) {
            return res.status(400).json({ error: 'Missing transaction data' });
        }

        // Sanity check on payload size
        if (transactionBase64.length > 2_000_000) {
            return res.status(400).json({ error: 'Transaction too large' });
        }

        const txBuffer = Buffer.from(transactionBase64, 'base64');

        let tx: VersionedTransaction | Transaction;

        try {
            tx = VersionedTransaction.deserialize(txBuffer);
            tx.sign([relayerKeypair]);
        } catch {
            tx = Transaction.from(txBuffer);
            tx.partialSign(relayerKeypair);
        }

        // Simulating the transaction prior to broadcast prevents draining relayer funds on failed TXs
        const simulation = await connection.simulateTransaction(tx as any);
        if (simulation.value.err) {
            console.warn(`[RELAY] Simulation failed for ${clientIp}:`, simulation.value.err);
            return res.status(400).json({
                error: 'Transaction simulation failed',
                logs: simulation.value.logs?.slice(-10), // Last 10 logs
            });
        }

        const signature = await connection.sendRawTransaction(tx.serialize(), {
            skipPreflight: true, // Already simulated
            maxRetries: 3,
        });

        console.log(`[RELAY] ✅ ${clientIp} → ${signature}`);
        res.json({ signature, status: 'success' });

    } catch (error: any) {
        console.error(`[RELAY] ❌ ${clientIp}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

/* ── Start Server ── */

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`\n  🚀 Viral-Sync Gas Relayer`);
    console.log(`  ├── Port:     ${PORT}`);
    console.log(`  ├── RPC:      ${RPC_URL}`);
    console.log(`  ├── Pubkey:   ${relayerKeypair.publicKey.toBase58()}`);
    console.log(`  └── Mode:     ${RELAYER_SECRET ? 'Production' : 'Dev (random keypair)'}\n`);
});
