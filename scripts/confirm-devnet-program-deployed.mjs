import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';

const anchorToml = readFileSync('Anchor.toml', 'utf8');
const match = anchorToml.match(/viral_sync\s*=\s*"([^"]+)"/);

if (!match) {
  console.error('Anchor.toml viral_sync program ID missing.');
  process.exit(1);
}

const programId = match[1];

try {
  execFileSync('solana', ['program', 'show', programId, '--url', 'devnet'], {
    stdio: 'inherit',
  });
  console.log(
    JSON.stringify(
      {
        ok: true,
        programId,
        cluster: 'devnet',
        deployFallback:
          'anchor deploy failed, but solana program show confirmed the configured program is deployed',
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        programId,
        cluster: 'devnet',
        reason:
          'anchor deploy failed and the configured program could not be confirmed on devnet',
      },
      null,
      2,
    ),
  );
  process.exit(1);
}
