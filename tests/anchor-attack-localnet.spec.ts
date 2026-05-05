import { execSync } from 'child_process';
import { expect } from 'chai';
import { readFileSync } from 'fs';

describe('localnet Anchor attack tests', () => {
  it('rejects the structured Causal Commerce fraud gauntlet on a live validator', function () {
    if (process.env.CI !== 'true' && process.env.RUN_ANCHOR_ATTACK_TESTS !== '1') {
      this.skip();
    }

    this.timeout(1_000_000);

    const output = execSync('npm run test:anchor-attacks', {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    expect(output).to.include('attackEvidence');
    const result = JSON.parse(readFileSync('tmp/anchor-attack-results.json', 'utf8')) as {
      summary: { totalCases: number; blocked: number; failed: number };
      cases: Array<{
        observed: string;
        expectedErrorMatched: boolean;
        accountsMutated: boolean;
        accountsMutationVerified: boolean;
        failureKind: string;
      }>;
    };

    expect(result.summary.totalCases).to.be.greaterThanOrEqual(19);
    expect(result.summary.blocked).to.equal(result.summary.totalCases);
    expect(result.summary.failed).to.equal(0);
    for (const item of result.cases) {
      expect(item.observed).to.equal('rejected');
      expect(item.expectedErrorMatched).to.equal(true);
      expect(item.accountsMutationVerified).to.equal(true);
      expect(item.accountsMutated).to.equal(false);
      expect(['program_rejection', 'intent_validator_rejection']).to.include(item.failureKind);
    }
  });
});
