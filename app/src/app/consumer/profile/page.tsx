'use client';

import React from 'react';
import { User, Coins, TrendingUp, Shield } from 'lucide-react';
import { useWallet } from '@/lib/useWallet';
import { useAuth } from '@/lib/auth';
import { useCommissionLedger, useSolBalance } from '@/lib/hooks';
import { formatTokenAmount, shortenAddress } from '@/lib/solana';

export default function ProfilePage() {
    const publicKey = useWallet();
    const { displayName } = useAuth();
    const ledger = useCommissionLedger(publicKey, null);
    const sol = useSolBalance(publicKey);

    return (
        <>
            <div className="page-top"><h1>Profile</h1></div>

            <div className="page-scroll">
                {/* Avatar */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'var(--s6)' }}>
                    <div style={{ width: 68, height: 68, borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--crimson), var(--gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--s3)' }}>
                        <User size={28} color="white" />
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-serif)' }}>
                        {displayName || (publicKey ? shortenAddress(publicKey.toBase58()) : 'Not Connected')}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                        {publicKey ? publicKey.toBase58().substring(0, 20) + '...' : ''}
                    </div>
                </div>

                {/* Stats */}
                <div className="stats-grid">
                    <div className="stat-card scroll-card">
                        <div className="stat-icon" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}><Coins size={16} /></div>
                        <div className="stat-label">Tokens Earned</div>
                        <div className="stat-value">{ledger.data ? formatTokenAmount(ledger.data.totalEarned) : '-'}</div>
                    </div>
                    <div className="stat-card scroll-card">
                        <div className="stat-icon" style={{ background: 'var(--jade-soft)', color: 'var(--jade)' }}><TrendingUp size={16} /></div>
                        <div className="stat-label">SOL Balance</div>
                        <div className="stat-value">{sol.data !== null && sol.data !== undefined ? sol.data.toFixed(4) : '-'}</div>
                    </div>
                    <div className="stat-card scroll-card">
                        <div className="stat-icon" style={{ background: 'var(--crimson-soft)', color: 'var(--crimson)' }}><Shield size={16} /></div>
                        <div className="stat-label">Claimed</div>
                        <div className="stat-value">{ledger.data ? formatTokenAmount(ledger.data.totalClaimed) : '-'}</div>
                    </div>
                    <div className="stat-card scroll-card">
                        <div className="stat-icon" style={{ background: 'var(--cloud-soft)', color: 'var(--cloud)' }}><Coins size={16} /></div>
                        <div className="stat-label">Pending</div>
                        <div className="stat-value">{ledger.data ? formatTokenAmount(ledger.data.claimable) : '-'}</div>
                    </div>
                </div>

                <div style={{ height: 'var(--s8)' }} />
            </div>
        </>
    );
}
