'use client';

import React from 'react';
import DataModeBadge from '@/components/DataModeBadge';
import { Network, Users, TrendingUp } from 'lucide-react';
import { useNetworkGraph, useMerchantConfig } from '@/lib/hooks';
import { useWallet } from '@/lib/useWallet';
import { formatTokenAmount } from '@/lib/solana';

export default function NetworkPage() {
    const publicKey = useWallet(true);
    const config = useMerchantConfig(publicKey);
    const graph = useNetworkGraph(config.data?.mint ?? null);

    const nodes = graph.data?.nodes ?? [];
    const edges = graph.data?.edges ?? [];

    // Sort nodes by total lifetime tokens (best referrers first)
    const sortedNodes = [...nodes].sort((a, b) => b.totalLifetime - a.totalLifetime);

    return (
        <>
            <div className="page-top">
                <h1>Network</h1>
                <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
                    <DataModeBadge states={[config, graph]} />
                    {nodes.length > 0 && <div className="pill pill-gold"><Users size={12} /> {nodes.length}</div>}
                </div>
            </div>

            <div className="page-scroll">
                {/* Stats */}
                <div className="stats-grid" style={{ marginBottom: 'var(--s4)' }}>
                    <div className="stat-card scroll-card">
                        <div className="stat-label">Nodes</div>
                        <div className="stat-value">{graph.loading ? '...' : nodes.length}</div>
                    </div>
                    <div className="stat-card scroll-card">
                        <div className="stat-label">Edges</div>
                        <div className="stat-value">{graph.loading ? '...' : edges.length}</div>
                    </div>
                    <div className="stat-card scroll-card">
                        <div className="stat-label">Avg Refs</div>
                        <div className="stat-value">{nodes.length > 0 ? (nodes.reduce((s, n) => s + n.referrerCount, 0) / nodes.length).toFixed(1) : '-'}</div>
                    </div>
                    <div className="stat-card scroll-card">
                        <div className="stat-label">Total Flow</div>
                        <div className="stat-value">{edges.length > 0 ? formatTokenAmount(edges.reduce((s, e) => s + e.tokensAttributed, 0)) : '-'}</div>
                    </div>
                </div>

                {/* Token Distribution */}
                {nodes.length > 0 && (
                    <div className="scroll-card" style={{ padding: 'var(--s5)', marginBottom: 'var(--s4)' }}>
                        <h3 style={{ marginBottom: 'var(--s3)' }}>
                            <Network size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                            Token Distribution
                        </h3>
                        <div className="metric-row">
                            <span className="metric-label">Total Gen-1 Tokens</span>
                            <span className="metric-value">{formatTokenAmount(nodes.reduce((s, n) => s + n.gen1Balance, 0))}</span>
                        </div>
                        <div className="metric-row">
                            <span className="metric-label">Total Gen-2 Tokens</span>
                            <span className="metric-value">{formatTokenAmount(nodes.reduce((s, n) => s + n.gen2Balance, 0))}</span>
                        </div>
                        <div className="metric-row">
                            <span className="metric-label">Dead / Expired</span>
                            <span className="metric-value">{formatTokenAmount(nodes.reduce((s, n) => s + n.deadBalance, 0))}</span>
                        </div>
                    </div>
                )}

                {/* Top Nodes */}
                {sortedNodes.length > 0 && (
                    <div className="section">
                        <div className="section-header">
                            <span className="section-title"><TrendingUp size={14} /> Top Nodes</span>
                        </div>
                        <div className="list-card">
                            {sortedNodes.slice(0, 8).map((n, i) => (
                                <div key={n.id} className="list-item">
                                    <div className="list-item-icon" style={{
                                        background: i < 3 ? 'var(--gold-soft)' : 'var(--mist)',
                                        color: i < 3 ? 'var(--gold)' : 'var(--text-2)',
                                        borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: 14,
                                    }}>
                                        {i + 1}
                                    </div>
                                    <div className="list-item-content">
                                        <div className="list-item-title">{n.address.substring(0, 8)}...{n.address.slice(-4)}</div>
                                        <div className="list-item-sub">
                                            {n.referrerCount} refs · POI: {n.poiScore}
                                        </div>
                                    </div>
                                    <div className="list-item-right">
                                        <div className="list-item-amount" style={{ color: 'var(--jade)' }}>{formatTokenAmount(n.totalLifetime)}</div>
                                        <div className="list-item-time">lifetime</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty */}
                {!graph.loading && nodes.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon"><Network size={24} color="var(--text-3)" /></div>
                        <h3>Network Forming</h3>
                        <p>Once referrals start flowing, the network graph will visualize all connections.</p>
                    </div>
                )}

                <div style={{ height: 'var(--s8)' }} />
            </div>
        </>
    );
}
