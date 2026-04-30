'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowLeft,
  Bell,
  CalendarBlank,
  ChartBar,
  Check,
  CheckCircle,
  Coffee,
  DownloadSimple,
  Gift,
  House,
  Info,
  Keyboard,
  LinkSimple,
  MapPin,
  PaperPlaneTilt,
  QrCode,
  Receipt,
  ShareNetwork,
  ShieldCheck,
  SignOut,
  Storefront,
  Ticket,
  UserCircle,
  UsersThree,
} from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import { confirmMerchantCode, createRedeemCode, ensureConsumerReferral } from '@/lib/launch/client';
import { useConsumerSummary, useMerchantSummary } from '@/lib/launch/hooks';
import type { ConsumerPassbookRow, ConsumerSummary, MerchantSummary } from '@/lib/launch/types';
import QrPayload from '@/components/launch/QrPayload';

const emptyQrCells = [
  1, 1, 1, 0, 1, 0, 1, 1, 1,
  1, 0, 0, 1, 0, 1, 0, 0, 1,
  1, 0, 1, 1, 1, 1, 1, 0, 1,
  0, 1, 1, 0, 0, 1, 1, 1, 0,
  1, 0, 1, 1, 0, 1, 0, 0, 1,
  0, 1, 1, 1, 1, 0, 1, 0, 0,
  1, 0, 0, 1, 0, 1, 1, 1, 1,
  1, 1, 0, 0, 1, 0, 0, 1, 0,
  1, 1, 1, 0, 1, 1, 0, 1, 1,
];

function hashSeed(seed: string) {
  return seed.split('').reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 17);
}

function qrCellsFor(seed: string | null | undefined) {
  if (!seed) {
    return emptyQrCells;
  }

  const base = Math.abs(hashSeed(seed));
  return emptyQrCells.map((cell, index) => {
    if (index < 9 || index > 71 || index % 9 === 0 || index % 9 === 8) {
      return cell;
    }
    return ((base >> (index % 16)) + index + cell) % 3 === 0 ? 1 : cell;
  });
}

function codeLabel(value: string | null | undefined) {
  if (!value) {
    return 'Not created';
  }
  return value.replace(/-/g, '').toUpperCase();
}

function offerShortName(summary: ConsumerSummary | null) {
  if (summary?.offer.slug.includes('brew-pass')) {
    return 'Brew Pass';
  }

  return summary?.offer.slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) ?? 'Brew Pass';
}

