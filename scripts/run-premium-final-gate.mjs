import { spawnSync } from 'node:child_process';

const npmExecPath = process.env.npm_execpath;
const command = npmExecPath ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
const screenshotDir = 'tmp/premium-week-39-52-screenshots';
const manifestPath = `${screenshotDir}/manifest.json`;

function run(label, args, env = {}) {
  console.log(`\n[premium:final] ${label}`);
  const result = spawnSync(command, npmExecPath ? [npmExecPath, ...args] : args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('Copy gate', ['run', 'premium:copy']);
run('Accessibility gate', ['run', 'premium:a11y']);
run('Performance gate', ['run', 'premium:performance']);
run('Final screenshot capture', ['run', 'premium:screenshots'], {
  PREMIUM_VIEWPORT_SET: 'final',
  PREMIUM_SCREENSHOT_DIR: screenshotDir,
});
run('Final visual gate', ['run', 'premium:visual-gate', '--', manifestPath, '--require-final-viewports']);
run('Release candidate packet', ['run', 'premium:release-candidate']);

console.log('\n[premium:final] PASS');
