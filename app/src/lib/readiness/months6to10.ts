import { defaultProductLoopCampaign, productLoopCampaigns } from '../product-loop/productLoop';
import type { NormalizedReceiptProof } from '../proof/types';
import { getMerchantValidationState, type MerchantValidationState } from '../traction/merchantValidation';

export type phaseReadiness = {
  phase: 6 | 7 | 8 | 9 | 10;
  title: string;
  status: 'ready' | 'blocked' | 'watch';
  objective: string;
  deliverables: string[];
  evidence: string[];
  blockers: string[];
};

export type WorldClassReadiness = {
  artifactType: 'viral_sync_phase_6_10_readiness';
  generatedFor: 'frontier_submission';
  overallStatus: 'ready_for_judging' | 'proof_ready_business_blocked' | 'blocked';
  score: number;
  phases: phaseReadiness[];
  economics: {
    campaign: string;
    rewardPerVisit: string;
    protocolFee: string;
    rewardPoolRemaining: string;
    settledVisits: number;
    maxRedemptions: number | null;
    grossMarginModel: string;
    tractionCaveat: string;
  };
  security: {
    proofVerified: boolean;
    fraudGauntlet: string;
    mainnetEligible: boolean;
    requiredBeforeMainnet: string[];
  };
  pilotOps: {
    merchantAlias: string;
    requiredEvidenceSlots: string[];
    missingRequiredEvidence: string[];
    nextPilotActions: string[];
  };
  demoNarrative: {
    oneLine: string;
    ninetySecondFlow: string[];
    forbiddenClaims: string[];
  };
  finalGate: {
    submitToJudges: boolean;
    claimLiveTraction: boolean;
    claimProtocolProof: boolean;
    judgeRiskNotes: string[];
  };
};

function status(blockers: string[], watch = false): phaseReadiness['status'] {
  if (blockers.length > 0) return 'blocked';
  return watch ? 'watch' : 'ready';
}

function scorephase(phase: phaseReadiness) {
  if (phase.status === 'ready') return 20;
  if (phase.status === 'watch') return 12;
  return 6;
}

