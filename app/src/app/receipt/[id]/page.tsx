import { existsSync, readFileSync } from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { PremiumButton, PremiumMetric, PremiumNav, PremiumProofRow, PremiumShell, PremiumSurface } from '@/components/premium/PremiumUi';

type Manifest = { cluster?: string; generatedAt?: string; programId?: string; proofStatus?: string; proofLevel?: string; attestationModel?: string; targetProofLevel?: string; targetAttestationModel?: string; inputs?: { receiptId?: string; campaignId?: string; rewardPerVisit?: string }; pdas?: Record<string, string | number | undefined>; hashes?: Record<string, string | undefined>; transactions?: Record<string, string | null | undefined>; signatures?: Record<string, unknown>; explorerLinks?: { transactions?: Record<string, string | null | undefined>; accounts?: Record<string, string | null | undefined> }; tokenBalances?: { after?: Record<string, string> } };
type Verifier = { ok?: boolean; receipt?: { status?: unknown; settledAmount?: string }; settlementRecord?: { referrerAmount?: string; visitorAmount?: string }; nullifierRecord?: unknown; tokenBalances?: Record<string, string> };

function loadJson<T>(candidates: string[], fallback: T): T { for (const file of candidates) { if (!existsSync(file)) continue; try { return JSON.parse(readFileSync(file, 'utf8')) as T; } catch {} } return fallback; }
function short(value?: string | null) { return !value ? 'missing' : value.length > 28 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value; }
function sig(value: unknown): string | null { if (!value) return null; if (typeof value === 'string') return value; if (typeof value === 'object' && value !== null && 'signature' in value) return String((value as { signature?: string }).signature ?? ''); return null; }
function proofStatus(value: unknown, stale: boolean): 'success' | 'warning' { return value && !stale ? 'success' : 'warning'; }

