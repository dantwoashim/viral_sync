'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  ChartBar,
  Compass,
  House,
  Megaphone,
  QrCode,
  Receipt,
  ShareNetwork,
  UserCircle,
  UsersThree,
} from '@phosphor-icons/react';

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

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === '/login') {
    return null;
  }

  const tabs = pathname.startsWith('/merchant') ? merchantTabs : consumerTabs;

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const active = tab.href === '/'
          ? pathname === '/'
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        return (
          <Link key={tab.href} href={tab.href} className={`nav-item ${active ? 'active' : ''}`}>
            <tab.icon size={22} weight={active ? 'fill' : 'regular'} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
