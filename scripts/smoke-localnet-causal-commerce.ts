import { spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import path from 'path';

type Step = {
  name: string;
  command: string;
  args: string[];
};

const manifestPath = path.join('tmp', 'localnet-causal-commerce.json');
const verifierPath = path.join('tmp', 'localnet-causal-commerce-verifier.json');

function runStep(step: Step) {
  return new Promise<void>((resolve, reject) => {
    const command = process.platform === 'win32' ? 'cmd.exe' : step.command;
    const args = process.platform === 'win32' ? ['/d', '/s', '/c', step.command, ...step.args] : step.args;
    const child = spawn(command, args, {
      cwd: process.cwd(),
      shell: false,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${step.name} failed with exit code ${code ?? 'unknown'}`));
      }
    });
  });
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

async function main() {
  mkdirSync('tmp', { recursive: true });

  const steps: Step[] = [
    {
      name: 'localnet causal commerce runner',
      command: 'npm',
      args: ['run', 'localnet:causal-commerce', '--', '--replay-check', '--close-check', '--output', manifestPath],
    },
    {
      name: 'localnet receipt verifier',
      command: 'npm',
      args: ['run', 'localnet:verify-receipt', '--', '--manifest', manifestPath, '--output', verifierPath],
    },
  ];

  for (const step of steps) {
    await runStep(step);
  }

  if (!existsSync(manifestPath) || !existsSync(verifierPath)) {
    throw new Error('Smoke run did not produce the expected manifest and verifier output files.');
  }

  const manifest = readJson<{
    pdas: { causalReceipt: string; growthCampaign: string; rewardEscrow: string; settlementRecord: string };
    signatures: { recordCausalReceipt: string; settleReceiptReward: string; closeGrowthBounty: string | null };
    replayChecks: Array<{ rejected: boolean }>;
    tokenBalances: { afterClose?: { rewardVault?: string } | null };
  }>(manifestPath);
  const verifier = readJson<{ ok: boolean; failures: string[] }>(verifierPath);

  if (!verifier.ok || verifier.failures.length > 0) {
    throw new Error(`Verifier failed: ${verifier.failures.join('; ')}`);
  }
  if (!manifest.replayChecks.every((check) => check.rejected)) {
    throw new Error('Replay checks did not all reject as expected.');
  }
  if (!manifest.signatures.closeGrowthBounty || manifest.tokenBalances.afterClose?.rewardVault !== 'closed') {
    throw new Error('Close check did not close the reward vault as expected.');
  }

  console.log(JSON.stringify({
    ok: true,
    manifestPath,
    verifierPath,
    receipt: manifest.pdas.causalReceipt,
    campaign: manifest.pdas.growthCampaign,
    rewardEscrow: manifest.pdas.rewardEscrow,
    settlementRecord: manifest.pdas.settlementRecord,
    recordReceiptSignature: manifest.signatures.recordCausalReceipt,
    settleReceiptSignature: manifest.signatures.settleReceiptReward,
    closeGrowthBountySignature: manifest.signatures.closeGrowthBounty,
    rewardVaultAfterClose: manifest.tokenBalances.afterClose.rewardVault,
  }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
