import Link from 'next/link';
import type { ReactNode } from 'react';

/* Regression marker: No consumer passbook chrome */

type WorkspaceAudience = 'merchant' | 'ops' | 'developer';

const workspaceConfig = {
  merchant: {
    label: 'Merchant console',
    href: '/merchant/today',
    promise: 'Fund rewards, confirm visits, and inspect settlement proof.',
    nav: [
      { href: '/merchant/today', label: 'Today', key: 'today' },
      { href: '/merchant/campaigns', label: 'Campaigns', key: 'campaigns' },
      { href: '/merchant/scan', label: 'Scan', key: 'scan' },
      { href: '/merchant/ledger', label: 'Ledger', key: 'ledger' },
    ],
  },
  ops: {
    label: 'Ops control',
    href: '/admin/relayer',
    promise: 'Monitor relayer policy, replay resistance, queues, and failures.',
    nav: [
      { href: '/admin/relayer', label: 'Relayer', key: 'relayer' },
      { href: '/admin/security', label: 'Security', key: 'security' },
      { href: '/admin/support', label: 'Support', key: 'support' },
      { href: '/admin/pilot', label: 'Pilot', key: 'pilot' },
    ],
  },
  developer: {
    label: 'Developer surface',
    href: '/developer',
    promise: 'Verify receipts and consume the causal graph without the app.',
    nav: [
      { href: '/developer', label: 'Verify receipt', key: 'developer' },
      { href: '/example-receipt-graph', label: 'Example app', key: 'example' },
      { href: '/api/launch/causal-graph', label: 'Graph API', key: 'graph' },
      { href: '/demo', label: 'Demo', key: 'demo' },
    ],
  },
} as const;

const workspacePrinciple = 'Merchant proof controls';

export function PremiumWorkspace({
  audience,
  active,
  children,
  action,
}: {
  audience: WorkspaceAudience;
  active: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const config = workspaceConfig[audience];

  return (
    <main className={`premium-workspace premium-workspace-${audience}`}>
      <aside className="premium-workspace-rail" aria-label={`${config.label} navigation`}>
        <Link className="premium-workspace-brand" href={config.href}>
          <span aria-hidden="true" />
          <strong>Viral Sync</strong>
        </Link>
        <div className="premium-workspace-context">
          <p>{config.label}</p>
          <small>{config.promise}</small>
        </div>
        <nav className="premium-workspace-nav">
          {config.nav.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={item.key === active ? 'is-active' : ''}
              aria-current={item.key === active ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="premium-workspace-rail-note">
          <span>Proof-first operating mode</span>
          <p>{workspacePrinciple}. Every payout maps to a receipt, nullifier, and settlement record.</p>
        </div>
      </aside>
      <section className="premium-workspace-main">
        {action ? (
          <header className="premium-workspace-topbar">
            <div>
              <span>{config.label}</span>
              <p>{config.promise}</p>
            </div>
            {action}
          </header>
        ) : null}
        <div className="premium-workspace-content">{children}</div>
      </section>
    </main>
  );
}
