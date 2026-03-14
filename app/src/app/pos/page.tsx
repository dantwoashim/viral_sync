'use client';

import React, { useState } from 'react';
import { Clock3, Home, RefreshCcw, Ticket, Wifi, Zap } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
    clearStoredOperatorSession,
    createOperatorSession,
    createRedemptionChallenge,
    getStoredOperatorSession,
    persistOperatorSession,
    requestOperatorChallenge,
} from '@/lib/runtime';
import { MERCHANT_MINT, MERCHANT_PUBKEY, shortenAddress } from '@/lib/solana';

interface IssuedChallenge {
    challengeId: string;
    code: string;
    amount: string;
    expiresAt: number;
    label?: string;
}

const FENCE_PUBKEY = process.env.NEXT_PUBLIC_REDEMPTION_FENCE || '';

function encodeBase64(input: Uint8Array): string {
    let binary = '';
    input.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
}

export default function POSPage() {
    const { walletAddress, role, signMessage, login } = useAuth();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [issued, setIssued] = useState<IssuedChallenge[]>([]);
    const [amount, setAmount] = useState(process.env.NEXT_PUBLIC_REDEMPTION_AMOUNT || '1000000000');

    const activeChallenge = issued[0] ?? null;
    const canIssue = Boolean(walletAddress && FENCE_PUBKEY && MERCHANT_PUBKEY);
    const nowLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const ensureOperatorSession = async (): Promise<string> => {
        if (!walletAddress || !MERCHANT_PUBKEY) {
            throw new Error('Connect an allowlisted merchant operator wallet to issue live redemption codes.');
        }

        const existing = getStoredOperatorSession();
        if (existing && existing.merchant === MERCHANT_PUBKEY.toBase58() && existing.wallet === walletAddress.toBase58()) {
            return existing.token;
        }

        clearStoredOperatorSession();
        const challenge = await requestOperatorChallenge({
            wallet: walletAddress.toBase58(),
            merchant: MERCHANT_PUBKEY.toBase58(),
            origin: window.location.origin,
        });
        const signature = await signMessage(new TextEncoder().encode(challenge.challengeMessage));
        const session = await createOperatorSession({
            challengeId: challenge.challengeId,
            signatureBase64: encodeBase64(signature),
        });
        persistOperatorSession(session);
        return session.token;
    };

    const issueChallenge = async () => {
        if (!walletAddress) {
            login();
            return;
        }
        if (!FENCE_PUBKEY) {
            setError('NEXT_PUBLIC_REDEMPTION_FENCE is required for the live POS flow.');
            return;
        }
        if (!MERCHANT_PUBKEY) {
            setError('NEXT_PUBLIC_MERCHANT_PUBKEY is required for the live POS flow.');
            return;
        }
        if (role !== 'merchant') {
            setError('Switch your app role to merchant before issuing live POS codes.');
            return;
        }

        try {
            setBusy(true);
            setError(null);
            const operatorToken = await ensureOperatorSession();
            const challenge = await createRedemptionChallenge({
                merchant: MERCHANT_PUBKEY.toBase58(),
                fence: FENCE_PUBKEY,
                mint: MERCHANT_MINT?.toBase58(),
                amount,
                label: 'In-store redemption',
            }, operatorToken);
            setIssued((current) => [challenge, ...current].slice(0, 5));
        } catch (issueError) {
            setError(issueError instanceof Error ? issueError.message : 'Failed to create a live redemption code.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="pos-screen">
            <div className="pos-header">
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)' }}>
                    <Home size={16} /> Merchant
                </Link>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-2)' }}>
                    {nowLabel}
                </div>
                <div className={canIssue ? 'pill pill-jade' : 'pill pill-gold'}>
                    {canIssue ? 'Live POS' : 'Needs Config'}
                </div>
            </div>

            <div className="pos-nfc-ring">
                {activeChallenge ? (
                    <div style={{
                        display: 'grid',
                        placeItems: 'center',
                        width: 180,
                        height: 180,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(230,168,23,0.24), rgba(22,58,42,0.04))',
                        border: '1px solid rgba(230,168,23,0.28)',
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 12, letterSpacing: '0.22em', color: 'var(--text-2)', marginBottom: 8 }}>
                                LIVE CODE
                            </div>
                            <div
                                style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 800 }}
                                data-testid="pos-active-code"
                            >
                                {activeChallenge.code}
                            </div>
                        </div>
                    </div>
                ) : (
                    <Wifi size={56} color="var(--gold)" style={{ opacity: 0.5 }} />
                )}
            </div>

            <h2 style={{ fontFamily: 'var(--font-serif)', marginBottom: 4 }}>
                {activeChallenge ? 'Ready for Customer Check-In' : 'Issue Redemption Code'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center', maxWidth: 280 }}>
                {activeChallenge
                    ? 'Show the code to the customer. Their device will request geo proof and submit the redemption step live.'
                    : 'Create a short-lived redemption code instead of using the old static scan placeholder. Allowlisted staff wallets can issue codes too.'}
            </p>

            {walletAddress && (
                <div style={{ marginTop: 'var(--s4)', fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                    Terminal: {shortenAddress(walletAddress.toBase58())}
                </div>
            )}

            <div className="pos-stats">
                <div className="pos-stat">
                    <div className="pos-stat-val" style={{ color: 'var(--jade)' }}>{issued.length}</div>
                    <div className="pos-stat-label">Issued</div>
                </div>
                <div className="pos-stat">
                    <div className="pos-stat-val">{activeChallenge ? 1 : 0}</div>
                    <div className="pos-stat-label">Active</div>
                </div>
                <div className="pos-stat">
                    <div className="pos-stat-val" style={{ color: 'var(--gold)' }}>
                        {activeChallenge ? Math.max(0, Math.ceil((activeChallenge.expiresAt - Date.now()) / 1000)) : 0}s
                    </div>
                    <div className="pos-stat-label">TTL</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 'var(--s5)' }}>
                <input
                    type="text"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    data-testid="pos-amount-input"
                    style={{
                        flex: 1,
                        minWidth: 0,
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--mist-strong)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-1)',
                        fontFamily: 'var(--font-mono)',
                    }}
                    placeholder="Amount (raw units)"
                />
                <button
                    onClick={() => void issueChallenge()}
                    disabled={busy}
                    data-testid="pos-create-code-button"
                    style={{
                        flex: 1,
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, var(--gold), var(--dawn))',
                        color: 'var(--ink)',
                        fontWeight: 700,
                        opacity: busy ? 0.7 : 1,
                    }}
                >
                    {busy ? 'Issuing...' : activeChallenge ? 'Refresh Code' : 'Create Code'}
                </button>
            </div>

            {error && (
                <div style={{
                    width: '100%',
                    marginTop: 'var(--s4)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--crimson-soft)',
                    color: 'var(--crimson)',
                    fontSize: 13,
                }}>
                    {error}
                </div>
            )}

            <div className="section" style={{ width: '100%', marginTop: 'var(--s6)' }}>
                <div className="section-header"><span className="section-title">Recent Codes</span></div>
                {issued.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon"><Zap size={24} color="var(--text-3)" /></div>
                        <h3>No Live Sessions Yet</h3>
                        <p>Create a code to begin the real customer redemption flow.</p>
                    </div>
                ) : (
                    <div className="list-card">
                        {issued.map((challenge) => (
                            <div key={challenge.challengeId} className="list-item">
                                <div className="list-item-icon" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}>
                                    <Ticket size={16} />
                                </div>
                                <div className="list-item-content">
                                    <div className="list-item-title" style={{ fontFamily: 'var(--font-mono)' }}>
                                        {challenge.code}
                                    </div>
                                    <div className="list-item-sub">
                                        <Clock3 size={9} /> expires {new Date(challenge.expiresAt).toLocaleTimeString()}
                                    </div>
                                    <div className="list-item-sub">amount {challenge.amount}</div>
                                </div>
                                <div className="list-item-right">
                                    <button
                                        onClick={() => void issueChallenge()}
                                        disabled={busy}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '8px 10px',
                                            borderRadius: 999,
                                            background: 'var(--mist-strong)',
                                            color: 'var(--text-2)',
                                            fontSize: 12,
                                            fontWeight: 600,
                                        }}
                                    >
                                        <RefreshCcw size={12} />
                                        Refresh
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
