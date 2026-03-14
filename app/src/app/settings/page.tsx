'use client';

import React, { useState } from 'react';
import { useTheme } from '@/app/providers';
import { ChevronRight, Shield, Bell, Globe, Key, HelpCircle, LogOut, Coins, User, Moon, Sun } from 'lucide-react';
import { useWallet } from '@/lib/useWallet';
import { useAuth } from '@/lib/auth';
import { useMerchantConfig } from '@/lib/hooks';
import { shortenAddress, bpsToPercent, SUPPORT_LINKS } from '@/lib/solana';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const publicKey = useWallet();
    const { logout, displayName, loginMethod, role } = useAuth();
    const config = useMerchantConfig(publicKey);
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();

    const [notifs, setNotifs] = useState(true);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const handleLogout = () => {
        void logout();
        router.push('/login');
    };

    return (
        <>
            <div className="page-top"><h1>Settings</h1></div>

            <div className="page-scroll">
                <div className="scroll-card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s4)', padding: 'var(--s5)', marginBottom: 'var(--s5)' }}>
                    <div style={{ width: 50, height: 50, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--crimson), var(--gold))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={22} color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-serif)' }}>
                            {displayName || (role === 'merchant' ? 'Merchant' : 'Consumer')}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                            {publicKey ? shortenAddress(publicKey.toBase58()) : 'Not connected'}
                        </div>
                        {loginMethod && <div className="pill pill-gold" style={{ marginTop: 4 }}>{loginMethod === 'wallet' ? 'Wallet' : 'Demo'}</div>}
                    </div>
                </div>

                {role === 'merchant' && (
                    <div className="section">
                        <div className="section-header"><span className="section-title">Merchant</span></div>
                        <div className="list-card">
                            <button className="list-item" onClick={() => router.push('/oracle')} style={{ width: '100%', textAlign: 'left' }}>
                                <div className="list-item-icon" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}><Coins size={16} /></div>
                                <div className="list-item-content">
                                    <div className="list-item-title">Token Configuration</div>
                                    <div className="list-item-sub">
                                        {config.data ? `${bpsToPercent(config.data.commissionRateBps)}% commission · ${config.data.tokenExpiryDays}d expiry` : 'View in Oracle'}
                                    </div>
                                </div>
                                <ChevronRight size={14} color="var(--text-hint)" />
                            </button>
                            <button className="list-item" onClick={() => router.push('/disputes')} style={{ width: '100%', textAlign: 'left' }}>
                                <div className="list-item-icon" style={{ background: 'var(--jade-soft)', color: 'var(--jade)' }}><Shield size={16} /></div>
                                <div className="list-item-content">
                                    <div className="list-item-title">Security & Bond</div>
                                    <div className="list-item-sub">View disputes and bond status</div>
                                </div>
                                <ChevronRight size={14} color="var(--text-hint)" />
                            </button>
                            <button className="list-item" onClick={() => router.push('/network')} style={{ width: '100%', textAlign: 'left' }}>
                                <div className="list-item-icon" style={{ background: 'var(--cloud-soft)', color: 'var(--cloud)' }}><Globe size={16} /></div>
                                <div className="list-item-content">
                                    <div className="list-item-title">Network & Referrals</div>
                                    <div className="list-item-sub">View referral graph</div>
                                </div>
                                <ChevronRight size={14} color="var(--text-hint)" />
                            </button>
                        </div>
                    </div>
                )}

                <div className="section">
                    <div className="section-header"><span className="section-title">App</span></div>
                    <div className="list-card">
                        <button className="list-item" onClick={toggleTheme} style={{ width: '100%', textAlign: 'left' }}>
                            <div className="list-item-icon" style={{ background: 'var(--cloud-soft)', color: 'var(--cloud)' }}>
                                {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                            </div>
                            <div className="list-item-content">
                                <div className="list-item-title">Dark Mode</div>
                                <div className="list-item-sub">{theme === 'dark' ? 'On' : 'Off'}</div>
                            </div>
                            <div style={{ width: 40, height: 22, borderRadius: 'var(--radius-full)', background: theme === 'dark' ? 'var(--jade)' : 'var(--mist-strong)', padding: 2, transition: 'all 0.2s ease', cursor: 'pointer' }}>
                                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', transform: theme === 'dark' ? 'translateX(18px)' : 'translateX(0)', transition: 'transform 0.2s ease' }} />
                            </div>
                        </button>

                        <button className="list-item" onClick={() => setNotifs(!notifs)} style={{ width: '100%', textAlign: 'left' }}>
                            <div className="list-item-icon" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}><Bell size={16} /></div>
                            <div className="list-item-content">
                                <div className="list-item-title">Notifications</div>
                                <div className="list-item-sub">{notifs ? 'Enabled (Dialect)' : 'Disabled'}</div>
                            </div>
                            <div style={{ width: 40, height: 22, borderRadius: 'var(--radius-full)', background: notifs ? 'var(--jade)' : 'var(--mist-strong)', padding: 2, transition: 'all 0.2s ease' }}>
                                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', transform: notifs ? 'translateX(18px)' : 'translateX(0)', transition: 'transform 0.2s ease' }} />
                            </div>
                        </button>

                        <div className="list-item">
                            <div className="list-item-icon" style={{ background: 'var(--crimson-soft)', color: 'var(--crimson)' }}><Key size={16} /></div>
                            <div className="list-item-content">
                                <div className="list-item-title">Connected Wallet</div>
                                <div className="list-item-sub" style={{ fontFamily: 'var(--font-mono)' }}>
                                    {publicKey ? shortenAddress(publicKey.toBase58()) : 'No account connected'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="section">
                    <div className="section-header"><span className="section-title">Support</span></div>
                    <div className="list-card">
                        <a href={SUPPORT_LINKS.docs} target="_blank" rel="noopener noreferrer" className="list-item">
                            <div className="list-item-icon" style={{ background: 'var(--mist)', color: 'var(--text-2)' }}><HelpCircle size={16} /></div>
                            <div className="list-item-content">
                                <div className="list-item-title">Documentation</div>
                                <div className="list-item-sub">Deployment notes and usage guides</div>
                            </div>
                            <ChevronRight size={14} color="var(--text-hint)" />
                        </a>
                        <a href={SUPPORT_LINKS.repository} target="_blank" rel="noopener noreferrer" className="list-item">
                            <div className="list-item-icon" style={{ background: 'var(--cloud-soft)', color: 'var(--cloud)' }}><HelpCircle size={16} /></div>
                            <div className="list-item-content">
                                <div className="list-item-title">Repository</div>
                                <div className="list-item-sub">Source code, issues, and release history</div>
                            </div>
                            <ChevronRight size={14} color="var(--text-hint)" />
                        </a>

                        <button
                            className="list-item"
                            onClick={() => router.push('/login?switch=1')}
                            style={{ width: '100%', textAlign: 'left' }}
                            data-testid="settings-switch-role"
                        >
                            <div className="list-item-icon" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}><User size={16} /></div>
                            <div className="list-item-content">
                                <div className="list-item-title">Switch Role</div>
                                <div className="list-item-sub">Currently: {role || 'None'}</div>
                            </div>
                            <ChevronRight size={14} color="var(--text-hint)" />
                        </button>

                        {!showLogoutConfirm ? (
                            <button
                                className="list-item"
                                onClick={() => setShowLogoutConfirm(true)}
                                style={{ width: '100%', textAlign: 'left' }}
                                data-testid="settings-sign-out"
                            >
                                <div className="list-item-icon" style={{ background: 'var(--crimson-soft)', color: 'var(--crimson)' }}><LogOut size={16} /></div>
                                <div className="list-item-content">
                                    <div className="list-item-title" style={{ color: 'var(--crimson)' }}>Sign Out</div>
                                </div>
                            </button>
                        ) : (
                            <div className="list-item" style={{ gap: 'var(--s2)' }}>
                                <div className="list-item-content">
                                    <div className="list-item-title">Sign out?</div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    style={{ padding: '6px 16px', background: 'var(--crimson)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13 }}
                                    data-testid="settings-sign-out-confirm"
                                >
                                    Yes
                                </button>
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    style={{ padding: '6px 16px', background: 'var(--mist-strong)', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13 }}
                                    data-testid="settings-sign-out-cancel"
                                >
                                    No
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ height: 'var(--s8)' }} />
            </div>
        </>
    );
}
