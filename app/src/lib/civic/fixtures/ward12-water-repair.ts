import type { CivicOutcome, CivicSignal, CivicSponsorPool } from '../types';

export const WARD_12_MARKET_SLUG = 'ward12-water-repair';

export const ward12Signals: CivicSignal[] = [
  {
    id: 'repair-window',
    label: 'Expected repair window',
    value: '14 days',
    direction: 'lower',
    source: 'Fixture modeled from civic issue intake',
  },
  {
    id: 'resident-reports',
    label: 'Resident reports',
    value: '43',
    direction: 'higher',
    source: 'Demo civic dataset, not a public authority data source',
  },
  {
    id: 'verification-depth',
    label: 'Verification depth',
    value: 'counter-attested',
    direction: 'stable',
    source: 'Solana devnet receipt artifact',
  },
];

export const ward12Outcomes: CivicOutcome[] = [
  {
    id: 'crew-dispatched',
    label: 'Repair crew dispatched',
    target: 'within 7 days',
    current: 'pending external oracle',
    resolutionRule: 'A staff counter-attestation plus permitted civic data source must confirm dispatch.',
    verificationStatus: 'phase_one_specified',
  },
  {
    id: 'households-restored',
    label: 'Households restored',
    target: '80%+ restored',
    current: 'not independently measured',
    resolutionRule: 'Requires a permissioned field verifier or trusted data feed before production use.',
    verificationStatus: 'not_integrated',
  },
  {
    id: 'verified-action',
    label: 'Verified civic action receipt',
    target: '1 receipt settled',
    current: 'devnet receipt available',
    resolutionRule: 'Solana receipt must include valid authority, terminal, participant, nullifier, and settlement records.',
    verificationStatus: 'verified_devnet',
  },
];

export const ward12SponsorPool: CivicSponsorPool = {
  sponsorLabel: 'Demo public-good sponsor',
  assetLabel: 'devnet reward units',
  availableLabel: 'Source proof vault balance',
  actionRewardLabel: 'Counter-attested civic action',
  releaseRule: 'Release only after a valid civic action receipt path exists.',
  custodyStatus: 'verified_devnet',
};
