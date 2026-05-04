import { spawn } from 'child_process';
import { createWriteStream, mkdirSync } from 'fs';

mkdirSync('dist', { recursive: true });

const out = createWriteStream('dist/final-command-transcript.txt', { encoding: 'utf8' });
const child = spawn('npm', ['run', 'frontier:final-core'], {
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});

function sanitize(chunk) {
  return chunk
    .toString('utf8')
    .replace(/Recover the intermediate account's ephemeral keypair file[\s\S]*?Error: \d+ write transactions failed/gi, '[REDACTED_SOLANA_DEPLOY_RECOVERY_BLOCK]')
    .replace(/C:\\Users\\[^\\\s]+\\\.config\\solana\\id\.json/gi, '[REDACTED_SOLANA_WALLET]')
    .replace(/C:\\Users\\[^\\\s]+/gi, '[REDACTED_USER_HOME]')
    .replace(/D:\\[^\s]+/gi, '[REDACTED_LOCAL_PATH]')
    .replace(/[a-z]+ [a-z]+ [a-z]+ [a-z]+ [a-z]+ [a-z]+ [a-z]+ [a-z]+ [a-z]+ [a-z]+ [a-z]+ [a-z]+/gi, '[REDACTED_SEED_PHRASE]')
    .replace(/target[\\/]deploy[\\/]viral_sync-keypair\.json/gi, '[REDACTED_DEPLOY_KEYPAIR_PATH]');
}

child.stdout.on('data', (chunk) => {
  const text = sanitize(chunk);
  process.stdout.write(text);
  out.write(text);
});

child.stderr.on('data', (chunk) => {
  const text = sanitize(chunk);
  process.stderr.write(text);
  out.write(text);
});

child.on('exit', (code) => {
  out.end();
  process.exit(code ?? 1);
});
