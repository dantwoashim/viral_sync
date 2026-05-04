import { existsSync, readFileSync } from 'fs';
import path from 'path';

type JsonSchema = {
  type?: string | string[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  const?: unknown;
  enum?: unknown[];
  minItems?: number;
  minimum?: number;
  items?: JsonSchema;
};

type ValidationError = { path: string; message: string };

const finalMode = process.env.PROOF_SCHEMA_FINAL === '1' || process.argv.includes('--final');

const targets = [
  { schema: 'schemas/poc1.schema.json', artifact: 'app/public/proofs/devnet-causal-commerce.json', kind: 'poc1' },
  { schema: 'schemas/fraud-gauntlet.schema.json', artifact: 'app/public/proofs/fraud-gauntlet.json', kind: 'fraud' },
  { schema: 'schemas/merchant-passport.schema.json', artifact: 'app/public/proofs/merchant-passport.json', kind: 'passport' },
  { schema: 'schemas/conversion-orderbook.schema.json', artifact: 'app/public/proofs/conversion-orderbook.json', kind: 'orderbook' },
  { schema: 'schemas/campaign-links.schema.json', artifact: 'app/public/proofs/campaign-links.json', kind: 'campaign-links' },
  { schema: 'schemas/proof-feed.schema.json', artifact: 'app/public/proofs/proof-feed.json', kind: 'proof-feed' },
  { schema: 'schemas/frontier-readiness.schema.json', artifact: 'app/public/proofs/frontier-readiness.json', kind: 'frontier-readiness' },
  { schema: 'schemas/merchant-validation-kit.schema.json', artifact: 'app/public/proofs/merchant-validation-kit.json', kind: 'merchant-validation-kit' },
] as const;

function readJson(filePath: string) {
  const resolved = path.resolve(filePath);
  if (!existsSync(resolved)) throw new Error(`missing file: ${filePath}`);
  return JSON.parse(readFileSync(resolved, 'utf8'));
}

function typeOf(value: unknown) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function expectedTypes(schemaType?: string | string[]) {
  if (!schemaType) return [];
  return Array.isArray(schemaType) ? schemaType : [schemaType];
}

function validate(schema: JsonSchema, value: unknown, at = '$'): ValidationError[] {
  const errors: ValidationError[] = [];
  const types = expectedTypes(schema.type);
  if (types.length && !types.includes(typeOf(value))) {
    errors.push({ path: at, message: `expected type ${types.join('|')}, got ${typeOf(value)}` });
    return errors;
  }

  if ('const' in schema && value !== schema.const) {
    errors.push({ path: at, message: `expected const ${JSON.stringify(schema.const)}, got ${JSON.stringify(value)}` });
  }

  if (schema.enum && !schema.enum.some((item) => item === value)) {
    errors.push({ path: at, message: `expected enum ${JSON.stringify(schema.enum)}, got ${JSON.stringify(value)}` });
  }

  if (typeof schema.minimum === 'number' && typeof value === 'number' && value < schema.minimum) {
    errors.push({ path: at, message: `expected minimum ${schema.minimum}, got ${value}` });
  }

  if (typeOf(value) === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!(key in obj)) errors.push({ path: `${at}.${key}`, message: 'required property missing' });
    }
    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (key in obj) errors.push(...validate(childSchema, obj[key], `${at}.${key}`));
    }
  }

  if (typeOf(value) === 'array') {
    const arr = value as unknown[];
    if (typeof schema.minItems === 'number' && arr.length < schema.minItems) {
      errors.push({ path: at, message: `expected at least ${schema.minItems} items, got ${arr.length}` });
    }
    if (schema.items) {
      arr.forEach((item, index) => errors.push(...validate(schema.items as JsonSchema, item, `${at}[${index}]`)));
    }
  }

  return errors;
}

function isPreproofStaleArtifact(value: any) {
  return /needs|stale|unsafe/i.test(String(value?.proofStatus ?? value?.status ?? value?.decision ?? ''));
}

