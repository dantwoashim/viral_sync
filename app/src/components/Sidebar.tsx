'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/app/providers';
import { useAuth } from '@/lib/auth';
import {
    BarChart3,
    TrendingUp,
    Network,
    ShieldAlert,
    Settings,
    Zap,
} from 'lucide-react';

const merchantNav = [
    { href: '/', label: 'Overview', icon: BarChart3 },
    { href: '/oracle', label: 'Viral Oracle', icon: TrendingUp },
    { href: '/network', label: 'Network Graph', icon: Network },
    { href: '/disputes', label: 'Disputes', icon: ShieldAlert },
    { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();
    const { displayName, role } = useAuth();

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <Zap size={18} />
                </div>
                <span className="sidebar-logo-text">Viral Sync</span>
            </div>

            <div className="sidebar-label">Merchant Dashboard</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {merchantNav.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`sidebar-item ${pathname === item.href ? 'active' : ''}`}
                    >
                        <item.icon size={18} />
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div style={{ flex: 1 }} />

            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--s3)',
                borderTop: '1px solid var(--border-primary)',
                marginTop: 'var(--s4)',
            }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                </span>
                <button
                    onClick={toggleTheme}
                    className="theme-toggle"
                    aria-label="Toggle theme"
                >
                    <div className="theme-toggle-knob" />
                </button>
            </div>

            <div style={{
                padding: 'var(--s3)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--s3)',
            }}>
                <div className="avatar" style={{
                    background: 'var(--jade-soft)',
                    color: 'var(--jade)',
                }}>
                    {(displayName || 'M').charAt(0).toUpperCase()}
                </div>
                <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {displayName || 'Merchant Co.'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        {role === 'consumer' ? 'Consumer' : 'Premium Plan'}
                    </div>
                </div>
            </div>
        </aside>
    );
}
