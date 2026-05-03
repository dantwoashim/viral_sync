import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { PremiumButton, PremiumMetric, PremiumNav, PremiumProofRow, PremiumShell, PremiumStatusBadge, PremiumSurface } from '@/components/premium/PremiumUi';

type FeedEntry = { id?: string; title?: string; kind?: string; status?: string; detail?: string; signature?: string | null; explorerLink?: string | null; object?: string; objectLink?: string | null };
type ProofFeed = { type?: string; network?: string; generatedAt?: string; proofStatus?: string; proofLevel?: string; attestationModel?: string; merchantAlias?: string; entries?: FeedEntry[] };

const candidates = [path.join(process.cwd(), 'public', 'proofs', 'proof-feed.json'), path.join(process.cwd(), 'app', 'public', 'proofs', 'proof-feed.json')];
function loadFeed(): ProofFeed {
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try { return JSON.parse(readFileSync(file, 'utf8')) as ProofFeed; } catch {}
  }
  return { type: 'viral-sync-proof-feed', network: 'solana-devnet', proofStatus: 'missing', entries: [] };
}
function short(value?: string | null) { return !value ? 'missing' : value.length > 28 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value; }
function tone(status?: string): 'success' | 'warning' | 'danger' | 'muted' { return status === 'verified' ? 'success' : status === 'attention' ? 'warning' : status === 'pending' ? 'warning' : 'muted'; }

export default function ProofFeedPage() {
  const feed = loadFeed();
  const entries = feed.entries ?? [];
  const verified = entries.filter((entry) => entry.status === 'verified').length;
  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-proof-console">
        <div className="premium-proof-header">
          <div>
            <span className="premium-eyebrow">Proof feed</span>
            <h1 className="premium-proof-title">Every conversion becomes a proof object.</h1>
            <p className="premium-lede">A compact feed of the campaign funding, causal receipt, settlement, fraud gauntlet, and merchant proof passport generated from the latest proof artifacts.</p>
            <div className="premium-actions">
              <PremiumButton href="/frontier-proof">Devnet proof</PremiumButton>
              <PremiumButton href="/frontier-gauntlet" variant="secondary">Fraud gauntlet</PremiumButton>
              <PremiumButton href="/receipt/latest" variant="quiet">Receipt QR page</PremiumButton>
            </div>
          </div>
          <PremiumSurface tone="proof" className="premium-compact-proof-card">
            <div className="premium-card-title">
              <span>{feed.network ?? 'solana-devnet'}</span>
              <h2>{verified}/{entries.length} feed items verified</h2>
              <p>{feed.merchantAlias ?? 'Thamel Brew House'} · {feed.proofLevel ?? 'counter_attested'}</p>
            </div>
          </PremiumSurface>
        </div>

        <section className="premium-metrics compact" aria-label="Proof feed summary">
          <PremiumMetric label="Status" value={feed.proofStatus ?? 'unknown'} detail={feed.generatedAt ? `Generated ${feed.generatedAt}` : 'Generate proof-feed.json'} />
          <PremiumMetric label="Attestation" value={feed.attestationModel ?? 'merchant_terminal_visitor_signed'} detail="Merchant + terminal + visitor" />
          <PremiumMetric label="Entries" value={`${entries.length}`} detail="Proof events in this packet" />
        </section>

        <section className="premium-feed-list">
          {entries.length ? entries.map((entry, index) => (
            <PremiumSurface key={entry.id ?? index} tone="light" className="premium-feed-item">
              <div className="premium-feed-index">{String(index + 1).padStart(2, '0')}</div>
              <div>
                <div className="premium-case-topline">
                  <span>{entry.kind}</span>
                  <PremiumStatusBadge tone={tone(entry.status)}>{entry.status ?? 'unknown'}</PremiumStatusBadge>
                </div>
                <h2>{entry.title}</h2>
                <p>{entry.detail}</p>
              </div>
              <div className="premium-feed-proof">
                <PremiumProofRow label="Signature" value={short(entry.signature)} meta={entry.explorerLink ? 'Explorer link available' : 'No transaction link'} status={entry.signature ? 'success' : 'muted'} />
                <PremiumProofRow label="Object" value={short(entry.object)} meta={entry.objectLink ? 'Account link available' : 'Proof object hash/address'} status={entry.object ? 'success' : 'muted'} />
              </div>
            </PremiumSurface>
          )) : (
            <PremiumSurface tone="raised" className="premium-system-section"><div className="premium-card-title"><span>No feed artifact</span><h2>Generate proof-feed.json.</h2><p>Run npm run proof:feed after the proof, verifier, gauntlet, and passport artifacts exist.</p></div></PremiumSurface>
          )}
        </section>
      </section>
    </PremiumShell>
  );
}
