import { existsSync, readFileSync } from 'fs';
import path from 'path';
import {
  PremiumButton,
  PremiumMetric,
  PremiumNav,
  PremiumProofRow,
  PremiumShell,
  PremiumStatusBadge,
  PremiumSurface,
} from '@/components/premium/PremiumUi';

type GauntletCase = {
  id?: string;
  title?: string;
  normalReferralFailure?: string;
  viralSyncDefense?: string;
  expected?: string;
  observed?: string;
  status?: 'blocked' | 'failed' | 'missing' | 'attention';
  evidence?: string;
  proofSource?: string;
  errorCode?: string;
};

type Gauntlet = {
  type?: string;
  version?: string;
  network?: string;
  programId?: string;
  proofLevel?: string;
  attestationModel?: string;
  generatedAt?: string;
  proofStatus?: string;
  proofStatusNote?: string;
  summary?: { totalCases?: number; blocked?: number; missing?: number; verifier?: Record<string, boolean> };
  cases?: GauntletCase[];
  gauntletHash?: string;
};

const candidates = [
  path.join(/* turbopackIgnore: true */ process.cwd(), 'public', 'proofs', 'fraud-gauntlet.json'),
  path.join(/* turbopackIgnore: true */ process.cwd(), 'app', 'public', 'proofs', 'fraud-gauntlet.json'),
];

function loadGauntlet(): Gauntlet {
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try {
      return JSON.parse(readFileSync(file, 'utf8')) as Gauntlet;
    } catch {}
  }
  return {
    type: 'viral-sync-fraud-gauntlet',
    network: 'solana-devnet',
    proofStatus: 'missing',
    proofStatusNote: 'Run npm run fraud:gauntlet after generating the devnet proof and verifier artifacts.',
    summary: { totalCases: 0, blocked: 0, missing: 0 },
    cases: [],
  };
}

function short(value?: string | null) {
  if (!value) return 'missing';
  return value.length > 24 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
}

function statusTone(status?: string): 'success' | 'warning' | 'danger' | 'muted' {
  if (status === 'blocked' || status === 'verified') return 'success';
  if (status === 'attention' || status === 'partial') return 'warning';
  if (status === 'missing') return 'danger';
  return 'muted';
}

export default function FrontierGauntletPage() {
  const gauntlet = loadGauntlet();
  const cases = gauntlet.cases ?? [];
  const blocked = gauntlet.summary?.blocked ?? cases.filter((item) => item.status === 'blocked').length;
  const total = gauntlet.summary?.totalCases ?? cases.length;
  const missing = gauntlet.summary?.missing ?? cases.filter((item) => item.status === 'missing').length;
  const stale = /needs|stale|unsafe|missing/i.test(gauntlet.proofStatus ?? '');

  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-proof-console">
        <div className="premium-proof-header">
          <div>
            <span className="premium-eyebrow">Fraud Gauntlet</span>
            <h1 className="premium-proof-title">Try to fake a conversion.</h1>
            <p className="premium-lede">
              Viral Sync is strongest when the demo shows abuse failing. This page summarizes the generated attack evidence for merchant-only receipts, wrong terminals, visitor mismatch, replay, inflated rewards, and settlement abuse.
            </p>
            <div className="premium-actions">
              <PremiumButton href="/frontier-proof">View devnet proof</PremiumButton>
              <PremiumButton href="/proof-feed" variant="secondary">Open proof feed</PremiumButton>
              <PremiumButton href="/merchant-passport" variant="quiet">Merchant passport</PremiumButton>
            </div>
          </div>
          <PremiumSurface tone={stale ? 'raised' : 'proof'} className="premium-compact-proof-card">
            <div className="premium-card-title">
              <span>{gauntlet.network ?? 'solana-devnet'}</span>
              <h2>{blocked}/{total} attacks blocked</h2>
              <p>{gauntlet.proofStatusNote ?? 'Generated from proof and verifier artifacts.'}</p>
            </div>
            <PremiumProofRow label="Gauntlet hash" value={short(gauntlet.gauntletHash)} meta="Public proof artifact" status={stale ? 'warning' : 'success'} />
          </PremiumSurface>
        </div>

        <section className="premium-metrics compact" aria-label="Gauntlet summary">
          <PremiumMetric label="Blocked" value={`${blocked}/${total}`} detail="Expected attacks rejected" />
          <PremiumMetric label="Missing" value={`${missing}`} detail={missing ? 'Regenerate with attack checks' : 'All listed cases have evidence'} />
          <PremiumMetric label="Model" value={gauntlet.attestationModel ?? 'merchant_terminal_visitor_signed'} detail={gauntlet.proofLevel ?? 'counter_attested'} />
        </section>

        <section className="premium-gauntlet-list" aria-label="Fraud cases">
          {cases.length ? cases.map((item) => (
            <PremiumSurface key={item.id ?? item.title} tone="light" className="premium-gauntlet-case">
              <div>
                <div className="premium-case-topline">
                  <span>{item.id}</span>
                  <PremiumStatusBadge tone={statusTone(item.status)}>{item.status === 'blocked' ? 'BLOCKED' : (item.status ?? 'missing').toUpperCase()}</PremiumStatusBadge>
                </div>
                <h2>{item.title}</h2>
                <p><strong>Why normal systems fail:</strong> {item.normalReferralFailure ?? 'Manual attribution can be abused.'}</p>
                <p><strong>Viral Sync defense:</strong> {item.viralSyncDefense ?? 'Counter-attested receipt constraints reject the attack.'}</p>
              </div>
              <div className="premium-gauntlet-evidence">
                <span>Observed: {item.observed ?? 'not_proven'}</span>
                <code>{item.evidence ?? 'No proof evidence recorded yet.'}</code>
                <small>Error: {item.errorCode ?? 'unknown'}</small>
                <small>Source: {item.proofSource ?? 'unknown'}</small>
              </div>
            </PremiumSurface>
          )) : (
            <PremiumSurface tone="raised" className="premium-system-section">
              <div className="premium-card-title">
                <span>No gauntlet artifact</span>
                <h2>Generate fraud-gauntlet.json.</h2>
                <p>Run npm run fraud:gauntlet after the proof and verifier artifacts exist.</p>
              </div>
            </PremiumSurface>
          )}
        </section>
      </section>
    </PremiumShell>
  );
}
