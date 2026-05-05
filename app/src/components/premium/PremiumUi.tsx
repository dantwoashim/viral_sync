"use client";

import Link from "next/link";
import { ReactNode, useState, useEffect } from "react";

type ButtonVariant = "primary" | "secondary" | "quiet";
type BadgeTone = "default" | "success" | "warning" | "danger" | "muted";
type AsyncStateTone = "loading" | "empty" | "error" | "success" | "pending";

const proofStatusLabels: Record<BadgeTone, string> = {
  default: "Recorded",
  success: "Verified",
  warning: "Needs review",
  danger: "Blocked",
  muted: "Reference",
};

export function PremiumShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={`flex-1 overflow-y-auto w-full bg-[#f9f9fb] selection:bg-indigo-100 selection:text-indigo-900 font-sans relative overflow-x-hidden ${className}`}
    >
      {/* Decorative magical lighting */}
      <div
        className="absolute top-0 inset-x-0 h-[600px] pointer-events-none opacity-40 mix-blend-multiply"
        style={{
          background:
            "radial-gradient(ellipse at 50% -20%, rgba(99,102,241,0.15), transparent 70%)",
        }}
      />
      <div className="max-w-[1240px] mx-auto px-6 lg:px-8 pt-6 pb-32 md:pt-16 md:pb-24">
        {children}
      </div>
    </main>
  );
}

import { House, Scan, Wallet, Gear } from '@phosphor-icons/react/dist/ssr';

export function PremiumMobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] w-full max-w-[100vw] overflow-hidden bg-white/90 backdrop-blur-xl border-t border-gray-200/50 pb-[env(safe-area-inset-bottom)]">
       <div className="grid grid-cols-4 items-center h-16 px-1">
          <Link href="/" className="flex min-w-0 flex-col items-center justify-center gap-1 text-gray-500 hover:text-indigo-600 transition-colors">
            <House size={24} weight="duotone" />
            <span className="text-[10px] font-bold">Home</span>
          </Link>
          <Link href="/merchant/scan" className="flex min-w-0 flex-col items-center justify-center gap-1 text-gray-500 hover:text-indigo-600 transition-colors">
            <Scan size={24} weight="duotone" />
            <span className="text-[10px] font-bold">Scan</span>
          </Link>
          <Link href="/merchant/today" className="flex min-w-0 flex-col items-center justify-center gap-1 text-gray-500 hover:text-indigo-600 transition-colors">
            <Wallet size={24} weight="duotone" />
            <span className="text-[10px] font-bold">Wallet</span>
          </Link>
          <Link href="/proof" className="flex min-w-0 flex-col items-center justify-center gap-1 text-gray-500 hover:text-indigo-600 transition-colors">
            <Gear size={24} weight="duotone" />
            <span className="text-[10px] font-bold">Proof</span>
          </Link>
       </div>
    </nav>
  );
}

export function PremiumNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className="hidden md:block fixed inset-x-0 top-0 z-50 h-20 pointer-events-none"
      aria-label="Primary navigation"
    >
      <div
        className={`mx-auto relative h-full px-6 flex items-center justify-between pointer-events-auto transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${scrolled ? "translate-y-4 max-w-[1200px] h-14" : "translate-y-0 max-w-[1240px]"}`}
      >
        {/* Pill Background - purely visual to avoid layout thrashing the content */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 rounded-full shadow-lg shadow-gray-900/5 border border-black/5 ${scrolled ? "opacity-100 backdrop-blur-[16px]" : "opacity-0"}`}
          style={{
            background: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
          aria-hidden="true"
        />

        {/* Content */}
        <Link
          className="relative flex items-center gap-2.5 font-bold tracking-tight text-gray-900 transition-colors hover:text-black"
          href="/"
        >
          <span
            className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-[0_2px_10px_rgba(79,70,229,0.4)] shadow-hairline"
            aria-hidden="true"
          />
          Viral Sync
        </Link>
        <div className="relative flex items-center gap-8 text-sm font-semibold text-gray-600">
          <Link
            className="transition-colors hover:text-gray-900"
            href="/for-merchants"
          >
            For merchants
          </Link>
          <Link
            className="transition-colors hover:text-gray-900"
            href="/#how-it-works"
          >
            How it works
          </Link>
          <Link className="transition-colors hover:text-gray-900" href="/demo">
            Demo
          </Link>
          <Link
            className="px-4 py-2 transition-transform bg-gray-900 rounded-full hover:shadow-lg shadow-gray-900/10 hover:-translate-y-[1px] text-white shadow-hairline"
            href="/proof#artifacts"
          >
            For builders
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function PremiumButton({
  children,
  href,
  variant = "primary",
  type = "button",
  ariaLabel,
}: {
  children: ReactNode;
  href?: string;
  variant?: ButtonVariant;
  type?: "button" | "submit";
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
  tone = "light",
  className = "",
}: {
  children: ReactNode;
  tone?: "light" | "proof" | "raised";
  className?: string;
}) {
  return (
    <section className={`premium-surface premium-surface-${tone} ${className}`}>
      {children}
    </section>
  );
}

export function PremiumStatusBadge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span className={`premium-badge premium-badge-${tone}`} data-state={tone}>
      {children}
    </span>
  );
}

export function PremiumMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
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
  status = "default",
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
      <PremiumStatusBadge tone={status}>
        {proofStatusLabels[status]}
      </PremiumStatusBadge>
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
        const state =
          index < activeIndex
            ? "complete"
            : index === activeIndex
              ? "active"
              : "pending";
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
    <div
      className={`premium-async-state premium-async-${tone}`}
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
    >
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
  phase: "pending" | "confirmed" | "failed";
  title: string;
  detail: string;
}) {
  return (
    <div
      className={`premium-tx-status premium-tx-${phase}`}
      role="status"
      aria-live="polite"
    >
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
  tone = "success",
}: {
  title: string;
  detail: string;
  tone?: "success" | "danger";
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
