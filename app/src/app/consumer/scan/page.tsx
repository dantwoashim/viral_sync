'use client';

import React, { useState } from 'react';
import { QrCode, Camera, Zap, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useWallet } from '@/lib/useWallet';
import { shortenAddress } from '@/lib/solana';

type ScanState = 'idle' | 'scanning' | 'success' | 'error';

export default function ScanPage() {
    const publicKey = useWallet();
    const [state, setState] = useState<ScanState>('idle');
    const [inputCode, setInputCode] = useState('');

    const handleScan = () => {
        if (!inputCode.trim()) return;
        setState('scanning');
        // Simulate NFC/QR processing (would be real in production)
        setTimeout(() => {
            setState(inputCode.length >= 4 ? 'success' : 'error');
            setTimeout(() => setState('idle'), 3000);
        }, 1500);
    };

    return (
        <>
            <div className="page-top">
                <h1>Scan</h1>
                {publicKey && <div className="pill pill-gold">{shortenAddress(publicKey.toBase58())}</div>}
            </div>

            <div className="page-scroll">
                {/* Scanner */}
                <div className="scroll-card" style={{ padding: 'var(--s6)', textAlign: 'center' }}>
                    <div style={{
                        width: 140, height: 140, borderRadius: '50%',
                        border: `2px solid ${state === 'success' ? 'var(--jade)' : state === 'error' ? 'var(--crimson)' : 'var(--gold)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto var(--s5)',
                        boxShadow: state === 'scanning' ? '0 0 40px var(--gold-glow)' : '0 0 20px var(--gold-glow)',
                        animation: state === 'scanning' ? 'breathe 1s ease-in-out infinite' : 'breathe 4s ease-in-out infinite',
                    }}>
                        {state === 'success' ? <CheckCircle size={48} color="var(--jade)" /> :
                            state === 'error' ? <XCircle size={48} color="var(--crimson)" /> :
                                state === 'scanning' ? <Zap size={48} color="var(--gold)" /> :
                                    <QrCode size={48} color="var(--gold)" style={{ opacity: 0.5 }} />}
                    </div>

                    <h2 style={{ fontFamily: 'var(--font-serif)', marginBottom: 4 }}>
                        {state === 'success' ? 'Redeemed!' :
                            state === 'error' ? 'Invalid Code' :
                                state === 'scanning' ? 'Processing...' :
                                    'Scan to Redeem'}
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: 240, margin: '0 auto' }}>
                        {state === 'success' ? 'Tokens have been credited to your account.' :
                            state === 'error' ? 'The code was invalid or expired.' :
                                'Enter a merchant code or tap NFC to redeem tokens.'}
                    </p>
                </div>

                {/* Manual Code Entry */}
                <div className="scroll-card" style={{ padding: 'var(--s5)', marginTop: 'var(--s4)' }}>
                    <h3 style={{ marginBottom: 'var(--s3)' }}>
                        <Camera size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                        Enter Code Manually
                    </h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input
                            type="text"
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value)}
                            placeholder="ABCD-1234"
                            style={{
                                flex: 1, padding: '12px 14px', background: 'var(--mist-strong)',
                                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                                color: 'var(--text-1)', fontFamily: 'var(--font-mono)', fontSize: 14,
                                outline: 'none',
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--border-gold)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                        />
                        <button
                            onClick={handleScan}
                            disabled={state === 'scanning'}
                            style={{
                                padding: '12px 20px',
                                background: state === 'scanning' ? 'var(--mist-strong)' : 'linear-gradient(135deg, var(--gold), var(--dawn))',
                                color: state === 'scanning' ? 'var(--text-3)' : 'var(--ink)',
                                borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 14,
                                opacity: state === 'scanning' ? 0.7 : 1,
                            }}
                        >
                            {state === 'scanning' ? '...' : 'Redeem'}
                        </button>
                    </div>
                </div>

                {/* Help */}
                <div className="section" style={{ marginTop: 'var(--s5)' }}>
                    <div className="scroll-card" style={{ padding: 'var(--s4)' }}>
                        <div className="metric-row">
                            <span className="metric-label">How it works</span>
                            <span className="metric-value" style={{ fontSize: 12 }}>3 steps</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginTop: 'var(--s2)' }}>
                            1. Get a redemption code from a merchant<br />
                            2. Enter it above or tap NFC at the POS<br />
                            3. Tokens are credited to your account instantly
                        </div>
                    </div>
                </div>

                <div style={{ height: 'var(--s8)' }} />
            </div>
        </>
    );
}
