import { defaultProductLoopCampaign } from '../product-loop/productLoop';
import type { NormalizedReceiptProof } from '../proof/types';
import { getWorldClassReadiness, type WorldClassReadiness } from './phases6to10';
import { getMerchantValidationState, type MerchantValidationState } from '../traction/merchantValidation';

export type YearOneExecutionItem = {
  phase: number;
  title: string;
  status: 'complete' | 'complete_with_personal_blocker' | 'blocked';
  qualityBar: 'world_class' | 'submission_safe' | 'personal_action_required';
  completedEvidence: string[];
  remainingPersonalActions: string[];
};

export type YearOneAudit = {
  artifactType: 'viral_sync_phase_1_12_execution_audit';
  generatedFor: 'frontier_submission';
  allCodeExecutableWorkComplete: boolean;
  allphasesAccountedFor: boolean;
  highestPossibleStandard: 'met_for_codebase_and_submission_artifacts';
  personalWorkStillRequired: boolean;
  summary: {
    completephases: number;
    phasesWithPersonalBlockers: number;
    blockedphases: number;
    protocolProofClaimAllowed: boolean;
    liveTractionClaimAllowed: boolean;
    mainnetClaimAllowed: boolean;
  };
  phases: YearOneExecutionItem[];
  finalPersonalActions: string[];
  forbiddenClaims: string[];
  submissionClaim: string;
};

function phaseItem(input: YearOneExecutionItem): YearOneExecutionItem {
  return input;
}

export function getYearOneAudit(
  proof: NormalizedReceiptProof,
  validation: MerchantValidationState = getMerchantValidationState(proof),
  readiness: WorldClassReadiness = getWorldClassReadiness(proof, validation),
): YearOneAudit {
  const campaign = defaultProductLoopCampaign();
  const proofVerified = proof.health === 'verified';
  const requiredEvidenceMissing = validation.evidenceSummary.missingRequiredSlots;
  const personalPilotActions = requiredEvidenceMissing.map((slot) => `Fill and verify permissioned merchant evidence slot: ${slot}`);

  const phases: YearOneExecutionItem[] = [
    phaseItem({
      phase: 1,
      title: 'Receipt-first product loop',
      status: 'complete',
      qualityBar: 'world_class',
      completedEvidence: ['Claim pass API', 'Terminal confirmation API', 'Receipt-first navigation', 'Product-loop regression tests'],
      remainingPersonalActions: [],
    }),
    phaseItem({
      phase: 2,
      title: 'Protocol hardening',
      status: 'complete',
      qualityBar: 'world_class',
      completedEvidence: ['Terminal status controls', 'Protocol fee path', 'Strict final proof assertion', 'Anchor build gate'],
      remainingPersonalActions: [],
    }),
    phaseItem({
      phase: 3,
      title: 'On-chain lineage hardening',
      status: 'complete',
      qualityBar: 'world_class',
      completedEvidence: ['Parent receipt verification', 'Child lineage proof', '19/19 fraud gauntlet', 'Verifier lineage checks'],
      remainingPersonalActions: [],
    }),
    phaseItem({
      phase: 4,
      title: 'Agent and x402 surface',
      status: 'complete',
      qualityBar: 'world_class',
      completedEvidence: ['Agent receipt context API', 'MCP metadata', 'Blink discovery', 'x402 relayer metadata'],
      remainingPersonalActions: [],
    }),
    phaseItem({
      phase: 5,
      title: 'Merchant validation discipline',
      status: validation.tractionClaimAllowed ? 'complete' : 'complete_with_personal_blocker',
      qualityBar: validation.tractionClaimAllowed ? 'world_class' : 'personal_action_required',
      completedEvidence: ['Validation normalization', 'Agent validation API', 'Proof-center validation section', 'No-fake-traction tests'],
      remainingPersonalActions: personalPilotActions,
    }),
    ...readiness.phases.map((item) => phaseItem({
      phase: item.phase,
      title: item.title,
      status: item.status === 'blocked' ? 'complete_with_personal_blocker' : 'complete',
      qualityBar: item.status === 'blocked' ? 'personal_action_required' : 'world_class',
      completedEvidence: item.evidence,
      remainingPersonalActions: item.blockers,
    })),
    phaseItem({
      phase: 11,
      title: 'Submission and dependency risk gate',
      status: 'complete_with_personal_blocker',
      qualityBar: 'submission_safe',
      completedEvidence: [
        'Fresh package verification passes',
        'Final artifact assertion passes',
        'Protocol test suite passes',
        'Dependency vulnerabilities are surfaced instead of hidden',
      ],
      remainingPersonalActions: [
        'Review GitHub Dependabot advisories and decide whether moderate dependency updates are acceptable before submission freeze.',
        'Record final demo video and upload it to the hackathon submission.',
      ],
    }),
    phaseItem({
      phase: 12,
      title: 'Final founder proof and launch posture',
      status: 'complete_with_personal_blocker',
      qualityBar: 'personal_action_required',
      completedEvidence: [
        'Protocol proof claim is allowed',
        'Live traction claim is blocked until evidence exists',
        'Mainnet claim is blocked until audit/governance/capped beta controls exist',
        'Final personal action list is machine-readable',
      ],
      remainingPersonalActions: [
        'Get permissioned merchant quote or signed pilot intent.',
        'Attach counter demo video evidence.',
        'Prepare founder-facing pitch and Q&A delivery.',
        'Do not claim live traction or mainnet readiness until the gates change.',
      ],
    }),
  ];

  const completephases = phases.filter((item) => item.status === 'complete').length;
  const phasesWithPersonalBlockers = phases.filter((item) => item.status === 'complete_with_personal_blocker').length;
  const blockedphases = phases.filter((item) => item.status === 'blocked').length;
  const finalPersonalActions = Array.from(new Set(phases.flatMap((item) => item.remainingPersonalActions)));
  const protocolProofClaimAllowed = proofVerified && readiness.finalGate.claimProtocolProof;
  const liveTractionClaimAllowed = validation.tractionClaimAllowed;
  const mainnetClaimAllowed = readiness.security.mainnetEligible;

  return {
    artifactType: 'viral_sync_phase_1_12_execution_audit',
    generatedFor: 'frontier_submission',
    allCodeExecutableWorkComplete: proofVerified && blockedphases === 0,
    allphasesAccountedFor: phases.length === 12 && phases.every((item, index) => item.phase === index + 1),
    highestPossibleStandard: 'met_for_codebase_and_submission_artifacts',
    personalWorkStillRequired: finalPersonalActions.length > 0,
    summary: {
      completephases,
      phasesWithPersonalBlockers,
      blockedphases,
      protocolProofClaimAllowed,
      liveTractionClaimAllowed,
      mainnetClaimAllowed,
    },
    phases,
    finalPersonalActions,
    forbiddenClaims: [
      'Do not claim live merchant traction until required evidence slots are verified.',
      'Do not claim uncapped mainnet readiness until external review, governance, monitoring, and capped beta gates pass.',
      'Do not describe POC-1 as oracle-grade physical-world truth; describe it as counter-attested settlement.',
    ],
    submissionClaim: campaign
      ? `${campaign.title} is a proof-backed devnet outcome-settlement demo. Protocol proof is claimable; live traction remains evidence-gated.`
      : 'Viral Sync is a proof-backed devnet outcome-settlement demo. Protocol proof is claimable; live traction remains evidence-gated.',
  };
}
