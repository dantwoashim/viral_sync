'use client';

import React from 'react';
import { Wifi, Home, Zap } from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@/lib/useWallet';
import { shortenAddress } from '@/lib/solana';

export default function POSPage() {
    const publicKey = useWallet();

    return (
        <div className="pos-screen">
            <div className="pos-header">
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)' }}>
                    <Home size={16} /> Merchant
                </Link>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-2)' }}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="pill pill-jade">● Online</div>
            </div>

            {/* NFC Ring */}
            <div className="pos-nfc-ring">
                <Wifi size={56} color="var(--gold)" style={{ opacity: 0.5 }} />
            </div>

            <h2 style={{ fontFamily: 'var(--font-serif)', marginBottom: 4 }}>Ready to Scan</h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center', maxWidth: 240 }}>
                Ask customer to tap their phone or present QR code
            </p>

            {publicKey && (
                <div style={{ marginTop: 'var(--s4)', fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                    Terminal: {shortenAddress(publicKey.toBase58())}
                </div>
            )}

            {/* Status */}
            <div className="pos-stats">
                <div className="pos-stat">
                    <div className="pos-stat-val" style={{ color: 'var(--jade)' }}>-</div>
                    <div className="pos-stat-label">Today</div>
                </div>
                <div className="pos-stat">
                    <div className="pos-stat-val">-</div>
                    <div className="pos-stat-label">Failed</div>
                </div>
                <div className="pos-stat">
                    <div className="pos-stat-val" style={{ color: 'var(--gold)' }}>-</div>
                    <div className="pos-stat-label">Tokens</div>
                </div>
            </div>

            {/* Empty state */}
            <div className="section" style={{ width: '100%', marginTop: 'var(--s6)' }}>
                <div className="section-header"><span className="section-title">Recent Scans</span></div>
                <div className="empty-state">
                    <div className="empty-state-icon"><Zap size={24} color="var(--text-3)" /></div>
                    <h3>Ready for Scans</h3>
                    <p>Scan events will appear here. Connect a customer to begin.</p>
                </div>
            </div>
        </div>
    );
}
