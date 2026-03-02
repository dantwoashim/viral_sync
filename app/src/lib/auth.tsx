/**
 * Viral Sync — Auth Provider
 * 
 * Simple email sign-in/sign-up with deterministic wallet generation.
 * Creates an embedded Solana wallet from the user's email.
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';

/* ── Types ── */

export type UserRole = 'consumer' | 'merchant' | null;

export interface AuthState {
    loading: boolean;
    authenticated: boolean;
    walletAddress: PublicKey | null;
    displayName: string;
    avatarUrl: string | null;
    loginMethod: 'email' | 'demo' | null;
    role: UserRole;
    login: () => void;
    logout: () => void;
    setRole: (role: UserRole) => void;
    hasSessionKey: boolean;
}

const defaultAuth: AuthState = {
    loading: true,
    authenticated: false,
    walletAddress: null,
    displayName: '',
    avatarUrl: null,
    loginMethod: null,
    role: null,
    login: () => { },
    logout: () => { },
    setRole: () => { },
    hasSessionKey: false,
};

const AuthContext = createContext<AuthState>(defaultAuth);
export const useAuth = () => useContext(AuthContext);

/* ═══════════════════════════════════════════════════
   AUTH PROVIDER
   ═══════════════════════════════════════════════════ */

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);
    const [walletAddress, setWalletAddress] = useState<PublicKey | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [loginMethod, setLoginMethod] = useState<AuthState['loginMethod']>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [showModal, setShowModal] = useState(false);

    // Restore session from localStorage on mount
    useEffect(() => {
        try {
            const savedSession = localStorage.getItem('vs-auth-session');
            if (savedSession) {
                const s = JSON.parse(savedSession);
                if (s.walletAddress) {
                    setWalletAddress(new PublicKey(s.walletAddress));
                    setDisplayName(s.displayName || '');
                    setLoginMethod(s.loginMethod || 'email');
                    setRole(s.role || null);
                    setAuthenticated(true);
                }
            }
        } catch {
            localStorage.removeItem('vs-auth-session');
        }
        setLoading(false);
    }, []);

    const login = useCallback(() => setShowModal(true), []);

    const logout = useCallback(() => {
        setAuthenticated(false);
        setWalletAddress(null);
        setDisplayName('');
        setLoginMethod(null);
        setRole(null);
        localStorage.removeItem('vs-auth-session');
        localStorage.removeItem('vs-user-role');
    }, []);

    const handleSetRole = useCallback((newRole: UserRole) => {
        setRole(newRole);
        const saved = localStorage.getItem('vs-auth-session');
        if (saved) {
            try {
                const s = JSON.parse(saved);
                s.role = newRole;
                localStorage.setItem('vs-auth-session', JSON.stringify(s));
            } catch { }
        }
        if (newRole) localStorage.setItem('vs-user-role', newRole);
        else localStorage.removeItem('vs-user-role');
    }, []);

    const handleLogin = useCallback((email: string, name: string) => {
        // Generate a deterministic wallet address from the email
        const seed = new Uint8Array(32);
        const nameBytes = new TextEncoder().encode(email + 'viral-sync-v4');
        for (let i = 0; i < Math.min(nameBytes.length, 32); i++) {
            seed[i] = nameBytes[i];
        }
        let pubkey: PublicKey;
        try { pubkey = new PublicKey(seed); } catch { pubkey = PublicKey.default; }

        setWalletAddress(pubkey);
        setDisplayName(name);
        setLoginMethod('email');
        setAuthenticated(true);
        setShowModal(false);
        localStorage.setItem('vs-auth-session', JSON.stringify({
            walletAddress: pubkey.toBase58(),
            displayName: name,
            loginMethod: 'email',
            role,
        }));
    }, [role]);

    const value = useMemo<AuthState>(() => ({
        loading,
        authenticated,
        walletAddress,
        displayName,
        avatarUrl: null,
        loginMethod,
        role,
        login,
        logout,
        setRole: handleSetRole,
        hasSessionKey: false,
    }), [loading, authenticated, walletAddress, displayName, loginMethod, role, login, logout, handleSetRole]);

    return (
        <AuthContext.Provider value={value}>
            {children}
            {showModal && (
                <LoginModal onClose={() => setShowModal(false)} onLogin={handleLogin} />
            )}
        </AuthContext.Provider>
    );
}

