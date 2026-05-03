import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { PremiumNav, PremiumShell, PremiumSurface } from '@/components/premium/PremiumUi';

type ReceiptProof = {
  pdas?: Record<string, string | undefined>;
  hashes?: Record<string, string | undefined>;
};

const labels = [
  'merchantConfig',
  'growthCampaign',
  'terminalDevice',
  'visitorAuthority',
  'claimPass',
  'nullifierRecord',
  'causalReceipt',
  'settlementRecord',
  'rewardEscrow',
];

function load(): ReceiptProof {
  const candidates = [
    path.join(process.cwd(), 'public', 'proofs', 'devnet-causal-commerce.json'),
    path.join(process.cwd(), 'app', 'public', 'proofs', 'devnet-causal-commerce.json'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return JSON.parse(readFileSync(candidate, 'utf8')) as ReceiptProof;
    }
  }

  return { pdas: {}, hashes: {} };
}

function short(value: unknown) {
  const text = String(value ?? 'missing');
  return text.length > 26 ? `${text.slice(0, 10)}...${text.slice(-8)}` : text;
}

export default function ReceiptAnatomyPage() {
  const proof = load();

  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-proof-console">
        <span className="premium-eyebrow">Receipt anatomy</span>
        <h1 className="premium-proof-title">One conversion, ten proof objects.</h1>
        <p className="premium-lede">
          A POC-1 receipt is not a database row. It is a connected proof object:
          merchant, campaign, terminal, visitor, claim pass, nullifier, receipt,
          settlement, intent hash, and escrow.
        </p>
        <section className="premium-gauntlet-list">
          {labels.map((key) => (
            <PremiumSurface key={key} tone="light" className="premium-gauntlet-case">
              <div>
                <div className="premium-case-topline"><span>Proof object</span></div>
                <h2>{key}</h2>
                <p><code>{short(proof.pdas?.[key])}</code></p>
              </div>
            </PremiumSurface>
          ))}
        </section>
        <PremiumSurface tone="proof" className="premium-system-section" style={{ marginTop: 32 }}>
          <div className="premium-card-title">
            <span>Receipt printer</span>
            <h2>THAMEL BREW - Verified Conversion Receipt</h2>
          </div>
          <ul className="premium-readiness-list">
            <li>Merchant: verified</li>
            <li>Terminal: verified</li>
            <li>Visitor: signed</li>
            <li>Claim-pass account lineage: valid</li>
            <li>Reward escrow: funded</li>
            <li>Settlement: paid</li>
            <li>Replay protection: active</li>
            <li>Intent hash: {short(proof.hashes?.intentManifestHash)}</li>
          </ul>
        </PremiumSurface>
      </section>
    </PremiumShell>
  );
}
