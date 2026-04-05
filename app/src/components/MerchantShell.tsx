'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  BookOpen,
  ChartBar,
  Compass,
  House,
  Megaphone,
  QrCode,
  Receipt,
  ShareNetwork,
  Storefront,
  UserCircle,
  UsersThree,
} from '@phosphor-icons/react';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/lib/auth';

const consumerTabs = [
  { href: '/', label: 'Home', icon: House },
  { href: '/passbook', label: 'Passbook', icon: BookOpen },
  { href: '/routes', label: 'Routes', icon: Compass },
  { href: '/invite', label: 'Invite', icon: ShareNetwork },
  { href: '/profile', label: 'Profile', icon: UserCircle },
];

const merchantTabs = [
  { href: '/merchant/today', label: 'Today', icon: ChartBar },
  { href: '/merchant/scan', label: 'Scan', icon: QrCode },
  { href: '/merchant/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/merchant/customers', label: 'Customers', icon: UsersThree },
  { href: '/merchant/ledger', label: 'Ledger', icon: Receipt },
];

export default function MerchantShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { displayName, setRole } = useAuth();

  const hideChrome = pathname === '/login';
  const mode = pathname.startsWith('/merchant') ? 'merchant' : 'consumer';
  const tabs = mode === 'merchant' ? merchantTabs : consumerTabs;

  useEffect(() => {
    if (!hideChrome) {
      setRole(mode);
    }
  }, [hideChrome, mode, setRole]);

  if (hideChrome) {
    return <>{children}</>;
  }

  return (
    <div className="vs-shell">
      <aside className="vs-rail">
        <div className="vs-rail-brand">
          <div className="vs-brand-mark">
            <Storefront size={18} weight="duotone" />
            Viral Sync Nepal
          </div>
          <div className="vs-brand-name">
            {mode === 'merchant' ? 'Merchant Mode' : 'Consumer Mode'}
          </div>
          <div className="vs-topline">
            Zero-budget pilot, QR-first launch, one dense district at a time.
          </div>
        </div>

        <nav className="vs-rail-nav">
          {tabs.map((tab) => {
            const active = tab.href === '/'
              ? pathname === '/'
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

            return (
              <Link key={tab.href} href={tab.href} className={`vs-rail-link ${active ? 'active' : ''}`}>
                <tab.icon size={20} weight={active ? 'fill' : 'regular'} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="vs-rail-footer">
          <Link className="vs-link-chip" href={mode === 'merchant' ? '/' : '/merchant/today'}>
            {mode === 'merchant' ? <House size={18} /> : <ChartBar size={18} />}
            <span>{mode === 'merchant' ? 'Switch to consumer' : 'Switch to merchant'}</span>
          </Link>
          <div className="paper-sheet sheet-pad">
            <div className="eyebrow">Current passbook</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: 8 }}>{displayName || 'Guest'}</div>
            <div className="sheet-copy" style={{ marginTop: 6 }}>
              Pilot district: Thamel. Merchant rewards stay merchant-funded until the product earns expansion.
            </div>
          </div>
        </div>
      </aside>

      <div className="vs-main">
        <div className="vs-topbar">
          <div className="vs-topbar-note">
            <div className="vs-kicker">{mode === 'merchant' ? 'Merchant growth OS' : 'Modern passbook'}</div>
            <div className="vs-topline">
              {mode === 'merchant'
                ? 'Confirm redemptions fast, track who brought them, and see what is working today.'
                : 'Share places you love, track the route, and redeem without learning a new payment app.'}
            </div>
          </div>

          <div className="vs-top-actions">
            <div className="vs-chip">
              <span>{displayName || 'Guest'}</span>
            </div>
            <Link className="vs-link-chip" href={mode === 'merchant' ? '/' : '/merchant/today'}>
              {mode === 'merchant' ? <House size={18} /> : <ChartBar size={18} />}
              <span>{mode === 'merchant' ? 'Consumer' : 'Merchant'}</span>
            </Link>
          </div>
        </div>

        <div className="vs-content">{children}</div>
      </div>

      <BottomNav />
    </div>
  );
}