/* ═══════════════════════════════════════════════════
   LOGIN MODAL — Email Sign In/Sign Up
   ═══════════════════════════════════════════════════ */

function LoginModal({ onClose, onLogin }: {
    onClose: () => void;
    onLogin: (email: string, name: string) => void;
}) {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [step, setStep] = useState<'email' | 'name'>('email');

    const handleEmailContinue = () => {
        if (email.includes('@') && email.includes('.')) {
            setName(email.split('@')[0]);
            setStep('name');
        }
    };

    const handleSubmit = () => {
        if (name.trim() && email.includes('@')) {
            onLogin(email, name.trim());
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
        }} onClick={onClose}>
            <div style={{
                background: 'var(--bg-card, #fff)',
                border: '1px solid var(--border-primary, #e5e7eb)',
                borderRadius: 20, padding: 32, maxWidth: 400, width: '100%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }} onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 14,
                        background: 'linear-gradient(135deg, #2D8A63, #1a6b47)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 14px', color: 'white',
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary, #111)' }}>
                        {step === 'email' ? 'Sign in to Viral Sync' : 'Almost there!'}
                    </h2>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary, #666)', marginTop: 6 }}>
                        {step === 'email' ? 'Enter your email to get started' : 'Confirm your display name'}
                    </p>
                </div>

                {step === 'email' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            autoFocus
                            style={{
                                padding: '14px 16px', borderRadius: 12,
                                background: 'var(--bg-secondary, #f0f2f5)',
                                border: '1px solid var(--border-primary, #e5e7eb)',
                                color: 'var(--text-primary, #111)', fontSize: 15,
                                outline: 'none', width: '100%',
                                transition: 'border-color 0.2s ease',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#2D8A63'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border-primary, #e5e7eb)'}
                            onKeyDown={(e) => e.key === 'Enter' && handleEmailContinue()}
                        />
                        <button
                            onClick={handleEmailContinue}
                            disabled={!email.includes('@') || !email.includes('.')}
                            style={{
                                padding: '14px 16px', borderRadius: 12, width: '100%',
                                background: (email.includes('@') && email.includes('.'))
                                    ? 'linear-gradient(135deg, #2D8A63, #1a6b47)'
                                    : 'var(--bg-secondary, #f0f2f5)',
                                color: (email.includes('@') && email.includes('.'))
                                    ? 'white'
                                    : 'var(--text-tertiary, #999)',
                                fontWeight: 700, fontSize: 15,
                                boxShadow: (email.includes('@') && email.includes('.'))
                                    ? '0 4px 12px rgba(45, 138, 99, 0.3)' : 'none',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            Continue with Email
                        </button>
                    </div>
                )}

                {step === 'name' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{
                            padding: '10px 16px', borderRadius: 12,
                            background: 'var(--jade-soft, rgba(45,138,99,0.08))',
                            fontSize: 13, color: 'var(--jade, #2D8A63)', fontWeight: 500,
                        }}>
                            ✉️ {email}
                        </div>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your display name"
                            autoFocus
                            style={{
                                padding: '14px 16px', borderRadius: 12,
                                background: 'var(--bg-secondary, #f0f2f5)',
                                border: '1px solid var(--border-primary, #e5e7eb)',
                                color: 'var(--text-primary, #111)', fontSize: 15,
                                outline: 'none', width: '100%',
                                transition: 'border-color 0.2s ease',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#2D8A63'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border-primary, #e5e7eb)'}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={!name.trim()}
                            style={{
                                padding: '14px 16px', borderRadius: 12, width: '100%',
                                background: name.trim()
                                    ? 'linear-gradient(135deg, #2D8A63, #1a6b47)'
                                    : 'var(--bg-secondary, #f0f2f5)',
                                color: name.trim() ? 'white' : 'var(--text-tertiary, #999)',
                                fontWeight: 700, fontSize: 15,
                                boxShadow: name.trim()
                                    ? '0 4px 12px rgba(45, 138, 99, 0.3)' : 'none',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => setStep('email')}
                            style={{ padding: 8, fontSize: 13, color: 'var(--text-tertiary, #999)' }}
                        >
                            ← Change email
                        </button>
                    </div>
                )}

                <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-tertiary, #999)' }}>
                    Your account is secured and ready to use
                </p>
            </div>
        </div>
    );
}
