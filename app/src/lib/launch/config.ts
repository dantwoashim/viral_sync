import type { ConnectionOptions } from 'tls';

type DatabaseSslMode = 'disable' | 'require' | 'verify-ca';

export interface LaunchEnvIssue {
  level: 'error' | 'warning';
  message: string;
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_SMOKE_TEST_MODE = process.env.VIRAL_SYNC_SMOKE_TEST_MODE === 'true';

function normalizePem(value?: string) {
  const normalized = value?.replace(/\\n/g, '\n').trim();
  return normalized || undefined;
}

function resolveDatabaseSslMode(): DatabaseSslMode {
  const explicitMode = process.env.VIRAL_SYNC_DATABASE_SSL_MODE?.trim().toLowerCase();
  if (!explicitMode) {
    return process.env.VIRAL_SYNC_DATABASE_SSL === 'true' ? 'require' : 'disable';
  }

  if (explicitMode === 'disable' || explicitMode === 'require' || explicitMode === 'verify-ca') {
    return explicitMode;
  }

  throw new Error('VIRAL_SYNC_DATABASE_SSL_MODE must be one of disable, require, or verify-ca.');
}

export function isProductionRuntime() {
  return IS_PRODUCTION;
}

export function isSmokeTestMode() {
  return IS_SMOKE_TEST_MODE;
}

export function getLaunchEnvIssues(): LaunchEnvIssue[] {
  const issues: LaunchEnvIssue[] = [];
  const databaseUrl = process.env.VIRAL_SYNC_DATABASE_URL;
  const consumerSecret = process.env.VIRAL_SYNC_CONSUMER_SESSION_SECRET;
  const merchantSecret = process.env.VIRAL_SYNC_MERCHANT_SESSION_SECRET;
  const ca = normalizePem(process.env.VIRAL_SYNC_DATABASE_SSL_CA);
  const cert = normalizePem(process.env.VIRAL_SYNC_DATABASE_SSL_CERT);
  const key = normalizePem(process.env.VIRAL_SYNC_DATABASE_SSL_KEY);

  let sslMode: DatabaseSslMode = 'disable';
  try {
    sslMode = resolveDatabaseSslMode();
  } catch (error) {
    issues.push({
      level: 'error',
      message: error instanceof Error ? error.message : 'Invalid database SSL configuration.',
    });
  }

  if (IS_PRODUCTION && !IS_SMOKE_TEST_MODE && !databaseUrl) {
    issues.push({
      level: 'error',
      message: 'VIRAL_SYNC_DATABASE_URL is required for production launch environments.',
    });
  }

  if (IS_PRODUCTION && !consumerSecret) {
    issues.push({
      level: 'error',
      message: 'VIRAL_SYNC_CONSUMER_SESSION_SECRET is required in production.',
    });
  }

  if (IS_PRODUCTION && !merchantSecret) {
    issues.push({
      level: 'error',
      message: 'VIRAL_SYNC_MERCHANT_SESSION_SECRET is required in production.',
    });
  }

  if (databaseUrl && sslMode === 'verify-ca' && !ca) {
    issues.push({
      level: 'error',
      message: 'VIRAL_SYNC_DATABASE_SSL_CA is required when VIRAL_SYNC_DATABASE_SSL_MODE=verify-ca.',
    });
  }

  if ((cert && !key) || (!cert && key)) {
    issues.push({
      level: 'error',
      message: 'VIRAL_SYNC_DATABASE_SSL_CERT and VIRAL_SYNC_DATABASE_SSL_KEY must be provided together.',
    });
  }

  if (databaseUrl && !IS_PRODUCTION && sslMode === 'disable') {
    issues.push({
      level: 'warning',
      message: 'Database SSL is disabled for the launch runtime. This is fine for local development only.',
    });
  }

  return issues;
}

export function getLaunchEnvErrors() {
  return getLaunchEnvIssues().filter((issue) => issue.level === 'error');
}

export function getDatabaseSslConfig(): ConnectionOptions | undefined {
  const mode = resolveDatabaseSslMode();
  if (mode === 'disable') {
    return undefined;
  }

  const ca = normalizePem(process.env.VIRAL_SYNC_DATABASE_SSL_CA);
  const cert = normalizePem(process.env.VIRAL_SYNC_DATABASE_SSL_CERT);
  const key = normalizePem(process.env.VIRAL_SYNC_DATABASE_SSL_KEY);

  if (mode === 'verify-ca' && !ca) {
    throw new Error('VIRAL_SYNC_DATABASE_SSL_CA is required when VIRAL_SYNC_DATABASE_SSL_MODE=verify-ca.');
  }

  return {
    rejectUnauthorized: true,
    ...(ca ? { ca } : {}),
    ...(cert ? { cert } : {}),
    ...(key ? { key } : {}),
  };
}
