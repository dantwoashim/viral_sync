import { readFileSync } from 'fs';
import path from 'path';
import {
  PremiumButton,
  PremiumMetric,
  PremiumNav,
  PremiumProofRow,
  PremiumShell,
  PremiumStatusBadge,
  PremiumSurface,
  PremiumTransactionPanel,
} from '@/components/premium/PremiumUi';

type ProofSignature = string | null | { signature?: string | null; reused?: boolean };

type ProofManifest = {
  kind?: string;
  cluster?: string;
  status?: string;
  programId?: string;
  hashes?: {
    intentManifestHash?: string;
    visitAttestationHash?: string;
  };
  pdas?: Record<string, string>;
  signatures?: Record<string, ProofSignature>;
  explorerLinks?: {
    transactions?: Record<string, string | null>;
    accounts?: Record<string, string | null>;
  };
  replayChecks?: Array<{ label?: string; rejected?: boolean; message?: string }>;
  effectChecks?: Array<{ label?: string; ok?: boolean; reason?: string }>;
  limitation?: string;
};

const proofPath = path.join(process.cwd(), 'app', 'public', 'proofs', 'devnet-causal-commerce.json');

function loadProof(): ProofManifest {
  try {
    return JSON.parse(readFileSync(proofPath, 'utf8')) as ProofManifest;
  } catch {
    return {
      kind: 'viral-sync-devnet-causal-commerce',
      cluster: 'devnet',
      status: 'proof-missing',
      limitation: 'Run npm run devnet:causal-commerce to generate the devnet proof manifest.',
      signatures: {},
      pdas: {},
      hashes: {},
      explorerLinks: { transactions: {}, accounts: {} },
    };
  }
}

function signatureValue(value: ProofSignature | undefined) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.signature ?? null;
}

function short(value?: string | null) {
  if (!value) return 'pending';
  if (value.length <= 24) return value;
  return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

function proofStatus(signature: string | null | undefined, reused?: boolean) {
  if (signature) return 'success';
  if (reused) return 'muted';
  return 'warning';
}

function reusedFlag(value: ProofSignature | undefined) {
  return Boolean(value && typeof value === 'object' && value.reused);
}

export default function FrontierProofPage() {
  const proof = loadProof();
  const signatures = proof.signatures ?? {};
  const txLinks = proof.explorerLinks?.transactions ?? {};
  const accountLinks = proof.explorerLinks?.accounts ?? {};
  const pdas = proof.pdas ?? {};
  const hashes = proof.hashes ?? {};
  const proofSteps = [
    ['Merchant registered', 'registerMerchant'],
    ['Campaign created', 'createGrowthCampaign'],
    ['Bounty funded', 'fundGrowthBounty'],
    ['Causal receipt recorded', 'recordCausalReceipt'],
    ['Reward settled', 'settleReceiptReward'],
  ] as const;
  const verifiedSteps = proofSteps.filter(([, key]) => signatureValue(signatures[key]) || reusedFlag(signatures[key])).length;

  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-flow-grid">
        <div className="premium-hero-copy">
          <span className="premium-eyebrow">Frontier proof</span>
          <h1 className="premium-h1">A merchant-funded causal receipt on devnet.</h1>
          <p className="premium-lede">
            This page is the narrow proof path: merchant registration, campaign creation, bounty funding,
            receipt recording, and reward settlement. The app preview can be local; this proof is the chain-facing artifact.
          </p>
          <div className="premium-actions">
            <PremiumButton href="/merchant/scan">Open counter flow</PremiumButton>
            <PremiumButton href="/security" variant="secondary">Trust model</PremiumButton>
          </div>
        </div>

        <PremiumTransactionPanel eyebrow={proof.cluster ?? 'devnet'} title="Devnet transaction path">
          {proofSteps.map(([label, key]) => {
            const signature = signatureValue(signatures[key]);
            const reused = reusedFlag(signatures[key]);
            return (
              <div className="premium-proof-row" key={key}>
                <div>
                  <span>{label}</span>
                  <small>{txLinks[key] ? <a href={txLinks[key] ?? undefined}>Open in Explorer</a> : reused ? 'Existing account reused' : 'Awaiting proof run'}</small>
                </div>
                <code>{short(signature)}</code>
                <PremiumStatusBadge tone={proofStatus(signature, reused)}>{signature ? 'Verified' : reused ? 'Reference' : 'Needs run'}</PremiumStatusBadge>
              </div>
            );
          })}
        </PremiumTransactionPanel>
      </section>

      <section className="premium-system-grid" style={{ marginTop: 'clamp(42px, 7vw, 76px)' }}>
        <PremiumSurface tone="light" className="premium-system-section">
          <div className="premium-card-title">
            <span>Proof objects</span>
            <h2>Accounts and commitments.</h2>
          </div>
          <div className="premium-proof-stack">
            <PremiumProofRow label="Receipt PDA" value={short(pdas.causalReceipt)} meta={accountLinks.causalReceipt ? 'Explorer link available' : 'Proof manifest value'} status="success" />
            <PremiumProofRow label="Nullifier PDA" value={short(pdas.nullifierRecord)} meta="Replay rejection account" status="danger" />
            <PremiumProofRow label="Reward escrow" value={short(pdas.rewardEscrow)} meta="Merchant-funded vault authority" status="success" />
            <PremiumProofRow label="Intent manifest" value={short(hashes.intentManifestHash)} meta="Committed on receipt account" status="success" />
            <PremiumProofRow label="Visit attestation" value={short(hashes.visitAttestationHash)} meta="Staff-confirmed visit commitment" status="success" />
          </div>
        </PremiumSurface>

        <PremiumSurface tone="raised" className="premium-system-section">
          <div className="premium-card-title">
            <span>Malicious path</span>
            <h2>What gets rejected.</h2>
          </div>
          <div className="premium-proof-stack">
            {(proof.effectChecks?.length ? proof.effectChecks : [
              { label: 'Wrong beneficiary', ok: false, reason: 'Referrer beneficiary does not match manifest.' },
              { label: 'Inflated reward', ok: false, reason: 'Reward amount exceeds manifest maximum.' },
              { label: 'Forbidden instruction', ok: false, reason: 'Instruction is not allowed by manifest.' },
            ]).map((check, index) => (
              <PremiumProofRow
                key={`${check.label ?? 'effect'}-${index}`}
                label={check.label ?? 'Effect check'}
                value={check.ok ? 'accepted' : 'rejected'}
                meta={check.reason ?? 'Effect policy result'}
                status={check.ok ? 'success' : 'danger'}
              />
            ))}
          </div>
        </PremiumSurface>
      </section>

      <section className="premium-metrics" aria-label="Frontier proof summary">
        <PremiumMetric label="Program" value={short(proof.programId)} detail={proof.kind ?? 'viral-sync-devnet-causal-commerce'} />
        <PremiumMetric label="Proof steps" value={`${verifiedSteps}/5`} detail={proof.status === 'pending-devnet-run' ? 'Devnet manifest still pending.' : 'Chain path manifest loaded.'} />
        <PremiumMetric label="Limit" value="Unaudited" detail={proof.limitation ?? 'External audit required before mainnet value.'} />
      </section>
    </PremiumShell>
  );
}
