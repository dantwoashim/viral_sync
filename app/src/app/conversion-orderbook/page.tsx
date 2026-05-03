import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { PremiumButton, PremiumMetric, PremiumNav, PremiumShell, PremiumStatusBadge, PremiumSurface } from '@/components/premium/PremiumUi';

type Campaign = {
  slug?: string;
  title?: string;
  merchantAlias?: string;
  category?: string;
  publicPath?: string;
  status?: string;
  proofBacked?: boolean;
  proofLevel?: string;
  attestationModel?: string;
  bounty?: Record<string, unknown>;
  verification?: Record<string, boolean>;
};
type Orderbook = { title?: string; thesis?: string; proofStatus?: string; network?: string; orderbookHash?: string; campaigns?: Campaign[]; integrityRules?: string[] };

function loadJson<T>(candidates: string[], fallback: T): T {
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try { return JSON.parse(readFileSync(file, 'utf8')) as T; } catch {}
  }
  return fallback;
}
function short(value?: unknown) { const text = String(value ?? 'missing'); return text.length > 24 ? `${text.slice(0, 10)}...${text.slice(-8)}` : text; }
function tone(status?: string): 'success' | 'warning' | 'danger' | 'muted' {
  if (status === 'proof_backed_demo' || status === 'ready' || status === 'verified') return 'success';
  if (status?.includes('needs')) return 'warning';
  if (status?.includes('vision')) return 'muted';
  return 'warning';
}

function CampaignCard({ campaign, proofBacked }: { campaign: Campaign; proofBacked: boolean }) {
  return (
    <PremiumSurface tone="light" className="premium-gauntlet-case">
      <div>
        <div className="premium-case-topline">
          <span>{campaign.category}</span>
          <PremiumStatusBadge tone={proofBacked ? tone(campaign.status) : 'muted'}>{proofBacked ? campaign.status ?? 'verified' : 'vision-only'}</PremiumStatusBadge>
        </div>
        <h2>{campaign.title}</h2>
        <p>{campaign.merchantAlias} - Reward {String(campaign.bounty?.rewardUnits ?? 'future')} units - {String(campaign.bounty?.payoutCondition ?? 'POC-1 conversion receipt')}</p>
      </div>
      <div className="premium-gauntlet-evidence">
        <span>{proofBacked ? campaign.proofLevel ?? 'counter_attested' : 'vision-only'}</span>
        <code>{campaign.publicPath}</code>
        <small>{proofBacked ? 'Backed by devnet proof and verifier.' : 'Not claimed as verified campaign evidence.'}</small>
        <PremiumButton href={campaign.publicPath ?? '/conversion-orderbook'} variant={proofBacked ? 'primary' : 'secondary'}>{proofBacked ? 'Claim pass preview' : 'Preview lane'}</PremiumButton>
      </div>
    </PremiumSurface>
  );
}

export default function ConversionOrderbookPage() {
  const orderbook = loadJson<Orderbook>([
    path.join(/* turbopackIgnore: true */ process.cwd(), 'public', 'proofs', 'conversion-orderbook.json'),
    path.join(/* turbopackIgnore: true */ process.cwd(), 'app', 'public', 'proofs', 'conversion-orderbook.json'),
  ], { campaigns: [], proofStatus: 'missing' });
  const campaigns = orderbook.campaigns ?? [];
  const proofBackedCampaigns = campaigns.filter((campaign) => campaign.proofBacked);
  const visionCampaigns = campaigns.filter((campaign) => !campaign.proofBacked);

  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-proof-console">
        <div className="premium-proof-header">
          <div>
            <span className="premium-eyebrow">Conversion Orderbook</span>
            <h1 className="premium-proof-title">Permissionless CPA, without black-box attribution.</h1>
            <p className="premium-lede">{orderbook.thesis ?? 'Merchants escrow conversion bounties; terminals and visitors counter-attest conversions; Solana settles proof-backed payouts.'}</p>
            <div className="premium-actions">
              <PremiumButton href="/campaign/thamel-brew-counter-attested-visits">Open proof-backed campaign</PremiumButton>
              <PremiumButton href="/frontier-gauntlet" variant="secondary">Fraud gauntlet</PremiumButton>
              <PremiumButton href="/merchant-validation" variant="quiet">Validation kit</PremiumButton>
            </div>
          </div>
          <PremiumSurface tone="proof" className="premium-compact-proof-card">
            <div className="premium-card-title">
              <span>{orderbook.network ?? 'solana-devnet'}</span>
              <h2>{proofBackedCampaigns.length}/{campaigns.length} campaigns proof-backed</h2>
              <p>Orderbook hash {short(orderbook.orderbookHash)}</p>
            </div>
          </PremiumSurface>
        </div>
        <section className="premium-metrics compact">
          <PremiumMetric label="Status" value={orderbook.proofStatus ?? 'unknown'} detail="Generated from proof artifacts" />
          <PremiumMetric label="Proof-backed" value={`${proofBackedCampaigns.length}`} detail="Backed by current devnet proof" />
          <PremiumMetric label="Vision lanes" value={`${visionCampaigns.length}`} detail="Clearly labeled as not verified" />
        </section>

        <div className="premium-card-title">
          <span>Proof-backed campaigns</span>
          <h2>Backed by the current POC-1 verifier.</h2>
        </div>
        <section className="premium-gauntlet-list">
          {proofBackedCampaigns.map((campaign) => <CampaignCard key={campaign.slug} campaign={campaign} proofBacked />)}
        </section>

        <div className="premium-card-title">
          <span>Vision lanes</span>
          <h2>Market directions, not verified campaigns.</h2>
        </div>
        <section className="premium-gauntlet-list">
          {visionCampaigns.map((campaign) => <CampaignCard key={campaign.slug} campaign={campaign} proofBacked={false} />)}
        </section>

        <PremiumSurface tone="raised" className="premium-system-section">
          <div className="premium-card-title"><span>Integrity rules</span><h2>Why this is not a normal ad marketplace.</h2></div>
          <ul className="premium-readiness-list">{(orderbook.integrityRules ?? []).map((rule) => <li key={rule}>{rule}</li>)}</ul>
        </PremiumSurface>
      </section>
    </PremiumShell>
  );
}
