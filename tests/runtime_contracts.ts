import { expect } from 'chai';
import {
  RELAYER_ACTIONS,
  REPUTATION_MAX_SCORE,
  RUNTIME_DISABLED_ACTIONS,
  buildOperatorChallengeMessage,
  buildSessionChallengeMessage,
  isRuntimeDisabledAction,
  normalizeReputationScore,
} from '@viral-sync/shared';

describe('runtime shared contracts', () => {
  it('includes the live relayer actions required by the frontend runtime', () => {
    expect(RELAYER_ACTIONS).to.include('session-key-issue');
    expect(RELAYER_ACTIONS).to.include('geo-redeem');
  });

  it('exposes runtime incident-control actions for issuance and redemption', () => {
    expect(RUNTIME_DISABLED_ACTIONS).to.include('session-bootstrap');
    expect(RUNTIME_DISABLED_ACTIONS).to.include('redemption');
    expect(isRuntimeDisabledAction('operator-auth')).to.equal(true);
    expect(isRuntimeDisabledAction('unknown-action')).to.equal(false);
  });

  it('builds session challenges with mint and track binding', () => {
    const message = buildSessionChallengeMessage({
      challengeId: 'challenge-1',
      wallet: 'wallet-1',
      delegate: 'delegate-1',
      generation: 'generation-1',
      mint: 'mint-1',
      merchant: 'merchant-1',
      origin: 'http://localhost:3000',
      expiresAt: Date.UTC(2026, 2, 14, 0, 0, 0),
    });

    expect(message).to.contain('Challenge: challenge-1');
    expect(message).to.contain('Mint: mint-1');
    expect(message).to.contain('Track: v1');
  });

  it('builds merchant operator challenges with wallet and merchant binding', () => {
    const message = buildOperatorChallengeMessage({
      challengeId: 'op-1',
      wallet: 'wallet-1',
      merchant: 'merchant-1',
      origin: 'http://localhost:3000',
      expiresAt: Date.UTC(2026, 2, 14, 0, 0, 0),
    });

    expect(message).to.contain('Viral Sync merchant operator approval');
    expect(message).to.contain('Merchant: merchant-1');
    expect(message).to.contain('Track: v1');
  });

  it('normalizes reputation on the canonical 0-100 scale', () => {
    expect(REPUTATION_MAX_SCORE).to.equal(100);
    expect(normalizeReputationScore(100)).to.equal(100);
    expect(normalizeReputationScore(50)).to.equal(50);
  });
});
