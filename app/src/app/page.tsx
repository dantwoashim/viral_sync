'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import DataModeBadge from '@/components/DataModeBadge';
import {
  Coins, TrendingUp, Users, Shield, Activity, Clock, Bell,
} from 'lucide-react';
import { useMerchantConfig, useViralOracle, useMerchantReputation, useRecentTransactions } from '@/lib/hooks';
import { useWallet } from '@/lib/useWallet';
import {
  formatTokenAmount,
  bpsToPercent,
  normalizeReputationScore,
  normalizeRiskScore,
  shortenAddress,
} from '@/lib/solana';

export default function DashboardPage() {
  const publicKey = useWallet(true);
  const config = useMerchantConfig(publicKey);
  const oracle = useViralOracle(publicKey);
  const rep = useMerchantReputation(publicKey);
  const txs = useRecentTransactions(publicKey, 5);

  const kFactor = oracle.data ? (oracle.data.kFactor / 100).toFixed(2) : '-';
  const supply = config.data ? formatTokenAmount(config.data.currentSupply) : '-';
  const commission = config.data ? `${bpsToPercent(config.data.commissionRateBps)}%` : '-';
  const reputationScore = rep.data ? normalizeReputationScore(rep.data.reputationScore) : null;
  const suspicionScore = rep.data ? normalizeRiskScore(rep.data.suspicionScore) : null;
  const reputation = reputationScore !== null ? reputationScore.toString() : '-';

  const funnelData = oracle.data ? [
    { name: 'Share', rate: oracle.data.shareRate },
    { name: 'Claim', rate: oracle.data.claimRate },
    { name: 'Redeem', rate: oracle.data.firstRedeemRate },
  ] : [];

  return (
    <>
      <div className="page-top">
        <div>
          <h1>Viral Sync</h1>
          {publicKey && <div className="page-top-sub">{shortenAddress(publicKey.toBase58())}</div>}
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
          <DataModeBadge states={[config, oracle, rep]} />
          <Bell size={18} color="var(--text-2)" />
        </div>
      </div>

      <div className="page-scroll">
        {/* Hero */}
        <div className="scroll-card" style={{ marginBottom: 'var(--s4)' }}>
          <div className="hero-stat">
            <div className="hero-stat-label">Token Supply</div>
            <div className="hero-stat-value">{supply}</div>
            <div className="hero-stat-sub">
              {config.loading ? 'Loading...' : config.data ? `K-Factor: ${kFactor}` : 'Sign in to view'}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card scroll-card">
            <div className="stat-icon" style={{ background: 'var(--jade-soft)', color: 'var(--jade)' }}><Coins size={16} /></div>
            <div className="stat-label">Supply</div>
            <div className="stat-value">{supply}</div>
          </div>
          <div className="stat-card scroll-card">
            <div className="stat-icon" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}><TrendingUp size={16} /></div>
            <div className="stat-label">K-Factor</div>
            <div className="stat-value">{kFactor}</div>
            <div className="stat-sub">{oracle.data && oracle.data.kFactor >= 100 ? 'Viral' : 'Growing'}</div>
          </div>
          <div className="stat-card scroll-card">
            <div className="stat-icon" style={{ background: 'var(--dawn-soft)', color: 'var(--dawn)' }}><Users size={16} /></div>
            <div className="stat-label">Commission</div>
            <div className="stat-value">{commission}</div>
            <div className="stat-sub">{config.data ? `${config.data.tokenExpiryDays}d expiry` : ''}</div>
          </div>
          <div className="stat-card scroll-card">
            <div className="stat-icon" style={{ background: 'var(--cloud-soft)', color: 'var(--cloud)' }}><Shield size={16} /></div>
            <div className="stat-label">Reputation</div>
            <div className="stat-value">{reputation}</div>
            <div className="stat-sub">{reputationScore !== null ? (reputationScore >= 80 ? 'Excellent' : 'Fair') : ''}</div>
          </div>
        </div>

        {/* Funnel */}
        {funnelData.length > 0 && funnelData[0].rate > 0 && (
          <div className="section">
            <div className="chart-wrap scroll-card">
              <h3>Conversion Funnel</h3>
              <div className="chart-sub">Share → Claim → Redeem rates</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={funnelData} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip contentStyle={{ background: 'rgba(11,10,18,0.95)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                  <defs>
                    <linearGradient id="funnelG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--jade)" />
                      <stop offset="100%" stopColor="#2D7A60" />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="rate" fill="url(#funnelG)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Activity */}
        <div className="section">
          <div className="section-header">
            <span className="section-title"><Activity size={14} /> Recent Activity</span>
          </div>
          {txs.loading ? (
            <div><div className="loading-pulse" style={{ height: 52, marginBottom: 4 }} /><div className="loading-pulse" style={{ height: 52, marginBottom: 4 }} /><div className="loading-pulse" style={{ height: 52 }} /></div>
          ) : txs.data && txs.data.length > 0 ? (
            <div className="list-card">
              {txs.data.map((tx) => (
                <div key={tx.signature} className="list-item">
                  <div className="list-item-icon" style={{ background: 'var(--jade-soft)', color: 'var(--jade)' }}>
                    <Activity size={16} />
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
              <div className="empty-state-icon"><Activity size={24} color="var(--text-3)" /></div>
              <h3>No activity yet</h3>
              <p>Transactions will appear here once the referral program is active.</p>
            </div>
          )}
        </div>

        {/* Protocol Health */}
        {rep.data && (
          <div className="section" style={{ marginBottom: 'var(--s8)' }}>
            <div className="section-header"><span className="section-title"><Shield size={14} /> Protocol Health</span></div>
            <div className="scroll-card" style={{ padding: 'var(--s4)' }}>
              <div style={{ marginBottom: 'var(--s4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-2)' }}>Reputation</span>
                  <span className="text-mono" style={{ fontWeight: 700 }}>{reputationScore} / 100</span>
                </div>
                <div className="progress"><div className="progress-fill" style={{ width: `${reputationScore}%`, background: 'var(--jade)' }} /></div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-2)' }}>Suspicion</span>
                  <span className="text-mono" style={{ fontWeight: 700 }}>{suspicionScore} / 100</span>
                </div>
                <div className="progress"><div className="progress-fill" style={{ width: `${suspicionScore}%`, background: (suspicionScore ?? 0) > 50 ? 'var(--crimson)' : 'var(--jade)' }} /></div>
              </div>
            </div>
          </div>
        )}

        <div style={{ height: 'var(--s8)' }} />
      </div>
    </>
  );
}
