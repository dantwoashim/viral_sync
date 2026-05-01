import Link from 'next/link';
import type { ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'quiet';
type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'muted';
type AsyncStateTone = 'loading' | 'empty' | 'error' | 'success' | 'pending';

const proofStatusLabels: Record<BadgeTone, string> = {
  default: 'Recorded',
  success: 'Verified',
  warning: 'Needs review',
  danger: 'Blocked',
  muted: 'Reference',
};

export function PremiumShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <main className={`premium-page ${className}`}>
      <div className="premium-shell">{children}</div>
    </main>
  );
}

export function PremiumNav() {
  return (
    <nav className="premium-nav" aria-label="Primary navigation">
      <Link className="premium-brand" href="/">
        <span className="premium-brand-mark" aria-hidden="true" />
        Viral Sync
      </Link>
      <div className="premium-nav-links">
        <Link href="/merchant/today">Merchants</Link>
        <Link href="/invite">Visitors</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/security">Trust</Link>
        <Link href="/examples">Examples</Link>
      </div>
    </nav>
  );
}

export function PremiumButton({
  children,
  href,
  variant = 'primary',
  type = 'button',
  ariaLabel,
}: {
  children: ReactNode;
  href?: string;
  variant?: ButtonVariant;
  type?: 'button' | 'submit';
  ariaLabel?: string;
}) {
  const className = `premium-button premium-button-${variant}`;

  if (href) {
    return (
      <Link className={className} href={href} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <button className={className} type={type} aria-label={ariaLabel}>
      {children}
    </button>
  );
}

export function PremiumSurface({
  children,
  tone = 'light',
  className = '',
}: {
  children: ReactNode;
  tone?: 'light' | 'proof' | 'raised';
  className?: string;
}) {
  return <section className={`premium-surface premium-surface-${tone} ${className}`}>{children}</section>;
}

export function PremiumStatusBadge({ children, tone = 'default' }: { children: ReactNode; tone?: BadgeTone }) {
  return <span className={`premium-badge premium-badge-${tone}`} data-state={tone}>{children}</span>;
}

export function PremiumMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="premium-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

export function PremiumProofRow({
  label,
  value,
  meta,
  status = 'default',
}: {
  label: string;
  value: string;
  meta?: string;
  status?: BadgeTone;
}) {
  return (
    <div className="premium-proof-row">
      <div>
        <span>{label}</span>
        {meta ? <small>{meta}</small> : null}
      </div>
      <code>{value}</code>
      <PremiumStatusBadge tone={status}>{proofStatusLabels[status]}</PremiumStatusBadge>
    </div>
  );
}

export function PremiumDisclosure({
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="premium-disclosure" open={defaultOpen}>
      <summary>
        <span>{title}</span>
        {summary ? <small>{summary}</small> : null}
      </summary>
      <div>{children}</div>
    </details>
  );
}

export function PremiumStepRail({
  steps,
  activeIndex,
}: {
  steps: readonly string[];
  activeIndex: number;
}) {
  return (
    <ol className="premium-step-rail">
      {steps.map((step, index) => {
        const state = index < activeIndex ? 'complete' : index === activeIndex ? 'active' : 'pending';
        return (
          <li className={`premium-step premium-step-${state}`} key={step}>
            <span>{index + 1}</span>
            <p>{step}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function PremiumAsyncState({
  tone,
  title,
  detail,
  action,
}: {
  tone: AsyncStateTone;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className={`premium-async-state premium-async-${tone}`} role={tone === 'error' ? 'alert' : 'status'} aria-live="polite">
      <span aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      {action ? <div className="premium-async-action">{action}</div> : null}
    </div>
  );
}

export function PremiumTransactionStatus({
  phase,
  title,
  detail,
}: {
  phase: 'pending' | 'confirmed' | 'failed';
  title: string;
  detail: string;
}) {
  return (
    <div className={`premium-tx-status premium-tx-${phase}`} role="status" aria-live="polite">
      <span aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </div>
  );
}

export function PremiumCompletionMoment({
  title,
  detail,
  tone = 'success',
}: {
  title: string;
  detail: string;
  tone?: 'success' | 'danger';
}) {
  return (
    <div className={`premium-completion premium-completion-${tone}`}>
      <span aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </div>
  );
}

export function PremiumTransactionPanel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <PremiumSurface tone="proof" className="premium-transaction-panel">
      <div className="premium-panel-header">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <div className="premium-proof-stack">{children}</div>
    </PremiumSurface>
  );
}
