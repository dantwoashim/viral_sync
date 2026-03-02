'use client';

import React from 'react';
import { Share2, ScanLine, Gift, Network, ArrowUpRight, Clock, Coins } from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@/lib/useWallet';
import { useCommissionLedger, useRecentTransactions } from '@/lib/hooks';
import { formatTokenAmount, shortenAddress } from '@/lib/solana';

export default function ConsumerPage() {
    const publicKey = useWallet();
    const ledger = useCommissionLedger(publicKey, null);
    const txs = useRecentTransactions(publicKey, 4);

    const totalEarned = ledger.data ? formatTokenAmount(ledger.data.totalEarned) : '0';
    const claimed = ledger.data ? formatTokenAmount(ledger.data.totalClaimed) : '0';
    const pending = ledger.data ? formatTokenAmount(ledger.data.claimable) : '0';

    const actions = [
        { icon: Share2, label: 'Share', color: 'var(--crimson)', bg: 'var(--crimson-soft)', href: '/consumer/earn' },
        { icon: ScanLine, label: 'Scan', color: 'var(--jade)', bg: 'var(--jade-soft)', href: '/consumer/scan' },
        { icon: Gift, label: 'Redeem', color: 'var(--gold)', bg: 'var(--gold-soft)', href: '/consumer/scan' },
        { icon: Network, label: 'Tree', color: 'var(--cloud)', bg: 'var(--cloud-soft)', href: '/consumer/profile' },
    ];

    return (
        <>
            <div className="page-top">
                <h1>My Rewards</h1>
                {publicKey && <div className="pill pill-gold">{shortenAddress(publicKey.toBase58())}</div>}
            </div>

            <div className="page-scroll">
                {/* Hero */}
                <div className="consumer-hero">
                    <div className="total-label">Total Earned</div>
                    <div className="total-amount">{totalEarned}</div>
                    <div className="total-unit">tokens</div>
                    <div className="consumer-hero-stats">
                        <div className="consumer-hero-stat">
                            <div className="ch-label">Pending</div>
                            <div className="ch-value">{pending}</div>
                        </div>
                        <div className="consumer-hero-stat">
                            <div className="ch-label">Claimed</div>
                            <div className="ch-value">{claimed}</div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="section">
                    <div className="action-grid">
                        {actions.map((a) => (
                            <Link key={a.label} href={a.href} className="action-btn">
                                <div className="action-btn-icon" style={{ background: a.bg, color: a.color }}>
                                    <a.icon size={22} />
                                </div>
                                <span>{a.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Activity */}
                <div className="section">
                    <div className="section-header">
                        <span className="section-title">Recent Activity</span>
                    </div>
                    {txs.loading ? (
                        <div><div className="loading-pulse" style={{ height: 50, marginBottom: 4 }} /><div className="loading-pulse" style={{ height: 50 }} /></div>
                    ) : txs.data && txs.data.length > 0 ? (
                        <div className="list-card">
                            {txs.data.map((tx) => (
                                <div key={tx.signature} className="list-item">
                                    <div className="list-item-icon" style={{ background: 'var(--jade-soft)', color: 'var(--jade)' }}>
                                        <ArrowUpRight size={16} />
                                    </div>
                                    <div className="list-item-content">
                                        <div className="list-item-title">{tx.type}</div>
                                        <div className="list-item-sub"><Clock size={9} /> {new Date((tx.timestamp ?? 0) * 1000).toLocaleTimeString()}</div>
                                    </div>
                                    <div className="list-item-right">
                                        <div className="list-item-amount">{tx.amount ? formatTokenAmount(tx.amount) : '-'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-state-icon"><Coins size={24} color="var(--text-3)" /></div>
                            <h3>Get Started</h3>
                            <p>Share your referral link to start earning tokens.</p>
                        </div>
                    )}
                </div>

                <div style={{ height: 'var(--s8)' }} />
            </div>
        </>
    );
}
