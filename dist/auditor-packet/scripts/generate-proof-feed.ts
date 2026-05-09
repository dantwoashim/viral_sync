import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

type Manifest = {
  cluster?: string;
  programId?: string;
  proofStatus?: string;
  proofLevel?: string;
  targetProofLevel?: string;
  attestationModel?: string;
  targetAttestationModel?: string;
  inputs?: { rewardPerVisit?: string; amountToFund?: string };
  pdas?: Record<string, string | number | undefined>;
  signatures?: Record<string, unknown>;
  transactions?: Record<string, string | null | undefined>;
  explorerLinks?: { transactions?: Record<string, string | null | undefined>; accounts?: Record<string, string | null | undefined> };
};
type Verifier = {
  ok?: boolean;
  terminalVerified?: boolean;
  visitorVerified?: boolean;
  lineageVerified?: boolean;
  settlementVerified?: boolean;
  nullifierVerified?: boolean;
  receipt?: { settledAmount?: string };
  rewardEscrow?: { totalFunded?: string };
};
type Passport = { passportHash?: string; proofStatus?: string; verifiedFacts?: Record<string, boolean> };
type Gauntlet = { gauntletHash?: string; proofStatus?: string; summary?: { blocked?: number; totalCases?: number } };
type Orderbook = { orderbookHash?: string; campaigns?: Array<{ proofBacked?: boolean; status?: string; proofLevel?: string; verification?: Record<string, boolean> }> };
type CampaignLinks = { campaignLinksHash?: string; links?: Array<{ proofBacked?: boolean; status?: string; proofLevel?: string; campaignProofLevel?: string; terminalVerified?: boolean; visitorVerified?: boolean; lineageVerified?: boolean; settlementVerified?: boolean }> };

const DEFAULT_MANIFEST = path.join('app', 'public', 'proofs', 'devnet-causal-commerce.json');
const DEFAULT_VERIFIER = path.join('tmp', 'devnet-causal-commerce-verifier.json');
const DEFAULT_PASSPORT = path.join('app', 'public', 'proofs', 'merchant-passport.json');
const DEFAULT_GAUNTLET = path.join('app', 'public', 'proofs', 'fraud-gauntlet.json');
const DEFAULT_ORDERBOOK = path.join('app', 'public', 'proofs', 'conversion-orderbook.json');
const DEFAULT_CAMPAIGN_LINKS = path.join('app', 'public', 'proofs', 'campaign-links.json');
const DEFAULT_OUTPUT = path.join('app', 'public', 'proofs', 'proof-feed.json');

function argValue(args: string[], flag: string) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; }
function readJson<T>(filePath: string, fallback: T): T { const p = path.resolve(filePath); return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) as T : fallback; }
function writeJson(filePath: string, value: unknown) { const p = path.resolve(filePath); mkdirSync(path.dirname(p), { recursive: true }); writeFileSync(p, `${JSON.stringify(value, null, 2)}\n`); return p; }
function sig(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'signature' in value) return String((value as { signature?: string }).signature ?? '');
  return null;
}
function stale(status?: string) { return /needs|stale|unsafe/i.test(status ?? ''); }

