'use client';

import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid,
} from 'recharts';
import { Target, Zap, BarChart3, Eye } from 'lucide-react';
import { useViralOracle, useMerchantConfig } from '@/lib/hooks';
import { useWallet } from '@/lib/useWallet';
import { bpsToPercent } from '@/lib/solana';

export default function OraclePage() {
    const publicKey = useWallet();
    const oracle = useViralOracle(publicKey);
    const config = useMerchantConfig(publicKey);

    const kFactor = oracle.data ? oracle.data.kFactor / 100 : 0; // stored as bps
    const isViral = kFactor >= 1.0;

    const funnelPct = oracle.data ? {
        shared: oracle.data.shareRate,
        claimed: oracle.data.claimRate,
        redeemed: oracle.data.firstRedeemRate,
    } : { shared: 0, claimed: 0, redeemed: 0 };

    const funnelData = oracle.data ? [
        { stage: 'Shared', rate: funnelPct.shared },
        { stage: 'Claimed', rate: funnelPct.claimed },
        { stage: 'Redeemed', rate: funnelPct.redeemed },
    ] : [];

    return (
        <>
            <div className="page-top">
                <h1>Viral Oracle</h1>
                {oracle.data && <div className="pill pill-jade">● {oracle.data.dataPoints} pts</div>}
            </div>

            <div className="page-scroll">
                {/* K-Factor Hero */}
                <div className="scroll-card" style={{ marginBottom: 'var(--s4)' }}>
                    <div className="hero-stat">
                        <div className="hero-stat-label">Viral Coefficient</div>
                        <div className="hero-stat-value">
                            {oracle.loading ? '...' : oracle.data ? kFactor.toFixed(2) : '-'}
                        </div>
                        {oracle.data && (
                            <div style={{ marginTop: 'var(--s3)' }}>
                                <span className={`pill ${isViral ? 'pill-jade' : 'pill-gold'}`}>
                                    {isViral ? '✦ Viral' : '○ Sub-Viral'}
                                </span>
                            </div>
                        )}
                        <div className="hero-stat-sub">
                            {oracle.loading ? 'Loading...' : oracle.data ? `Each referrer generates ${kFactor.toFixed(2)} new customers on average` : 'No oracle data yet'}
                        </div>
                    </div>
                </div>

                {/* CSS Funnel */}
                {oracle.data && funnelPct.shared > 0 && (
                    <div className="chart-wrap scroll-card">
                        <h3><Target size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />Conversion Funnel</h3>
                        <div className="chart-sub">Share → Claim → Redeem rates (%)</div>
                        <div className="funnel">
                            <div className="funnel-row">
                                <div className="funnel-label">Shared</div>
                                <div className="funnel-bar-wrap">
                                    <div className="funnel-bar" style={{ width: `${Math.max(funnelPct.shared, 5)}%`, background: 'linear-gradient(90deg, var(--crimson), #A01830)' }}>
                                        <span>{funnelPct.shared}%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="funnel-row">
                                <div className="funnel-label">Claimed</div>
                                <div className="funnel-bar-wrap">
                                    <div className="funnel-bar" style={{ width: `${Math.max(funnelPct.claimed, 5)}%`, background: 'linear-gradient(90deg, var(--jade), #2D7A60)' }}>
                                        <span>{funnelPct.claimed}%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="funnel-row">
                                <div className="funnel-label">Redeemed</div>
                                <div className="funnel-bar-wrap">
                                    <div className="funnel-bar" style={{ width: `${Math.max(funnelPct.redeemed, 5)}%`, background: 'linear-gradient(90deg, var(--cloud), #6B5AAE)' }}>
                                        <span>{funnelPct.redeemed}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Metrics */}
                {oracle.data && (
                    <div className="section">
                        <div className="section-header"><span className="section-title"><Zap size={14} /> Metrics</span></div>
                        <div className="scroll-card" style={{ padding: 'var(--s4)' }}>
                            <div className="metric-row"><span className="metric-label">K-Factor</span><span className="metric-value">{kFactor.toFixed(2)}</span></div>
                            <div className="metric-row"><span className="metric-label">Median Refs/User</span><span className="metric-value">{oracle.data.medianReferralsPerUser}</span></div>
                            <div className="metric-row"><span className="metric-label">P90 Refs/User</span><span className="metric-value">{oracle.data.p90ReferralsPerUser}</span></div>
                            <div className="metric-row"><span className="metric-label">Avg Share→Claim</span><span className="metric-value">{Math.round(oracle.data.avgTimeShareToClaimSecs / 3600)}h</span></div>
                            <div className="metric-row"><span className="metric-label">Avg Claim→Redeem</span><span className="metric-value">{Math.round(oracle.data.avgTimeClaimToRedeemSecs / 3600)}h</span></div>
                            <div className="metric-row"><span className="metric-label">vs Google Ads</span><span className="metric-value">{bpsToPercent(oracle.data.vsGoogleAdsEfficiencyBps)}%</span></div>
                            <div className="metric-row"><span className="metric-label">Data Points</span><span className="metric-value">{oracle.data.dataPoints}</span></div>
                            <div className="metric-row"><span className="metric-label">Last Computed</span><span className="metric-value">{new Date(oracle.data.computedAt * 1000).toLocaleString()}</span></div>
                        </div>
                    </div>
                )}

                {/* Empty */}
                {!oracle.loading && !oracle.data && (
                    <div className="empty-state">
                        <div className="empty-state-icon"><Eye size={24} color="var(--text-3)" /></div>
                        <h3>Oracle Awaits</h3>
                        <p>The analytics engine will compute your K-Factor once referral data starts flowing.</p>
                    </div>
                )}

                <div style={{ height: 'var(--s8)' }} />
            </div>
        </>
    );
}
