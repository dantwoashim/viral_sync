'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';

export default function MerchantShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const hideNav = pathname === '/login';

    if (hideNav) {
        return <>{children}</>;
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                {children}
            </div>
            <BottomNav />
        </div>
    );
}
