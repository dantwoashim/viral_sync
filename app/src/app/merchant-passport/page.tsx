import { existsSync, readFileSync } from 'fs';
import path from 'path';
import {
  PremiumButton,
  PremiumMetric,
  PremiumNav,
  PremiumProofRow,
  PremiumShell,
  PremiumSurface,
} from '@/components/premium/PremiumUi';

type Passport = {
  type?: string;
  version?: string;
  merchantAlias?: string;
  network?: string;
  programId?: string;
  generatedAt?: string;
  sourceManifestGeneratedAt?: string;
  proofStatus?: string;
  proofStatusNote?: string;
  proofLevel?: string;
  attestationModel?: string;
  privacyModel?: string;
  passportHash?: string;
  verifiedFacts?: Record<string, boolean>;
  commerceSignals?: Record<string, string | number>;
  proofObjects?: Record<string, string | undefined>;
  explorerLinks?: Record<string, string | null | undefined>;
  limitations?: string[];
};

const passportCandidates = [
  path.join(/* turbopackIgnore: true */ process.cwd(), 'public', 'proofs', 'merchant-passport.json'),
  path.join(/* turbopackIgnore: true */ process.cwd(), 'app', 'public', 'proofs', 'merchant-passport.json'),
];

function loadPassport(): Passport {
  for (const candidate of passportCandidates) {
    if (!existsSync(candidate)) continue;
    try {
      return JSON.parse(readFileSync(candidate, 'utf8')) as Passport;
    } catch {
      // Try next path so monorepo root and app workspace both work.
    }
  }

  return {
    type: 'viral-sync-merchant-proof-passport',
    merchantAlias: 'Thamel Brew House',
    network: 'solana-devnet',
    proofStatus: 'missing',
    proofStatusNote: 'Run npm run merchant:passport after generating the devnet proof and verifier output.',
    verifiedFacts: {},
    commerceSignals: {},
    proofObjects: {},
    explorerLinks: {},
    limitations: ['Passport artifact missing. Generate it with npm run merchant:passport.'],
  };
}