function formatDateLabel() {
  return new Date().toLocaleDateString('en-US', {
    phase: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function StatusBar() {
  return (
    <div className="ref-status">
      <strong>9:41</strong>
      <span>5G 98%</span>
    </div>
  );
}

function IconLink({ href, children, label }: { href: string; children: ReactNode; label: string }) {
  return (
    <Link href={href} aria-label={label} className="ref-icon-link">
      {children}
    </Link>
  );
}

function MobileShell({
  title,
  subtitle,
  left,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="ref-stage is-mobile">
      <section className="ref-phone">
        <StatusBar />
        <header className="ref-phone-head">
          <div className="ref-phone-action">{left}</div>
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="ref-phone-action">{right}</div>
        </header>
        {children}
        <div className="ref-homebar" />
      </section>
    </main>
  );
}

function BottomTabs({ active }: { active: 'home' | 'passbook' | 'invite' | 'profile' }) {
  const tabs = [
    { key: 'home', label: 'Home', href: '/', icon: House },
    { key: 'passbook', label: 'Passbook', href: '/passbook', icon: Ticket },
    { key: 'invite', label: 'Invite', href: '/invite', icon: PaperPlaneTilt },
    { key: 'profile', label: 'Profile', href: '/profile', icon: UserCircle },
  ] as const;

  return (
    <nav className="ref-tabs" aria-label="Primary">
      {tabs.map((tab) => (
        <Link key={tab.key} href={tab.href} className={active === tab.key ? 'is-active' : ''}>
          <tab.icon size={24} weight={active === tab.key ? 'fill' : 'regular'} />
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function QrGrid({ seed, payload, label }: { seed?: string | null; payload?: string; label: string }) {
  const cells = useMemo(() => qrCellsFor(seed), [seed]);
  if (payload) {
    return (
      <div>
        <QrPayload payload={payload} label={label} />
        <small className="ref-demo-code-label">Scannable QR. Manual entry remains available.</small>
      </div>
    );
  }

  return (
    <div>
      <div className="ref-qr" aria-hidden="true">
        {cells.map((cell, index) => (
          <i key={`${cell}-${index}`} className={cell ? 'is-on' : ''} />
        ))}
      </div>
      <small className="ref-demo-code-label">Waiting for a live payload.</small>
    </div>
  );
}

function EmptyState({
  title,
  copy,
  action,
}: {
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <div className="ref-empty">
      <strong>{title}</strong>
      <p>{copy}</p>
      {action}
    </div>
  );
}

function LoadingLines() {
  return (
    <div className="ref-loading">
      <i />
      <i />
      <i />
    </div>
  );
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  const count = Math.max(total, 1);
  return (
    <div>
      {Array.from({ length: count }, (_, index) => (
        <span key={index}>
          <i className={index < current ? 'is-filled' : ''}>{index >= current ? index + 1 : ''}</i>
          <em>{index < current ? 'Confirmed' : index === current ? 'Next' : 'Open'}</em>
        </span>
      ))}
    </div>
  );
}

function passbookIcon(row: ConsumerPassbookRow) {
  if (row.status === 'blocked') {
    return <ShieldCheck size={22} />;
  }
  if (row.status === 'redeemed') {
    return <CheckCircle size={22} weight="fill" />;
  }
  return <Ticket size={22} />;
}

export function ConsumerHomeReferenceUi() {
  const { displayName, sessionId } = useAuth();
  const { data, loading, error } = useConsumerSummary(sessionId);
  const friendlyName = displayName.startsWith('Guest ') ? 'Guest' : displayName;
  const current = data?.progress.current ?? 0;
  const total = data?.progress.total ?? 3;
  const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const remaining = data?.progress.remaining ?? total;
  const hasReferral = Boolean(data?.referral.token);
  const hasCode = Boolean(data?.activeRedeemCode?.code);

  return (
      <MobileShell
      title={`Namaste, ${friendlyName || 'Guest'}`}
      subtitle={data ? `${data.offer.merchantName}, ${data.offer.district}` : 'Loading passbook'}
      right={<IconLink href="/profile" label="Open profile"><Bell size={24} weight="regular" /></IconLink>}
    >
      <section className="ref-brew-pass">
        <div className="ref-pass-brand">
          <Coffee size={34} weight="duotone" />
          <div>
            <strong>{data?.offer.merchantName ?? 'Merchant'}<br />Passbook</strong>
            <span>Counter verified</span>
          </div>
        </div>
        <div className="ref-pass-stamp">Live<br />Pilot</div>
        <div className="ref-pass-art" />
        <h2>{offerShortName(data)}</h2>
        <p>{data?.offer.reward ?? 'Reward configuration loading'}</p>
        <div className="ref-pass-bottom">
          <div>
            <span>Confirmed</span>
            <strong>{current}/{total}</strong>
            <em>Counter redemptions</em>
          </div>
          <div>
            <span>Status</span>
            <strong>{hasCode ? 'Code ready' : hasReferral ? 'Sharing' : 'Setup'}</strong>
          </div>
        </div>
      </section>

      <section className="ref-next-card">
        <div>
          <span>Next Best Action</span>
          <strong>
            {hasCode
              ? 'Show the live code at the counter'
              : hasReferral
                ? `${remaining} confirmation${remaining === 1 ? '' : 's'} to unlock`
                : 'Create a verified invite link'}
          </strong>
          <em>{hasReferral ? `${data?.referral.openCount ?? 0} link opens` : 'Waiting for first share'}</em>
        </div>
        <div className="ref-cup"><Coffee size={42} weight="duotone" /></div>
        <b>{percent}%</b>
        <div className="ref-progress"><i style={{ width: `${percent}%` }} /></div>
        <div className="ref-cta-row">
          <Link className="ref-primary" href={hasCode ? '/redeem' : '/invite'}>
            {hasCode ? 'Open code' : hasReferral ? 'Share again' : 'Create invite'}
          </Link>
          <Link className="ref-secondary" href="/routes">How it works</Link>
        </div>
      </section>

      <section className="ref-activity">
        <header>
          <strong>Passbook</strong>
          <Link href="/passbook">View all</Link>
        </header>
        {loading ? (
          <LoadingLines />
        ) : error ? (
          <EmptyState title="Could not load passbook" copy={error} />
        ) : data?.passbook.length ? (
          data.passbook.slice(0, 3).map((row) => (
            <div key={row.id} className="ref-activity-row">
              <div className="ref-activity-icon">{passbookIcon(row)}</div>
              <div>
                <strong>{row.title}</strong>
                <span>{row.subtitle}</span>
              </div>
              <em>{row.status}<small>{row.meta}</small></em>
            </div>
          ))
        ) : (
          <EmptyState
            title="No activity yet"
            copy="Create your first invite link. The first real line appears only after a friend claims or staff confirms a code."
            action={<Link className="ref-secondary" href="/invite">Start sharing</Link>}
          />
        )}
      </section>

      <BottomTabs active="home" />
    </MobileShell>
  );
}

export function InviteReferenceUi() {
  const { displayName, sessionId, deviceId } = useAuth();
  const { data, loading, error, refresh } = useConsumerSummary(sessionId);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const token = data?.referral.token ?? null;
  const shareUrl = typeof window !== 'undefined' && data?.referral.sharePath
    ? `${window.location.origin}${data.referral.sharePath}`
    : '';
  const shareText = data
    ? `${displayName || 'A friend'} invited you to ${data.offer.merchantName}. Claim ${data.offer.reward}: ${shareUrl}`
    : shareUrl;

  const createLink = async () => {
    if (!sessionId) {
      return;
    }
    setWorking(true);
    setMessage(null);
    try {
      await ensureConsumerReferral(sessionId, displayName || 'Guest', deviceId);
      await refresh();
      setMessage('Verified invite link created.');
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Could not create invite link.');
    } finally {
      setWorking(false);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) {
      setMessage('Create the invite link first.');
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    setMessage('Invite link copied.');
  };

  const shareNative = async () => {
    if (!shareUrl) {
      setMessage('Create the invite link first.');
      return;
    }
    if (navigator.share) {
      await navigator.share({
        title: data?.offer.title ?? 'Viral Sync invite',
        text: shareText,
        url: shareUrl,
      });
      return;
    }
    await copyLink();
  };

  return (
    <MobileShell
      title="Invite Friends"
      subtitle={token ? 'Share your live link.' : 'Create the link first.'}
      left={<IconLink href="/" label="Back home"><ArrowLeft size={24} /></IconLink>}
      right={<IconLink href="/routes" label="How invites work"><Info size={22} /></IconLink>}
    >
      <section className={`ref-share-ticket ${!token ? 'is-muted' : ''}`}>
        <h2>{offerShortName(data)}</h2>
        <p>{token ? 'Share Ticket' : 'Unissued Ticket'}</p>
        <QrGrid seed={token} payload={shareUrl || undefined} label="Referral invite QR" />
        <span>Your Referral Code</span>
        <strong>{codeLabel(token)}</strong>
      </section>

      <section className="ref-reward-band">
        <div><span>Reward</span><strong>{data?.offer ? 'Configured' : 'Loading'}</strong><em>Merchant funded</em></div>
        <div><span>Goal</span><strong>{data?.progress.total ?? 3}</strong><em>Confirmations</em></div>
        <div><span>Opened</span><strong>{data?.referral.openCount ?? 0}</strong><em>Live count</em></div>
      </section>

      <section className="ref-referral-progress">
        <header>
          <strong>Referral Progress</strong>
          <span>{loading ? 'Loading' : `${data?.progress.current ?? 0}/${data?.progress.total ?? 3}`}</span>
        </header>
        <ProgressDots current={data?.progress.current ?? 0} total={data?.progress.total ?? 3} />
      </section>

      <nav className="ref-share-actions">
        <button onClick={token ? copyLink : createLink} disabled={working || loading}>
          <LinkSimple size={24} />
          <span>{token ? 'Copy Link' : working ? 'Creating' : 'Create Link'}</span>
        </button>
        <a href={shareUrl ? `https://wa.me/?text=${encodeURIComponent(shareText)}` : undefined} aria-disabled={!shareUrl}>
          <ShareNetwork size={24} />
          <span>WhatsApp</span>
        </a>
        <a href={shareUrl ? `sms:?&body=${encodeURIComponent(shareText)}` : undefined} aria-disabled={!shareUrl}>
          <PaperPlaneTilt size={24} />
          <span>Messages</span>
        </a>
        <button onClick={shareNative} disabled={!shareUrl}>
          <Info size={24} />
          <span>More</span>
        </button>
      </nav>

      {error && <div className="ref-message is-error">{error}</div>}
      {message && <div className="ref-message">{message}</div>}
    </MobileShell>
  );
}

export function RedeemReferenceUi() {
  const { sessionId } = useAuth();
  const { data, loading, error, refresh } = useConsumerSummary(sessionId);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const code = data?.activeRedeemCode?.code ?? null;
  const hasClaim = Boolean(data?.activeClaim && data.activeClaim.status !== 'blocked');
  const qrPayload = code ? JSON.stringify({
    type: 'viral-sync-redeem-code',
    version: '1',
    code,
    offerId: data?.offer.id,
  }) : undefined;

  const generateCode = async () => {
    if (!sessionId) {
      return;
    }
    setWorking(true);
    setMessage(null);
    try {
      const result = await createRedeemCode(sessionId);
      if (!result.ok) {
        setMessage(result.reason ?? 'No eligible claim is ready for redemption.');
        return;
      }
      await refresh();
      setMessage(result.status === 'redeemed' ? 'This code was already confirmed.' : 'Live code ready for staff confirmation.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <MobileShell
      title="Redeem"
      subtitle={code ? 'Show this code at the counter.' : 'A claim is required first.'}
      left={<IconLink href="/" label="Back home"><ArrowLeft size={24} /></IconLink>}
      right={<IconLink href="/routes" label="Redemption guide"><Info size={22} /></IconLink>}
    >
      <section className={`ref-redeem-ticket ${!code ? 'is-muted' : ''}`}>
        <h2>{offerShortName(data)}</h2>
        <p>{code ? 'Redeem Ticket' : 'No Active Code'}</p>
        <QrGrid seed={code} payload={qrPayload} label="Redeem code QR" />
        <span>Counter Code</span>
        <strong>{code ?? 'Create first'}</strong>
      </section>

      <section className="ref-pay-card">
        <div className="ref-coins">POS</div>
        <div>
          <span>Staff action</span>
          <strong>{code ? 'Confirm in merchant scan' : hasClaim ? 'Generate live code' : 'Claim a friend invite'}</strong>
          <em>{data?.offer.redemptionWindowHours ?? 72} hour reward window after claim</em>
        </div>
      </section>

      {error && <div className="ref-message is-error">{error}</div>}
      {message && <div className="ref-message">{message}</div>}

      <section className="ref-rules">
        <span>Code is valid only for the active claim window</span>
        <span>Merchant confirmation is the truth step</span>
      </section>

      <div className="ref-cta-row">
        <button className="ref-primary" onClick={generateCode} disabled={working || loading || !hasClaim}>
          {working ? 'Preparing code' : code ? 'Refresh code' : 'Generate code'}
        </button>
        <Link className="ref-secondary" href={hasClaim ? '/merchant/scan' : '/invite'}>
          {hasClaim ? 'Merchant scan' : 'Create invite'}
        </Link>
      </div>
    </MobileShell>
  );
}

function MerchantRail({ active, summary }: { active: string; summary: MerchantSummary | null }) {
  const items = [
    { label: 'Today', href: '/merchant/today', icon: Receipt },
    { label: 'Scan', href: '/merchant/scan', icon: QrCode },
    { label: 'Referrals', href: '/network', icon: ShareNetwork },
    { label: 'Customers', href: '/merchant/customers', icon: UsersThree },
    { label: 'Rewards', href: '/merchant/campaigns', icon: Gift },
    { label: 'Reports', href: '/merchant/reports', icon: ChartBar },
    { label: 'Settings', href: '/settings', icon: Storefront },
  ] as const;

  return (
    <aside className="ref-merchant-rail">
      <div className="ref-merchant-brand">
        <div>{summary?.merchant.name.slice(0, 2).toUpperCase() ?? 'VS'}</div>
        <strong>{summary?.merchant.name ?? 'Merchant'}</strong>
        <span>{summary ? `${summary.merchant.district}, ${summary.merchant.city}` : 'Loading venue'}</span>
      </div>
      <nav>
        {items.map((item) => (
          <Link key={item.label} href={item.href} className={active === item.label ? 'is-active' : ''}>
            <item.icon size={17} />
            {item.label}
          </Link>
        ))}
      </nav>
      <small>Devnet program / live ledger</small>
    </aside>
  );
}

function downloadSummary(summary: MerchantSummary | null) {
  if (!summary) {
    return;
  }
  const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `viral-sync-${summary.merchant.id}-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function MerchantTodayReferenceUi() {
  const { data, loading, error, refresh } = useMerchantSummary();
  const hasCustomers = Boolean(data?.customers.length);
  const hasActivity = (data?.metrics ?? []).some((metric) => Number(metric.value) > 0);

  return (
    <main className="ref-stage is-desktop">
      <section className="ref-dashboard">
        <MerchantRail active="Today" summary={data} />
        <div className="ref-dashboard-main">
          <header className="ref-dashboard-head">
            <div>
              <h1>Merchant Today</h1>
              <p>{formatDateLabel()}</p>
            </div>
            <div>
              <button onClick={() => downloadSummary(data)} disabled={!data}><DownloadSimple size={16} /> Export</button>
              <button onClick={() => void refresh()}><CalendarBlank size={16} /> Refresh</button>
            </div>
          </header>

          {error && <div className="ref-message is-error">{error}</div>}

          <section className="ref-stat-grid">
            {(data?.metrics ?? []).map((metric) => (
              <div key={metric.label} className="ref-stat-card">
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <em>{metric.note}</em>
              </div>
            ))}
            {loading && [0, 1, 2, 3].map((item) => <div key={item} className="ref-stat-card"><LoadingLines /></div>)}
          </section>

          <section className="ref-dashboard-grid">
            <div className="ref-panel is-chart">
              <strong>Activity Shape</strong>
              {hasActivity ? (
                <svg viewBox="0 0 460 210" aria-hidden="true">
                  <path d="M8 168 C48 148 76 132 106 126 S168 92 202 104 S276 130 318 74 S392 68 452 42" />
                </svg>
              ) : (
                <EmptyState title="No activity yet" copy="This chart starts drawing after the first real claim or counter-confirmed redemption." />
              )}
            </div>
            <div className="ref-panel is-sources">
              <strong>Top Referral Sources</strong>
              {hasCustomers ? data!.customers.map((customer) => (
                <div key={customer.title}><span>{customer.title}</span><em>{customer.value}</em></div>
              )) : (
                <EmptyState title="No referrers yet" copy="Invite links created by customers will rank here after real confirmations." />
              )}
            </div>
            <div className="ref-panel is-proof">
              <strong>Protocol Proof</strong>
              <div><span>Offer</span><b>{data?.offer.slug ?? 'Loading'}</b></div>
              <div><span>Queue</span><b>{data?.metrics[2]?.value ?? '0'}</b></div>
              <div><span>Fraud holdout</span><b>{data?.metrics[3]?.value ?? '0'}</b></div>
            </div>
            <div className="ref-panel is-health">
              <strong>Reward Health</strong>
              <div className="ref-kfactor">K-Factor <b>{hasActivity ? 'Learning' : 'Pending'}</b></div>
              <div className="ref-risk"><span><i style={{ width: hasActivity ? '72%' : '18%' }} /></span><em>{data?.alerts[0] ?? 'Waiting for live ledger data.'}</em></div>
              <div className="ref-big-stamp">Counter<br />Verified</div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

export function MerchantScanReferenceUi() {
  const { data, loading, error, refresh } = useMerchantSummary();
  const [code, setCode] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [manualReceiptId, setManualReceiptId] = useState('');
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const normalizeStaffCode = (value: string) => {
    const raw = value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6);
    return raw.length > 3 ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw;
  };

  const submit = async () => {
    setWorking(true);
    setResult(null);
    setReceiptId(null);
    try {
      const response = await confirmMerchantCode(code, staffPin, manualReceiptId);
      if (!response.ok) {
        setResult(response.reason ?? 'Code could not be confirmed.');
        return;
      }
      setResult(response.receiptPda
        ? `Confirmed ${response.code}. Receipt ${response.receiptPda.slice(0, 18)}...`
        : response.status === 'redeemed' ? `Confirmed ${response.code}.` : `Code ${response.code} is ${response.status}.`);
      setReceiptId(response.receiptId ?? null);
      setCode('');
      setManualReceiptId('');
      await refresh();
    } finally {
      setWorking(false);
    }
  };

  return (
    <main className="ref-stage is-desktop">
      <section className="ref-scan-terminal">
        <aside className="ref-scan-rail">
          <strong>Scan Terminal</strong>
          <span>{data ? `${data.merchant.name} / Connected` : 'Connecting ledger'}</span>
          <nav>
            <Link href="/merchant/scan"><QrCode size={17} /> Scan QR</Link>
            <Link href="/merchant/scan"><Keyboard size={17} /> Manual Code</Link>
            <Link href="/merchant/ledger"><Receipt size={17} /> Transactions</Link>
            <Link href="/settings"><Storefront size={17} /> Settings</Link>
          </nav>
          <small>Camera scanner is browser-permission dependent. Manual entry is always available for the counter.</small>
        </aside>

        <section className="ref-confirm-panel">
          <div className={`ref-check ${result ? 'is-live' : ''}`}>{result ? <Check size={58} /> : <QrCode size={58} />}</div>
          <h1>{result ? 'Reviewed' : 'Ready'}</h1>
          <p>{result ?? 'Enter a six-character live code from the customer redeem screen.'}</p>
          <div className="ref-scanner-note">
            <QrCode size={18} />
            <span>QR scan-ready. Use manual entry if camera permission is unavailable.</span>
          </div>
          <div className="ref-form">
            <label htmlFor="redeem-code">Manual code</label>
            <div>
              <input
                id="redeem-code"
                value={code}
                onChange={(event) => setCode(normalizeStaffCode(event.target.value))}
                placeholder="ABC-123"
                maxLength={7}
                inputMode="text"
              />
              <button onClick={submit} disabled={working || code.trim().length < 6}>
                {working ? 'Checking' : 'Confirm'}
              </button>
            </div>
            <div className="ref-cta-row">
              <button className="ref-secondary" type="button" onClick={() => setCode('')}>
                Clear
              </button>
              <button className="ref-secondary" type="button" onClick={() => void refresh()}>
                Refresh
              </button>
            </div>
            <label htmlFor="staff-pin">Staff PIN</label>
            <input
              id="staff-pin"
              value={staffPin}
              onChange={(event) => setStaffPin(event.target.value)}
              placeholder="DEMO-PIN"
              autoComplete="off"
            />
            <label htmlFor="manual-receipt-id">Receipt ID</label>
            <input
              id="manual-receipt-id"
              value={manualReceiptId}
              onChange={(event) => setManualReceiptId(event.target.value.toUpperCase())}
              placeholder="Optional bill #"
              autoComplete="off"
            />
          </div>
          {error && <div className="ref-message is-error">{error}</div>}
          {receiptId && (
            <Link className="ref-secondary" href={`/receipts/${encodeURIComponent(receiptId)}`}>
              Open receipt proof
            </Link>
          )}
        </section>

        <section className="ref-balance-panel">
          <div><span>Live queue</span><strong>{data?.metrics[2]?.value ?? '0'}</strong><em>awaiting staff</em></div>
          <div><span>Today&apos;s redemptions</span><strong>{data?.metrics[1]?.value ?? '0'}</strong></div>
          <div><span>Held out</span><strong>{data?.metrics[3]?.value ?? '0'}</strong></div>
          <button onClick={() => void refresh()}><QrCode size={17} /> Refresh queue</button>
          <div className="ref-mini-list">
            {loading ? <LoadingLines /> : data?.queue.map((row) => (
              <span key={row.title}>
                <b>{row.value}</b>
                <em>{row.title}</em>
              </span>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export function PassbookReferenceUi() {
  const { sessionId } = useAuth();
  const { data, loading, error } = useConsumerSummary(sessionId);

  return (
    <MobileShell
      title="Passbook"
      subtitle="Your confirmed reward ledger"
      left={<IconLink href="/" label="Back home"><ArrowLeft size={24} /></IconLink>}
      right={<IconLink href="/routes" label="Ledger guide"><ShieldCheck size={22} /></IconLink>}
    >
      <section className="ref-ledger-hero">
        <span>{offerShortName(data)}</span>
        <strong>{data ? `${data.progress.current} of ${data.progress.total} confirmed` : 'Loading ledger'}</strong>
        <p>{data?.offer.description ?? 'Only live claims and counter confirmations appear here.'}</p>
      </section>
      <section className="ref-activity is-ledger">
        <header><strong>Recent Lines</strong><span>{data?.activeRedeemCode?.code ?? 'Live ledger'}</span></header>
        {loading ? (
          <LoadingLines />
        ) : error ? (
          <EmptyState title="Could not load ledger" copy={error} />
        ) : data?.passbook.length ? (
          data.passbook.map((row) => (
            <div key={row.id} className="ref-activity-row">
              <div className="ref-activity-icon">{passbookIcon(row)}</div>
              <div><strong>{row.title}</strong><span>{row.subtitle}</span></div>
              <em>{row.status}<small>{row.meta}</small></em>
            </div>
          ))
        ) : (
          <EmptyState
            title="No ledger lines yet"
            copy="The first line appears after you create a link or claim a friend invite. No generated activity is shown."
            action={<Link className="ref-secondary" href="/invite">Create invite</Link>}
          />
        )}
      </section>
      <BottomTabs active="passbook" />
    </MobileShell>
  );
}

export function ProfileReferenceUi() {
  const { displayName, login, logout, sessionId } = useAuth();
  const { data } = useConsumerSummary(sessionId);
  const initials = (displayName || 'Guest').split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase();

  return (
    <MobileShell
      title="Profile"
      subtitle="Identity and pilot settings"
      left={<IconLink href="/" label="Back home"><ArrowLeft size={24} /></IconLink>}
      right={<IconLink href="/settings" label="Settings"><Storefront size={22} /></IconLink>}
    >
      <section className="ref-profile-card">
        <div className="ref-avatar">{initials}</div>
        <h2>{displayName || 'Guest'}</h2>
        <p>{data ? `${data.offer.district} passbook / guest-first` : 'Guest-first passbook'}</p>
      </section>
      <section className="ref-stat-pair">
        <div><span>Referral link</span><strong>{data?.referral.token ? 'Active' : 'Not created'}</strong></div>
        <div><span>Redemptions</span><strong>{data?.progress.current ?? 0}</strong></div>
      </section>
      <section className="ref-settings-list">
        <button onClick={login}><span>Name this passbook</span><em>&gt;</em></button>
        <Link href="/merchant/today"><span>Switch to merchant</span><em>&gt;</em></Link>
        <Link href="/routes"><span>Read the flow guide</span><em>&gt;</em></Link>
        <button onClick={logout}><span>Reset guest session</span><SignOut size={18} /></button>
      </section>
      <BottomTabs active="profile" />
    </MobileShell>
  );
}

export function RoutesReferenceUi() {
  return (
    <MobileShell
      title="Flow Guide"
      subtitle="Every screen has one job"
      left={<IconLink href="/" label="Back home"><ArrowLeft size={24} /></IconLink>}
      right={<IconLink href="/invite" label="Create invite"><MapPin size={22} /></IconLink>}
    >
      <section className="ref-route-map">
        <h2>Referral Truth Loop</h2>
        <p>Invite / Claim / Counter confirm</p>
        <svg viewBox="0 0 320 210" aria-hidden="true">
          <path d="M36 148 C92 72 144 92 178 54 S250 68 288 32" />
          <circle cx="36" cy="148" r="9" /><circle cx="178" cy="54" r="9" /><circle cx="288" cy="32" r="9" />
        </svg>
      </section>
      <section className="ref-activity is-ledger">
        <header><strong>Tutorial</strong><span>Live flow</span></header>
        {[
          ['Create an invite', 'The customer receives one link tied to this device and passbook.', '/invite'],
          ['Friend claims', 'The friend gets their own claim window. Same-device self-referrals are blocked.', '/'],
          ['Staff confirms', 'Merchant scan turns the claim into a real attributed redemption.', '/merchant/scan'],
        ].map(([title, copy, href], index) => (
          <Link key={title} href={href} className="ref-activity-row">
            <div className="ref-activity-icon">{index + 1}</div>
            <div><strong>{title}</strong><span>{copy}</span></div>
            <em>Open</em>
          </Link>
        ))}
      </section>
      <BottomTabs active="home" />
    </MobileShell>
  );
}
