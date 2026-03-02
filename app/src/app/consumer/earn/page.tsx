'use client';

import React from 'react';
import { Share2, Copy, Zap } from 'lucide-react';
import { useWallet } from '@/lib/useWallet';
import { useCommissionLedger } from '@/lib/hooks';
import { formatTokenAmount, shortenAddress } from '@/lib/solana';

export default function EarnPage() {
    const publicKey = useWallet();
    const ledger = useCommissionLedger(publicKey, null);

    const referralLink = publicKey ? `viral.sync/ref/${shortenAddress(publicKey.toBase58())}` : 'Sign in first';

    return (
        <>
            <div className="page-top">
                <h1>Earn</h1>
                {ledger.data && <div className="pill pill-gold"><Zap size={11} /> {formatTokenAmount(ledger.data.totalEarned)}</div>}
            </div>

            <div className="page-scroll">
                {/* Share Link */}
                <div className="scroll-card" style={{ padding: 'var(--s5)' }}>
                    <h3 style={{ marginBottom: 'var(--s2)' }}>
                        <Share2 size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                        Your Referral Link
                    </h3>
                    <div style={{ display: 'flex', gap: 8, marginTop: 'var(--s3)' }}>
                        <div style={{ flex: 1, padding: '10px 14px', background: 'var(--mist-strong)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {referralLink}
                        </div>
                        <button style={{ padding: '10px 14px', background: 'var(--gold-soft)', color: 'var(--gold)', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
                            <Copy size={14} />
                        </button>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 'var(--s3)' }}>
                        Share this link. Earn commission on every purchase your referrals make.
                    </p>
                </div>

                {/* Stats */}
                <div className="stats-grid" style={{ marginTop: 'var(--s4)' }}>
                    <div className="stat-card scroll-card">
                        <div className="stat-label">Total Earned</div>
                        <div className="stat-value" style={{ color: 'var(--gold)' }}>{ledger.data ? formatTokenAmount(ledger.data.totalEarned) : '-'}</div>
                    </div>
                    <div className="stat-card scroll-card">
                        <div className="stat-label">Pending</div>
                        <div className="stat-value" style={{ color: 'var(--jade)' }}>{ledger.data ? formatTokenAmount(ledger.data.claimable) : '-'}</div>
                    </div>
                </div>

                {!publicKey && (
                    <div className="empty-state" style={{ marginTop: 'var(--s6)' }}>
                        <div className="empty-state-icon"><Share2 size={24} color="var(--text-3)" /></div>
                        <h3>Connect to Begin</h3>
                        <p>Sign in to generate your referral link and start earning.</p>
                    </div>
                )}

                <div style={{ height: 'var(--s8)' }} />
            </div>
        </>
    );
}