export function getWorldClassReadiness(proof: NormalizedReceiptProof, validation: MerchantValidationState = getMerchantValidationState(proof)): WorldClassReadiness {
  const campaign = defaultProductLoopCampaign();
  const campaigns = productLoopCampaigns();
  const proofVerified = proof.health === 'verified';
  const gauntletSummary = proof.gauntlet.summary;
  const fraudGauntletStrict = typeof gauntletSummary?.blocked === 'number' &&
    gauntletSummary.blocked === gauntletSummary.totalCases &&
    gauntletSummary.missing === 0 &&
    gauntletSummary.failed === 0;
  const requiredEvidenceSlots = validation.evidenceSlots
    .filter((slot) => slot.requiredForClaimingTraction === true)
    .map((slot) => slot.id);
  const missingRequiredEvidence = validation.evidenceSummary.missingRequiredSlots;

  const phase6Blockers = proofVerified ? [] : ['Final receipt proof must be verified before economics can be represented as proof-backed.'];
  const phase7Blockers = proofVerified && fraudGauntletStrict ? [] : ['Fraud gauntlet and verifier must remain strict-green before any mainnet story.'];
  const phase8Blockers = missingRequiredEvidence.length > 0 ? missingRequiredEvidence.map((slot) => `Missing permissioned pilot evidence: ${slot}`) : [];
  const phase9Blockers = proofVerified ? [] : ['Demo narrative cannot lead with verified settlement until proof health is verified.'];
  const phase10Blockers = validation.tractionClaimAllowed ? [] : ['Do not claim live merchant traction; keep the final pitch at technical-proof plus pilot-ready.'];

  const phases: phaseReadiness[] = [
    {
      phase: 6,
      title: 'Outcome Economics',
      status: status(phase6Blockers),
      objective: 'Show the business model with reward split, protocol fee, bounded liability, and a non-inflated ROI story.',
      deliverables: ['Reward-per-visit economics', 'Protocol fee visibility', 'Liability cap from max redemptions', 'Traction caveat tied to validation evidence'],
      evidence: [campaign?.rewardLabel ?? 'Pending reward', campaign?.protocolFeeLabel ?? 'Pending protocol fee', `${campaign?.maxRedemptions ?? 'unknown'} max redemptions`],
      blockers: phase6Blockers,
    },
    {
      phase: 7,
      title: 'Security And Mainnet Gate',
      status: status(phase7Blockers),
      objective: 'Make mainnet readiness conditional on proof health, fraud gauntlet strictness, capped beta controls, and external review.',
      deliverables: ['Mainnet eligibility gate', 'Fraud-gauntlet dependency', 'Required-before-mainnet checklist', 'No fake production claim'],
      evidence: [proof.statusLabel, `${gauntletSummary?.blocked ?? 0}/${gauntletSummary?.totalCases ?? 0} fraud checks`, proof.readiness.hashesVerified ? 'hashes verified' : 'hash review'],
      blockers: phase7Blockers,
    },
    {
      phase: 8,
      title: 'Pilot Operations',
      status: status(phase8Blockers),
      objective: 'Convert the empty merchant-validation kit into a disciplined pilot checklist instead of pretending traction exists.',
      deliverables: ['Required evidence slots', 'Interview script', 'Permissioned merchant proof rules', 'Next pilot actions'],
      evidence: [`${validation.evidenceSummary.requiredVerifiedSlots}/${validation.evidenceSummary.requiredSlots} required evidence verified`, validation.safeSubmissionWording],
      blockers: phase8Blockers,
    },
    {
      phase: 9,
      title: 'Judge Demo Narrative',
      status: status(phase9Blockers),
      objective: 'Compress the demo into one sentence, one receipt, one proof center, and one honest limitation.',
      deliverables: ['One-line pitch', '90-second demo flow', 'Forbidden-claims guardrail', 'Receipt-first demo order'],
      evidence: ['Money only moves after co-signed conversion settlement.', '/receipt/latest', '/proof#validation'],
      blockers: phase9Blockers,
    },
    {
      phase: 10,
      title: 'Final A+ Gate',
      status: status(phase10Blockers, proofVerified && !validation.tractionClaimAllowed),
      objective: 'Decide exactly what the submission can claim: protocol proof now, live traction only after evidence.',
      deliverables: ['Final claim boundary', 'Judge risk notes', 'Submission go/no-go', 'Agent-readable readiness API'],
      evidence: [validation.tractionClaimAllowed ? 'traction claim allowed' : 'traction not claimed', proofVerified ? 'protocol proof claim allowed' : 'protocol proof blocked'],
      blockers: phase10Blockers,
    },
  ];

  const score = phases.reduce((total, item) => total + scorephase(item), 0);
  const submitToJudges = proofVerified && phases[0].status !== 'blocked' && phases[1].status !== 'blocked' && phases[3].status !== 'blocked';
  const claimLiveTraction = validation.tractionClaimAllowed;
  const overallStatus = !proofVerified
    ? 'blocked'
    : claimLiveTraction
      ? 'ready_for_judging'
      : 'proof_ready_business_blocked';

  return {
    artifactType: 'viral_sync_phase_6_10_readiness',
    generatedFor: 'frontier_submission',
    overallStatus,
    score,
    phases,
    economics: {
      campaign: campaign?.title ?? 'Proof-backed campaign',
      rewardPerVisit: campaign?.rewardLabel ?? proof.rewardAmountLabel,
      protocolFee: campaign?.protocolFeeLabel ?? 'Pending',
      rewardPoolRemaining: campaign?.rewardPoolRemainingLabel ?? 'Pending',
      settledVisits: campaign?.settledCount ?? 0,
      maxRedemptions: campaign?.maxRedemptions ?? null,
      grossMarginModel: 'Protocol revenue is the settlement fee; merchant ROI must be measured from verified visits, not clicks.',
      tractionCaveat: validation.safeSubmissionWording,
    },
    security: {
      proofVerified,
      fraudGauntlet: `${gauntletSummary?.blocked ?? 0}/${gauntletSummary?.totalCases ?? 0}`,
      mainnetEligible: false,
      requiredBeforeMainnet: [
        'External security review or audit memo',
        'Capped beta limits and pause switch',
        'Upgrade authority governance plan',
        'Permissioned pilot evidence',
        'Production replay persistence and monitoring',
      ],
    },
    pilotOps: {
      merchantAlias: validation.merchantAlias,
      requiredEvidenceSlots,
      missingRequiredEvidence,
      nextPilotActions: validation.nextActions.length > 0
        ? validation.nextActions
        : ['Run two more verified merchant demos and attach permissioned evidence.'],
    },
    demoNarrative: {
      oneLine: 'Money only moves when a conversion is co-signed and settled on Solana.',
      ninetySecondFlow: [
        'Open with the merchant escrow and payout rule.',
        'Show the customer claim pass and terminal confirmation.',
        'Open the verified receipt as the iconic product object.',
        'Show the fraud gauntlet and verifier checks.',
        'End by saying technical proof is verified and live merchant traction is not claimed until evidence is attached.',
      ],
      forbiddenClaims: [
        'Do not claim live merchant traction without verified evidence slots.',
        'Do not call the POC oracle-grade physical truth.',
        'Do not imply uncapped mainnet readiness.',
      ],
    },
    finalGate: {
      submitToJudges,
      claimLiveTraction,
      claimProtocolProof: proofVerified,
      judgeRiskNotes: [
        ...phase8Blockers,
        ...phase10Blockers,
        campaigns.some((item) => !item.proofBacked) ? 'Some orderbook lanes are vision-only and must stay labeled that way.' : '',
      ].filter(Boolean),
    },
  };
}
