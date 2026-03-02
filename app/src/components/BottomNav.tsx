'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { BarChart3, TrendingUp, Scan, Wallet, Settings, Share2, User, Gift } from 'lucide-react';

const merchantTabs = [
    { href: '/', label: 'Home', icon: BarChart3 },
    { href: '/oracle', label: 'Oracle', icon: TrendingUp },
    { href: '/pos', label: 'POS', icon: Scan },
    { href: '/network', label: 'Network', icon: Share2 },
    { href: '/settings', label: 'More', icon: Settings },
];

const consumerTabs = [
    { href: '/consumer', label: 'Home', icon: Wallet },
    { href: '/consumer/earn', label: 'Earn', icon: Gift },
    { href: '/consumer/scan', label: 'Scan', icon: Scan },
    { href: '/consumer/profile', label: 'Profile', icon: User },
    { href: '/settings', label: 'More', icon: Settings },
];

export default function BottomNav() {
    const pathname = usePathname();
    const { role } = useAuth();

    const tabs = role === 'consumer' ? consumerTabs : merchantTabs;

    const isActive = (href: string) => {
        if (href === '/' || href === '/consumer') return pathname === href;
        return pathname.startsWith(href);
    };

    return (
        <nav className="bottom-nav">
            {tabs.map((tab) => (
                <Link key={tab.href} href={tab.href} className={`nav-item ${isActive(tab.href) ? 'active' : ''}`}>
                    <tab.icon size={22} strokeWidth={isActive(tab.href) ? 2.2 : 1.6} />
                    <span>{tab.label}</span>
                </Link>
            ))}
        </nav>
    );
}
