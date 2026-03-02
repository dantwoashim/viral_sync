'use client';

import React from 'react';
import { ShieldAlert, Clock, CheckCircle, AlertTriangle, Lock, ChevronRight } from 'lucide-react';
import { useDisputeRecords, useMerchantReputation, useMerchantBond } from '@/lib/hooks';
import { useWallet } from '@/lib/useWallet';
import { lamportsToSol, shortenAddress } from '@/lib/solana';

export default function DisputesPage() {
    const publicKey = useWallet();
    const disputes = useDisputeRecords(publicKey);
    const rep = useMerchantReputation(publicKey);
    const bond = useMerchantBond(publicKey);

    const bondAmount = bond.data ? lamportsToSol(bond.data.bondedLamports) : '-';

    return (
        <>
            <div className="page-top">
                <h1>Disputes</h1>
                {disputes.data && disputes.data.length > 0 && (
                    <div className="pill pill-gold">{disputes.data.length} total</div>
                )}
            </div>

            <div className="page-scroll">
                {/* Bond */}
                <div className="scroll-card" style={{ padding: 'var(--s5)', marginBottom: 'var(--s4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s4)' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-sm)', background: 'var(--jade-soft)', color: 'var(--jade)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Lock size={18} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700 }}>Merchant Bond</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                                {bond.loading ? 'Loading...' : bond.data ? (bond.data.isLocked ? 'Secured' : 'Unlocked') : 'Not initialized'}
                            </div>
                        </div>
                    </div>
                    <div className="metric-row"><span className="metric-label">Bond Amount</span><span className="metric-value">{bondAmount} SOL</span></div>
                    {bond.data && (
                        <div className="metric-row"><span className="metric-label">Min Required</span><span className="metric-value">{lamportsToSol(bond.data.minRequiredLamports)} SOL</span></div>
                    )}
                    {rep.data && (
                        <>
                            <div className="metric-row"><span className="metric-label">Reputation</span><span className="metric-value">{rep.data.reputationScore} / 100</span></div>
                            <div className="metric-row"><span className="metric-label">Suspicion</span><span className="metric-value">{rep.data.suspicionScore} / 100</span></div>
                            <div className="metric-row"><span className="metric-label">Timeout Disputes</span><span className="metric-value">{rep.data.timeoutDisputes}</span></div>
                        </>
                    )}
                </div>

                {/* Dispute List */}
                <div className="section">
                    <div className="section-header">
                        <span className="section-title"><ShieldAlert size={14} /> Dispute History</span>
                    </div>
                    {disputes.loading ? (
                        <div><div className="loading-pulse" style={{ height: 52, marginBottom: 4 }} /><div className="loading-pulse" style={{ height: 52 }} /></div>
                    ) : disputes.data && disputes.data.length > 0 ? (
                        <div className="list-card">
                            {disputes.data.map((d, i) => {
                                const statusKey = Object.keys(d.status)[0] || 'pending';
                                const isResolved = statusKey.toLowerCase().includes('resolved');
                                const Icon = isResolved ? CheckCircle : Clock;
                                return (
                                    <div key={i} className="list-item">
                                        <div className="list-item-icon" style={{
                                            background: isResolved ? 'var(--jade-soft)' : 'var(--gold-soft)',
                                            color: isResolved ? 'var(--jade)' : 'var(--gold)'
                                        }}>
                                            <Icon size={16} />
                                        </div>
                                        <div className="list-item-content">
                                            <div className="list-item-title">Dispute #{i + 1}</div>
                                            <div className="list-item-sub">
                                                Stake: {lamportsToSol(d.stakeLamports)} SOL · {new Date(d.raisedAt * 1000).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="list-item-right">
                                            <span className={`pill ${isResolved ? 'pill-jade' : 'pill-gold'}`}>{statusKey}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-state-icon"><ShieldAlert size={24} color="var(--text-3)" /></div>
                            <h3>Clean Record</h3>
                            <p>No disputes filed. Clean record!</p>
                        </div>
                    )}
                </div>

                <div style={{ height: 'var(--s8)' }} />
            </div>
        </>
    );
}
