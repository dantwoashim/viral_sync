export const premiumTokens = {
  color: {
    background: '#f7f8f5',
    surface: '#ffffff',
    surfaceRaised: '#fbfbf8',
    ink: '#141514',
    inkSoft: '#3c403d',
    muted: '#69706b',
    line: 'rgba(20, 21, 20, 0.11)',
    proof: '#0b1714',
    proofSoft: '#12241f',
    accent: '#246b58',
    accentStrong: '#14523f',
    success: '#257452',
    warning: '#9a6716',
    danger: '#b13a2f',
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
  },
  shadow: {
    soft: '0 18px 52px rgba(20, 21, 20, 0.08)',
    proof: '0 22px 64px rgba(11, 23, 20, 0.18)',
  },
  type: {
    display: 'clamp(3rem, 7.2vw, 6.6rem)',
    h1: 'clamp(2.7rem, 5.8vw, 5.4rem)',
    h2: 'clamp(2rem, 3.8vw, 3.45rem)',
    h3: 'clamp(1.45rem, 2.4vw, 2rem)',
    body: '1rem',
    small: '0.875rem',
  },
} as const;

export const proofLifecycleSteps = [
  'Bounty funded',
  'Invite shared',
  'Nullifier claimed',
  'Visit attested',
  'Receipt recorded',
  'Reward settled',
  'Replay rejected',
  'SDK verified',
] as const;

export type ProofLifecycleStep = (typeof proofLifecycleSteps)[number];