function main() {
  const args = process.argv.slice(2);
  const manifestPath = argValue(args, '--manifest') ?? DEFAULT_MANIFEST;
  const verifierPath = argValue(args, '--verifier') ?? DEFAULT_VERIFIER;
  const passportPath = argValue(args, '--passport') ?? DEFAULT_PASSPORT;
  const gauntletPath = argValue(args, '--gauntlet') ?? DEFAULT_GAUNTLET;
  const orderbookPath = argValue(args, '--orderbook') ?? DEFAULT_ORDERBOOK;
  const campaignLinksPath = argValue(args, '--links') ?? DEFAULT_CAMPAIGN_LINKS;
  const outputPath = argValue(args, '--output') ?? DEFAULT_OUTPUT;

  const manifest = readJson<Manifest>(manifestPath, {});
  const verifier = readJson<Verifier>(verifierPath, {});
  const passport = readJson<Passport>(passportPath, {});
  const gauntlet = readJson<Gauntlet>(gauntletPath, {});
  const orderbook = readJson<Orderbook>(orderbookPath, {});
  const campaignLinks = readJson<CampaignLinks>(campaignLinksPath, {});

  const tx = manifest.explorerLinks?.transactions ?? {};
  const accounts = manifest.explorerLinks?.accounts ?? {};
  const verification = {
    terminalVerified: verifier.terminalVerified === true,
    visitorVerified: verifier.visitorVerified === true,
    lineageVerified: verifier.lineageVerified === true,
    settlementVerified: verifier.settlementVerified === true,
    nullifierVerified: verifier.nullifierVerified === true,
  };

  const campaignFunded = Boolean(sig(manifest.signatures?.fundGrowthBounty) || manifest.inputs?.amountToFund === '0' || Number(verifier.rewardEscrow?.totalFunded ?? 0) > 0);
  const passportReady = passport.proofStatus === 'ready' && Boolean(passport.passportHash) && Object.values(passport.verifiedFacts ?? {}).every(Boolean);
  const proofBackedCampaign = (orderbook.campaigns ?? []).find((campaign) => campaign.proofBacked === true);
  const orderbookReady = Boolean(proofBackedCampaign && proofBackedCampaign.status !== 'needs_fresh_proof' && proofBackedCampaign.proofLevel === 'counter_attested' && proofBackedCampaign.verification?.terminalVerified === true && proofBackedCampaign.verification?.visitorVerified === true && proofBackedCampaign.verification?.lineageVerified === true && proofBackedCampaign.verification?.settlementVerified === true);
  const proofBackedLink = (campaignLinks.links ?? []).find((link) => link.proofBacked === true);
  const campaignLinksReady = Boolean(proofBackedLink && proofBackedLink.status === 'verified' && (proofBackedLink.proofLevel === 'counter_attested' || proofBackedLink.campaignProofLevel === 'counter_attested') && proofBackedLink.terminalVerified === true && proofBackedLink.visitorVerified === true && proofBackedLink.lineageVerified === true && proofBackedLink.settlementVerified === true);
  const gauntletReady = Boolean(gauntlet.summary?.blocked && gauntlet.summary?.blocked === gauntlet.summary?.totalCases && (gauntlet.summary?.totalCases ?? 0) >= 15);

  const entries = [
    {
      id: 'campaign-funded',
      title: 'Campaign funded',
      kind: 'escrow',
      status: campaignFunded ? 'verified' : 'pending',
      detail: 'Merchant funded the reward vault for counter-attested conversions.',
      signature: sig(manifest.signatures?.fundGrowthBounty),
      explorerLink: tx.fundGrowthBounty,
      object: String(manifest.pdas?.rewardEscrow ?? ''),
      verification,
    },
    {
      id: 'receipt-recorded',
      title: 'Causal Receipt recorded',
      kind: 'receipt',
      status: sig(manifest.signatures?.recordCausalReceipt) ? 'verified' : 'pending',
      detail: 'Counter-attested receipt committed the intent manifest and visit attestation hashes.',
      signature: sig(manifest.signatures?.recordCausalReceipt) ?? manifest.transactions?.recordCausalReceipt,
      explorerLink: tx.recordCausalReceipt,
      object: String(manifest.pdas?.causalReceipt ?? ''),
      objectLink: accounts.causalReceipt,
      verification,
    },
    {
      id: 'settlement-paid',
      title: 'Reward settled',
      kind: 'settlement',
      status: sig(manifest.signatures?.settleReceiptReward) || manifest.transactions?.settleReceiptReward ? 'verified' : 'pending',
      detail: `Settlement amount: ${verifier.receipt?.settledAmount ?? manifest.inputs?.rewardPerVisit ?? 'unknown'} units.`,
      signature: sig(manifest.signatures?.settleReceiptReward) ?? manifest.transactions?.settleReceiptReward,
      explorerLink: tx.settleReceiptReward,
      object: String(manifest.pdas?.settlementRecord ?? ''),
      objectLink: accounts.settlementRecord,
      verification,
    },
    {
      id: 'fraud-gauntlet',
      title: 'Negative-path suite executed',
      kind: 'security',
      status: gauntletReady ? 'verified' : 'attention',
      detail: `${gauntlet.summary?.blocked ?? 0}/${gauntlet.summary?.totalCases ?? 0} invalid flows rejected by the deterministic proof artifact.`,
      object: gauntlet.gauntletHash ?? '',
      verification,
    },
    {
      id: 'merchant-passport',
      title: 'Merchant Proof Passport generated',
      kind: 'passport',
      status: passportReady ? 'verified' : 'pending',
      detail: 'Privacy-preserving proof-of-local-commerce packet generated from receipt and verifier artifacts.',
      object: passport.passportHash ?? '',
      verification,
    },
    {
      id: 'conversion-orderbook',
      title: 'Conversion Orderbook published',
      kind: 'orderbook',
      status: orderbookReady ? 'verified' : 'attention',
      detail: `${orderbook.campaigns?.filter((campaign) => campaign.proofBacked).length ?? 0}/${orderbook.campaigns?.length ?? 0} campaigns are proof-backed.`,
      object: orderbook.orderbookHash ?? '',
      verification,
    },
    {
      id: 'campaign-links',
      title: 'Campaign links generated',
      kind: 'campaign-link',
      status: campaignLinksReady ? 'verified' : 'attention',
      detail: `${campaignLinks.links?.length ?? 0} public campaign links generated for proof-of-conversion routing.`,
      object: campaignLinks.campaignLinksHash ?? '',
      verification,
    },
  ] as const;

  const allEntriesVerified = entries.every((entry) => entry.status === 'verified');
  const proofStatus = stale(manifest.proofStatus)
    ? manifest.proofStatus
    : allEntriesVerified
      ? 'verified'
      : 'needs-final-proof-run';

  const feed = {
    type: 'viral-sync-proof-feed',
    version: '1.0.0',
    network: manifest.cluster ? `solana-${manifest.cluster}` : 'solana-devnet',
    generatedAt: new Date().toISOString(),
    sourceManifest: manifestPath.replace(/\\/g, '/'),
    sourceVerifier: verifierPath.replace(/\\/g, '/'),
    sourcePassport: passportPath.replace(/\\/g, '/'),
    sourceGauntlet: gauntletPath.replace(/\\/g, '/'),
    sourceOrderbook: orderbookPath.replace(/\\/g, '/'),
    sourceCampaignLinks: campaignLinksPath.replace(/\\/g, '/'),
    proofStatus,
    proofLevel: manifest.proofLevel ?? manifest.targetProofLevel ?? 'counter_attested',
    attestationModel: manifest.attestationModel ?? manifest.targetAttestationModel ?? 'merchant_terminal_visitor_signed',
    merchantAlias: 'Thamel Brew House',
    entries,
  };

  const out = writeJson(outputPath, feed);
  console.log(JSON.stringify({ ok: true, outputPath: out, entries: feed.entries.length, proofStatus }, null, 2));
}

main();
