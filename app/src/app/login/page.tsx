'use client';

import React, { useEffect, useRef, Suspense } from 'react';
import { Zap, Store, Smartphone, CheckCircle, ArrowRight, LogIn, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { APP_MODE, DEMO_MODE_ENABLED } from '@/lib/solana';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="login-screen">
                <div className="login-logo"><Zap size={30} color="white" /></div>
                <h1 className="login-title">Viral Sync</h1>
                <p className="login-subtitle">Loading...</p>
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}

function LoginContent() {
    const { authenticated, login, setRole, role, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pendingRole = useRef<'merchant' | 'consumer' | null>(null);
    const switchRequested = searchParams.get('switch') === '1';
    const switchMode = authenticated && (switchRequested || !role);

    // Detect if we got here via "Switch Role" (already authenticated)
    useEffect(() => {
        if (authenticated && !pendingRole.current) {
            if (switchRequested && role) {
                // User wants to pick a new role - stay on this page
                setRole(null);
            } else if (!switchRequested && role) {
                // Normal visit while already logged in - redirect to dashboard
                router.replace(role === 'merchant' ? '/' : '/consumer');
            }
        }
    }, [authenticated, role, router, setRole, switchRequested]);

    // When auth completes + we have a pending role, set it and redirect
    useEffect(() => {
        if (authenticated && pendingRole.current) {
            const dest = pendingRole.current === 'merchant' ? '/' : '/consumer';
            setRole(pendingRole.current);
            pendingRole.current = null;
            router.push(dest);
        }
    }, [authenticated, setRole, router]);

    const handleMerchant = () => {
        pendingRole.current = 'merchant';
        if (authenticated) {
            setRole('merchant');
            pendingRole.current = null;
            router.push('/');
        } else {
            login();
        }
    };

    const handleConsumer = () => {
        pendingRole.current = 'consumer';
        if (authenticated) {
            setRole('consumer');
            pendingRole.current = null;
            router.push('/consumer');
        } else {
            login();
        }
    };

    if (loading) {
        return (
            <div className="login-screen">
                <div className="login-logo"><Zap size={30} color="white" /></div>
                <h1 className="login-title">Viral Sync</h1>
                <p className="login-subtitle">Loading...</p>
            </div>
        );
    }

    return (
        <div className="login-screen">
            <div className="login-logo"><Zap size={30} color="white" /></div>

            <h1 className="login-title">Viral Sync</h1>
            <p className="login-subtitle">
                {switchMode
                    ? 'Switch your role. Pick how you want to use Viral Sync.'
                    : APP_MODE === 'demo'
                        ? 'Demo mode is active. Mock data is available and wallet login remains optional.'
                        : DEMO_MODE_ENABLED
                            ? 'Live mode uses wallet-backed access. A separate demo sandbox is available when explicitly enabled.'
                            : 'Live mode is active. Wallet-backed access is required for every session.'}
            </p>

            {switchMode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(45,138,99,0.1)', borderRadius: 12, marginBottom: 16, fontSize: 13, color: 'var(--jade, #2D8A63)' }}>
                    <RefreshCw size={14} /> Switching roles
                </div>
            )}

            <div className="login-cards">
                {/* Merchant */}
                <button
                    className="login-card scroll-card"
                    onClick={handleMerchant}
                    style={{ textAlign: 'left', width: '100%' }}
                    data-testid="login-role-merchant"
                >
                    <div className="login-card-icon" style={{ background: 'var(--crimson-soft)', color: 'var(--crimson)' }}>
                        <Store size={26} />
                    </div>
                    <h3 style={{ textAlign: 'center' }}>For Businesses</h3>
                    <p style={{ textAlign: 'center' }}>Dashboard, analytics, and POS terminal</p>
                    <ul className="login-card-features">
                        <li><CheckCircle size={13} color="var(--jade)" /> Real-time referral analytics</li>
                        <li><CheckCircle size={13} color="var(--jade)" /> NFC / QR redemption terminal</li>
                        <li><CheckCircle size={13} color="var(--jade)" /> Viral coefficient tracking</li>
                    </ul>
                    <div className="login-card-cta" style={{ color: 'var(--crimson)', justifyContent: 'center' }}>
                        <LogIn size={15} /> Enter as Merchant <ArrowRight size={15} />
                    </div>
                </button>

                {/* Consumer */}
                <button
                    className="login-card scroll-card"
                    onClick={handleConsumer}
                    style={{ textAlign: 'left', width: '100%' }}
                    data-testid="login-role-consumer"
                >
                    <div className="login-card-icon" style={{ background: 'var(--jade-soft)', color: 'var(--jade)' }}>
                        <Smartphone size={26} />
                    </div>
                    <h3 style={{ textAlign: 'center' }}>For Customers</h3>
                    <p style={{ textAlign: 'center' }}>Share, earn, and redeem rewards effortlessly</p>
                    <ul className="login-card-features">
                        <li><CheckCircle size={13} color="var(--jade)" /> No fees on referrals</li>
                        <li><CheckCircle size={13} color="var(--jade)" /> Wallet-signed access</li>
                        <li><CheckCircle size={13} color="var(--jade)" /> Automatic reward tracking</li>
                    </ul>
                    <div className="login-card-cta" style={{ color: 'var(--jade)', justifyContent: 'center' }}>
                        <LogIn size={15} /> Enter as Consumer <ArrowRight size={15} />
                    </div>
                </button>
            </div>
        </div>
    );
}
