import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function parseEnv(text) {
  const values = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalsAt = line.indexOf('=');
    if (equalsAt === -1) {
      continue;
    }

    const key = line.slice(0, equalsAt).trim();
    let value = line.slice(equalsAt + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }

  return values;
}

async function readDatabaseUrl() {
  if (process.env.LAUNCH_DATABASE_URL) {
    return process.env.LAUNCH_DATABASE_URL;
  }

  const envPath = path.join(rootDir, '.env.production.local');
  const envText = await fs.readFile(envPath, 'utf8');
  return parseEnv(envText).LAUNCH_DATABASE_URL;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

const databaseUrl = await readDatabaseUrl();
if (!databaseUrl) {
  throw new Error('LAUNCH_DATABASE_URL is required. Set it or create .env.production.local first.');
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: true },
});

try {
  const tables = [
    'merchant_orgs',
    'merchants',
    'campaigns',
    'causal_invites',
    'claims',
    'redemptions',
    'visit_challenges',
    'causal_receipts',
    'merchant_sessions',
    'staff_devices',
    'staff_device_nonces',
    'audit_events',
    'reward_ledger_entries',
    'outbox_jobs',
    'app_events',
    'idempotency_records',
  ];
  const rows = {};
  let rowCount = 0;

  for (const table of tables) {
    const result = await pool.query(`SELECT * FROM ${table} ORDER BY 1`);
    rows[table] = result.rows;
    rowCount += result.rowCount ?? 0;
  }

  const backup = {
    generatedAt: new Date().toISOString(),
    source: 'neon',
    schema: 'normalized_launch_tables',
    tables,
    rows,
  };

  const backupDir = path.join(rootDir, 'backups', 'neon');
  await fs.mkdir(backupDir, { recursive: true });
  const outputPath = path.join(backupDir, `launch-ledger-${timestamp()}.json`);
  await fs.writeFile(outputPath, JSON.stringify(backup, null, 2), 'utf8');

  console.log(JSON.stringify({
    ok: true,
    rows: rowCount,
    outputPath,
  }, null, 2));
} finally {
  await pool.end();
}
