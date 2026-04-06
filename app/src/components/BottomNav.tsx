'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { consumerTabs, merchantTabs } from '@/lib/navigation';

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