export default async function ReceiptProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const manifest = loadJson<Manifest>([path.join(/* turbopackIgnore: true */ process.cwd(), 'public', 'proofs', 'devnet-causal-commerce.json'), path.join(/* turbopackIgnore: true */ process.cwd(), 'app', 'public', 'proofs', 'devnet-causal-commerce.json')], {});
  // Production proof pages use the published verifier artifact.
  // tmp fallback is local-development only.
  const verifier = loadJson<Verifier>([path.join(/* turbopackIgnore: true */ process.cwd(), 'public', 'proofs', 'devnet-causal-commerce-verifier.json'), path.join(/* turbopackIgnore: true */ process.cwd(), 'app', 'public', 'proofs', 'devnet-causal-commerce-verifier.json'), path.join(/* turbopackIgnore: true */ process.cwd(), '..', 'tmp', 'devnet-causal-commerce-verifier.json'), path.join(/* turbopackIgnore: true */ process.cwd(), 'tmp', 'devnet-causal-commerce-verifier.json')], {});
  const txLinks = manifest.explorerLinks?.transactions ?? {};
  const accountLinks = manifest.explorerLinks?.accounts ?? {};
  const receiptId = id === 'latest' ? manifest.inputs?.receiptId ?? 'latest' : id;
  const receiptSig = sig(manifest.signatures?.recordCausalReceipt) ?? manifest.transactions?.recordCausalReceipt;
  const settleSig = sig(manifest.signatures?.settleReceiptReward) ?? manifest.transactions?.settleReceiptReward;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const publicUrl = `${baseUrl.replace(/\/$/, '')}/receipt/${encodeURIComponent(receiptId)}`;
  const stale = /needs|stale|unsafe/i.test(manifest.proofStatus ?? '');
  const qrDataUrl = await QRCode.toDataURL(publicUrl, { margin: 1, width: 180 });

  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-proof-console">
        <div className="premium-proof-header">
          <div>
            <span className="premium-eyebrow">Portable receipt proof</span>
            <h1 className="premium-proof-title">Receipt {short(receiptId)}.</h1>
            <p className="premium-lede">A shareable proof page for one counter-attested conversion: receipt PDA, nullifier, settlement record, intent hash, and devnet transaction links.</p>
            <div className="premium-actions">
              <PremiumButton href="/frontier-proof">Full proof</PremiumButton>
              <PremiumButton href="/frontier-gauntlet" variant="secondary">Fraud gauntlet</PremiumButton>
              <PremiumButton href="/proof-feed" variant="quiet">Proof feed</PremiumButton>
            </div>
          </div>
          <PremiumSurface tone={stale ? 'raised' : 'proof'} className="premium-compact-proof-card">
            <div className="premium-card-title">
              <span>{manifest.cluster ?? 'devnet'} receipt QR</span>
              <h2>{verifier.ok ? 'Verifier ok=true' : stale ? 'Regenerate proof' : 'Verifier pending'}</h2>
              <p>{manifest.proofLevel ?? manifest.targetProofLevel ?? 'counter_attested'} · {manifest.attestationModel ?? manifest.targetAttestationModel ?? 'merchant_terminal_visitor_signed'}</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="premium-receipt-qr" src={qrDataUrl} alt="QR code to receipt proof" />
          </PremiumSurface>
        </div>

        <section className="premium-metrics compact" aria-label="Receipt summary">
          <PremiumMetric label="Receipt" value={short(String(manifest.pdas?.causalReceipt ?? ''))} detail="Causal Receipt PDA" />
          <PremiumMetric label="Settlement" value={short(String(settleSig ?? ''))} detail={`${verifier.receipt?.settledAmount ?? manifest.inputs?.rewardPerVisit ?? 'unknown'} units settled`} />
          <PremiumMetric label="Nullifier" value={verifier.nullifierRecord ? 'recorded' : short(String(manifest.pdas?.nullifierRecord ?? ''))} detail="Replay defense" />
        </section>

        <section className="premium-system-grid">
          <PremiumSurface tone="light" className="premium-system-section">
            <div className="premium-card-title"><span>Receipt objects</span><h2>Evidence bundle.</h2><p>{manifest.generatedAt ? `Generated ${manifest.generatedAt}` : 'Proof manifest timestamp missing.'}</p></div>
            <div className="premium-proof-stack">
              <PremiumProofRow label="Receipt PDA" value={short(String(manifest.pdas?.causalReceipt ?? ''))} meta={accountLinks.causalReceipt ? 'Explorer link available' : 'Proof manifest value'} status={proofStatus(manifest.pdas?.causalReceipt, stale)} />
              <PremiumProofRow label="Nullifier PDA" value={short(String(manifest.pdas?.nullifierRecord ?? ''))} meta="Duplicate claim defense" status={proofStatus(manifest.pdas?.nullifierRecord, stale)} />
              <PremiumProofRow label="Intent manifest hash" value={short(manifest.hashes?.intentManifestHash)} meta="Committed on receipt account" status={proofStatus(manifest.hashes?.intentManifestHash, stale)} />
              <PremiumProofRow label="Lineage / claim pass" value={short(String(manifest.pdas?.claimPass ?? 'pending'))} meta="Claim-pass account lineage" status={manifest.pdas?.claimPass ? 'success' : 'warning'} />
            </div>
          </PremiumSurface>
          <PremiumSurface tone="raised" className="premium-system-section">
            <div className="premium-card-title"><span>Transactions</span><h2>Open the chain trail.</h2><p>These links are the portable proof trail for the conversion.</p></div>
            <div className="premium-proof-stack">
              <PremiumProofRow label="record_causal_receipt" value={short(receiptSig)} meta={txLinks.recordCausalReceipt ? 'Open in Explorer' : 'Missing link'} status={receiptSig ? 'success' : 'warning'} />
              <PremiumProofRow label="settle_receipt_reward" value={short(settleSig)} meta={txLinks.settleReceiptReward ? 'Open in Explorer' : 'Missing link'} status={settleSig ? 'success' : 'warning'} />
              <PremiumProofRow label="Reward vault" value={short(String(manifest.pdas?.rewardVault ?? ''))} meta={`Vault balance ${verifier.tokenBalances?.rewardVault ?? manifest.tokenBalances?.after?.rewardVault ?? 'unknown'}`} status={proofStatus(manifest.pdas?.rewardVault, stale)} />
              <PremiumProofRow label="Fraud Gauntlet" value="Open result" meta="Links this receipt to the structured attack evidence." status="success" />
            </div>
            <div className="premium-actions" style={{ marginTop: 18 }}>
              <PremiumButton href="/frontier-gauntlet" variant="secondary">Fraud Gauntlet</PremiumButton>
            </div>
          </PremiumSurface>
        </section>
      </section>
    </PremiumShell>
  );
}