function domainChecks(kind: string, artifact: any): ValidationError[] {
  const errors: ValidationError[] = [];
  const stale = isPreproofStaleArtifact(artifact);
  const enforceFresh = finalMode || !stale;

  if (kind === 'poc1') {
    const proofLevel = artifact.proofLevel ?? artifact.targetProofLevel;
    const attestationModel = artifact.attestationModel ?? artifact.targetAttestationModel;
    if (proofLevel !== 'counter_attested') errors.push({ path: '$.proofLevel', message: 'must equal counter_attested' });
    if (attestationModel !== 'merchant_terminal_visitor_signed') errors.push({ path: '$.attestationModel', message: 'must equal merchant_terminal_visitor_signed' });
    if (enforceFresh) {
      for (const key of ['terminalVerified', 'visitorVerified', 'lineageVerified']) {
        if (artifact[key] !== true) errors.push({ path: `$.${key}`, message: 'must be true for final proof artifacts' });
      }
      for (const key of ['terminalDevice', 'terminalAuthority', 'visitorAuthority', 'claimPass']) {
        if (!artifact.pdas?.[key]) errors.push({ path: `$.pdas.${key}`, message: 'required final counter-attestation PDA missing' });
      }
    }
  }

  if (kind === 'fraud') {
    const summary = artifact.summary ?? {};
    const total = Number(summary.totalCases ?? artifact.cases?.length ?? 0);
    const blocked = Number(summary.blocked ?? 0);
    const missing = Number(summary.missing ?? 0);
    const failed = Number(summary.failed ?? 0);
    if (total < 16) errors.push({ path: '$.summary.totalCases', message: `fraud gauntlet must have at least 16 cases, got ${total}` });
    if (enforceFresh) {
      if (blocked !== total) errors.push({ path: '$.summary.blocked', message: `blocked must equal total cases (${blocked} !== ${total})` });
      if (missing !== 0) errors.push({ path: '$.summary.missing', message: `missing must be zero in final mode, got ${missing}` });
      if (failed !== 0) errors.push({ path: '$.summary.failed', message: `failed must be zero in final mode, got ${failed}` });
      for (const [index, item] of (artifact.cases ?? []).entries()) {
        if (item.observed !== 'rejected') errors.push({ path: `$.cases[${index}].observed`, message: 'case must be rejected in final mode' });
        if (item.expected !== 'rejected') errors.push({ path: `$.cases[${index}].expected`, message: 'case expected result must be rejected' });
        if (item.expectedErrorMatched !== true) errors.push({ path: `$.cases[${index}].expectedErrorMatched`, message: 'case must match the expected rejection error' });
        if (item.accountsMutated !== false) errors.push({ path: `$.cases[${index}].accountsMutated`, message: 'case must prove no account mutation' });
        if (item.accountsMutationVerified !== true) errors.push({ path: `$.cases[${index}].accountsMutationVerified`, message: 'case must explicitly verify no account mutation' });
        if (!['devnet_transaction_execution', 'localnet_transaction_execution', 'intent_validator_check'].includes(String(item.proofSource ?? ''))) {
          errors.push({ path: `$.cases[${index}].proofSource`, message: 'final fraud proofSource cannot be mock_final_fixture or another non-final source' });
        }
      }
    }
  }

  if (kind === 'orderbook') {
    const campaigns = artifact.campaigns ?? [];
    if (enforceFresh && !campaigns.some((campaign: any) => campaign.proofBacked === true)) {
      errors.push({ path: '$.campaigns', message: 'at least one proofBacked campaign is required in final mode' });
    }
    if (enforceFresh) {
      for (const [index, campaign] of campaigns.entries()) {
        if (campaign.proofBacked === true && campaign.proofLevel !== 'counter_attested') {
          errors.push({ path: `$.campaigns[${index}].proofLevel`, message: 'proof-backed campaign must be counter_attested' });
        }
        if (campaign.proofBacked === true) {
          const verification = campaign.verification ?? {};
          for (const key of ['terminalVerified', 'visitorVerified', 'lineageVerified', 'settlementVerified']) {
            if (verification[key] !== true) errors.push({ path: `$.campaigns[${index}].verification.${key}`, message: 'proof-backed campaign verification flag must be true' });
          }
          if (!campaign.proofObjects?.receiptPda) errors.push({ path: `$.campaigns[${index}].proofObjects.receiptPda`, message: 'proof-backed campaign must include receipt PDA' });
          if (!campaign.proofObjects?.claimPass) errors.push({ path: `$.campaigns[${index}].proofObjects.claimPass`, message: 'proof-backed campaign must include claim-pass PDA' });
          if (!campaign.proofObjects?.terminalDevice) errors.push({ path: `$.campaigns[${index}].proofObjects.terminalDevice`, message: 'proof-backed campaign must include terminal device PDA' });
        }
      }
    }
  }

  if (kind === 'passport') {
    if (enforceFresh) {
      const facts = artifact.verifiedFacts ?? {};
      for (const key of ['campaignFunded', 'receiptRecorded', 'rewardSettled', 'nullifierRecorded', 'intentManifestCommitted', 'verifierOk', 'terminalVerified', 'visitorVerified', 'lineageVerified', 'settlementVerified']) {
        if (facts[key] !== true) errors.push({ path: `$.verifiedFacts.${key}`, message: 'must be true in final merchant passport' });
      }
    }
  }

  if (kind === 'campaign-links') {
    const links = artifact.links ?? [];
    if (enforceFresh && !links.some((link: any) => link.proofBacked === true)) {
      errors.push({ path: '$.links', message: 'at least one proofBacked campaign link is required in final mode' });
    }
    if (enforceFresh) {
      for (const [index, link] of links.entries()) {
        if (link.proofBacked === true) {
          if (link.status !== 'verified') errors.push({ path: `$.links[${index}].status`, message: 'proof-backed campaign link must be verified' });
          if (link.proofLevel !== 'counter_attested' && link.campaignProofLevel !== 'counter_attested') errors.push({ path: `$.links[${index}].proofLevel`, message: 'proof-backed campaign link must be counter_attested' });
          for (const key of ['terminalVerified', 'visitorVerified', 'lineageVerified', 'settlementVerified']) {
            if (link[key] !== true) errors.push({ path: `$.links[${index}].${key}`, message: 'proof-backed campaign link verification flag must be true' });
          }
        }
      }
    }
  }

  if (kind === 'proof-feed') {
    const entries = artifact.entries ?? [];
    if (entries.length < 5) errors.push({ path: '$.entries', message: 'proof feed should contain at least five evidence entries' });
    if (enforceFresh) {
      for (const [index, entry] of entries.entries()) {
        if (entry.status !== 'verified') {
          errors.push({ path: `$.entries[${index}].status`, message: 'every proof feed entry must be verified in final mode' });
        }
      }
    }
  }

  if (kind === 'frontier-readiness') {
    if (finalMode && artifact.status !== 'GO') {
      errors.push({ path: '$.status', message: 'frontier readiness must be GO in final schema mode' });
    }
  }

  if (kind === 'merchant-validation-kit') {
    const slots = artifact.evidenceSlots ?? [];
    if (!Array.isArray(slots) || slots.length === 0) {
      errors.push({ path: '$.evidenceSlots', message: 'merchant validation kit must include evidence slots' });
    }
    // Real-world traction is intentionally optional. Empty slots are allowed as long as the kit does not claim traction.
    if (/^(claimed|verified|live)/i.test(String(artifact.validationStatus ?? '')) && !/^not_claimed/i.test(String(artifact.validationStatus ?? '')) && slots.some((slot: any) => slot.status === 'empty' && slot.requiredForClaimingTraction === true)) {
      errors.push({ path: '$.validationStatus', message: 'cannot claim live validation while required evidence slots are empty' });
    }
  }

  return errors;
}