function short(value?: string | null) {
  if (!value) return 'missing';
  if (value.length <= 24) return value;
  return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

function statusTone(passport: Passport) {
  if (!passport.proofStatus || passport.proofStatus === 'ready') return 'success';
  if (/needs|stale|missing|unsafe/i.test(passport.proofStatus)) return 'warning';
  return 'muted';
}

const factLabels: Array<[string, string]> = [
  ['campaignFunded', 'Campaign funded'],
  ['receiptRecorded', 'Receipt recorded'],
  ['rewardSettled', 'Reward settled'],
  ['nullifierRecorded', 'Nullifier recorded'],
  ['intentManifestCommitted', 'Intent hash committed'],
  ['verifierOk', 'Verifier ok=true'],
  ['replayRejected', 'Replay checks rejected'],
  ['intentValidation', 'Intent checks constrained'],
];

export default function MerchantPassportPage() {
  const passport = loadPassport();
  const facts = passport.verifiedFacts ?? {};
  const signals = passport.commerceSignals ?? {};
  const proofObjects = passport.proofObjects ?? {};
  const explorer = passport.explorerLinks ?? {};
  const tone = statusTone(passport);

  return (
    <PremiumShell>
      <PremiumNav />

      <section className="premium-hero">
        <div className="premium-hero-copy">
          <span className="premium-eyebrow">Merchant Proof Passport</span>
          <h1 className="premium-h1">Portable proof-of-local-commerce.</h1>
          <p className="premium-lede">
            Viral Sync folds a settled Causal Receipt into a merchant-owned proof packet: funded vault,
            receipt PDA, nullifier, settlement record, verifier result, and privacy boundaries — without
            publishing customer names, phone numbers, emails, or GPS coordinates.
          </p>
          <div className="premium-actions">
            <PremiumButton href="/frontier-proof">Open devnet proof</PremiumButton>
            <PremiumButton href="/proofs/merchant-passport.json" variant="secondary">Open passport JSON</PremiumButton>
          </div>
        </div>

        <PremiumSurface tone="proof" className="premium-ops-card">
          <div className="premium-card-title">
            <span>{passport.network ?? 'solana-devnet'}</span>
            <h2>{passport.merchantAlias ?? 'Merchant'} passport</h2>
            <p>{passport.privacyModel ?? 'Privacy-preserving commerce proof packet.'}</p>
          </div>
          <div className="premium-proof-stack">
            <PremiumProofRow label="Passport hash" value={short(passport.passportHash)} meta="Hash of public passport fields" status="success" />
            <PremiumProofRow label="Proof status" value={passport.proofStatus ?? 'ready'} meta={passport.proofStatusNote ?? 'Generated from verifier output'} status={tone} />
            <PremiumProofRow label="Attestation model" value={passport.attestationModel ?? 'counter-attested'} meta={passport.proofLevel ?? 'counter-attested receipt'} status="success" />
          </div>
        </PremiumSurface>
      </section>

      <section className="premium-metrics" aria-label="Merchant proof passport signals">
        <PremiumMetric label="Receipts" value={String(signals.receiptsRecorded ?? '0')} detail="Counter-attested receipt count" />
        <PremiumMetric label="Settled" value={String(signals.settledVolume ?? 'missing')} detail="Reward units settled" />
        <PremiumMetric label="Vault left" value={String(signals.vaultRemaining ?? 'missing')} detail="Remaining reward vault" />
      </section>

      <section className="premium-system-grid" style={{ marginTop: 'clamp(38px, 6vw, 72px)' }}>
        <PremiumSurface tone="light" className="premium-system-section">
          <div className="premium-card-title">
            <span>Verified facts</span>
            <h2>What the passport claims.</h2>
            <p>Each fact is derived from the devnet proof manifest and verifier output.</p>
          </div>
          <div className="premium-proof-stack">
            {factLabels.map(([key, label]) => (
              <PremiumProofRow
                key={key}
                label={label}
                value={facts[key] ? 'true' : 'false'}
                meta={facts[key] ? 'Included in passport' : 'Regenerate proof before submission'}
                status={facts[key] ? 'success' : 'warning'}
              />
            ))}
          </div>
        </PremiumSurface>

        <PremiumSurface tone="raised" className="premium-system-section">
          <div className="premium-card-title">
            <span>Proof objects</span>
            <h2>Portable receipt trail.</h2>
            <p>These objects let a third party verify the merchant&apos;s local-commerce activity.</p>
          </div>
          <div className="premium-proof-stack">
            <PremiumProofRow label="Program" value={short(passport.programId)} meta="Solana program ID" status="success" />
            <PremiumProofRow label="Receipt PDA" value={short(proofObjects.receiptPda)} meta={explorer.receiptPda ? 'Explorer link available' : 'Public PDA'} status="success" />
            <PremiumProofRow label="Nullifier PDA" value={short(proofObjects.nullifierPda)} meta="Replay prevention record" status="danger" />
            <PremiumProofRow label="Settlement" value={short(proofObjects.settlementRecord)} meta="Reward movement record" status="success" />
            <PremiumProofRow label="Intent hash" value={short(proofObjects.intentManifestHash)} meta="Committed in receipt path" status="success" />
          </div>
        </PremiumSurface>
      </section>

      <section className="premium-system-grid" style={{ marginTop: '24px' }}>
        <PremiumSurface tone="light" className="premium-system-section">
          <div className="premium-card-title">
            <span>Privacy boundary</span>
            <h2>What is not published.</h2>
          </div>
          <p className="premium-copy">
            The passport does not publish customer names, phone numbers, emails, raw staff notes, or GPS coordinates.
            It publishes hashes, public accounts, token movement, and verifier results.
          </p>
        </PremiumSurface>

        <PremiumSurface tone="light" className="premium-system-section">
          <div className="premium-card-title">
            <span>Limitations</span>
            <h2>Honest scope.</h2>
          </div>
          <div className="premium-proof-stack">
            {(passport.limitations ?? ['Mainnet use requires audit.']).map((item, index) => (
              <PremiumProofRow key={item} label={`Limit ${index + 1}`} value="declared" meta={item} status="warning" />
            ))}
          </div>
        </PremiumSurface>
      </section>
    </PremiumShell>
  );
}
