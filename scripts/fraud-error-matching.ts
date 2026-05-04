export function normalizeErrorText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9: _-]/g, ' ');
}

export function expectedErrorMatched(actualError: string, expectedPatterns: string[]): boolean {
  const text = normalizeErrorText(actualError);
  return expectedPatterns.some((pattern) => {
    const raw = normalizeErrorText(pattern);
    const short = normalizeErrorText(pattern.split('::').pop() ?? pattern);
    return text.includes(raw) || text.includes(short);
  });
}

export function expectedPatternsFor(errorCode: string): string[] {
  const short = errorCode.split('::').pop() ?? errorCode;
  const aliases: Record<string, string[]> = {
    AccountAlreadyInitialized: ['account already initialized', 'already initialized', 'already in use'],
    AccountNotInitialized: ['account not initialized', 'not initialized'],
    ConstraintSeeds: ['constraintseeds', 'seeds constraint', 'a seeds constraint was violated'],
    MissingRequiredSignature: ['missing required signature', 'signature verification failed'],
    ConstraintTokenOwner: ['constrainttokenowner', 'token owner constraint'],
    InvalidRewardMint: ['invalid reward mint'],
    InvalidTerminalAuthority: ['invalid terminal authority'],
    InvalidTerminalDevice: ['invalid terminal device'],
    InvalidVisitorAuthority: ['invalid visitor authority'],
    InvalidClaimPass: ['invalid claim pass'],
    ClaimPassAlreadyRecorded: ['claim pass already recorded', 'already recorded'],
    MaxDepthExceeded: ['max depth exceeded', 'depth exceeds'],
    CampaignInactive: ['campaign inactive', 'paused', 'expired campaign'],
    InvalidState: ['invalidstate', 'invalid state'],
    RewardAmountExceedsManifest: ['reward amount exceeds manifest', 'exceeds manifest'],
    IntentValidatorRejected: ['intent validator rejected', 'not allowed by manifest', 'does not match manifest', 'exceeds manifest'],
  };

  return [
    errorCode,
    short,
    short.replace(/([a-z0-9])([A-Z])/g, '$1 $2'),
    `error code: ${short}`,
    `error number: ${short}`,
    ...(aliases[short] ?? []),
  ];
}
