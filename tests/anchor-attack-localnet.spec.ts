import { execFileSync } from 'child_process';
import { expect } from 'chai';

describe('localnet Anchor attack tests', () => {
  it('rejects duplicate, wrong-authority, and wrong-beneficiary Causal Commerce attacks on a live validator', function () {
    if (process.env.CI !== 'true' && process.env.RUN_ANCHOR_ATTACK_TESTS !== '1') {
      this.skip();
    }

    this.timeout(1_000_000);
    const output = execFileSync('npm', ['run', 'test:anchor-attacks'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    expect(output).to.include('wrong merchant authority cannot settle receipt');
    expect(output).to.include('wrong beneficiary token account cannot receive settlement');
    expect(output).to.include('duplicate campaign nullifier');
    expect(output).to.include('duplicate receipt settlement');
  });
});