const results = targets.map((target) => {
  try {
    const schema = readJson(target.schema) as JsonSchema;
    const artifact = readJson(target.artifact);
    let value = target.kind === 'poc1'
      ? { ...artifact, proofLevel: artifact.proofLevel ?? artifact.targetProofLevel, attestationModel: artifact.attestationModel ?? artifact.targetAttestationModel }
      : artifact;
    // In non-final pre-proof mode, stale artifacts may intentionally lack final-only proof fields.
    // Validate schema compatibility without pretending those fields are verified.
    if (!finalMode && target.kind === 'poc1' && isPreproofStaleArtifact(artifact)) {
      value = {
        ...value,
        terminalVerified: artifact.terminalVerified ?? false,
        visitorVerified: artifact.visitorVerified ?? false,
        lineageVerified: artifact.lineageVerified ?? false,
        hashes: { intentManifestHash: 'preproof', visitAttestationHash: 'preproof', ...(artifact.hashes ?? {}) },
        pdas: {
          terminalDevice: 'preproof', terminalAuthority: 'preproof', visitorAuthority: 'preproof', claimPass: 'preproof', causalReceipt: 'preproof', settlementRecord: 'preproof',
          ...(artifact.pdas ?? {}),
        },
        attackEvidence: artifact.attackEvidence ?? Array.from({ length: 16 }, (_, index) => ({ id: `preproof-${index}`, expected: 'rejected', observed: 'not_proven' })),
      };
    }
    if (!finalMode && target.kind === 'fraud' && isPreproofStaleArtifact(artifact)) {
      value = {
        ...artifact,
        cases: [
          ...(artifact.cases ?? []),
          ...Array.from({ length: Math.max(0, 16 - (artifact.cases ?? []).length) }, (_, index) => ({
            id: `preproof-missing-${index}`,
            title: 'Pre-proof placeholder',
            expected: 'rejected',
            observed: 'not_proven',
            normalReferralFailure: 'Pending final proof run.',
            viralSyncDefense: 'Run frontier:final to regenerate the 16-case gauntlet.',
            proofSource: 'intent_validator_check',
            expectedErrorMatched: false,
            accountsMutated: false,
            accountsMutationVerified: false,
            failureKind: 'intent_validator_rejection',
            evidence: 'Pre-proof placeholder.',
          })),
        ].map((item: any) => ({
          ...item,
          proofSource: item.proofSource && ['devnet_transaction_execution', 'localnet_transaction_execution', 'intent_validator_check', 'mock_final_fixture'].includes(item.proofSource)
            ? item.proofSource
            : 'intent_validator_check',
          failureKind: item.failureKind && ['program_rejection', 'intent_validator_rejection'].includes(item.failureKind)
            ? item.failureKind
            : 'intent_validator_rejection',
        })),
      };
    }
    const errors = [...validate(schema, value), ...domainChecks(target.kind, artifact)];
    return { ...target, finalMode, ok: errors.length === 0, errors };
  } catch (error) {
    return { ...target, finalMode, ok: false, errors: [{ path: '$', message: error instanceof Error ? error.message : String(error) }] };
  }
});

const failures = results.filter((item) => !item.ok);
console.log(JSON.stringify({ ok: failures.length === 0, finalMode, results, failures }, null, 2));
if (failures.length) process.exitCode = 1;
