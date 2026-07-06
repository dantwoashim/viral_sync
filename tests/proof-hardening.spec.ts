import fs from 'fs';
import { expect } from 'chai';
import { canonicalArtifactHash, readJson, computeProofHashes } from '../scripts/proof-artifact-utils';
import { expectedErrorMatched, expectedPatternsFor } from '../scripts/fraud-error-matching';
import { isPublicDemoRoute } from '../app/src/lib/demo-mode';
import { gauntletLabel, getProofState } from '../app/src/lib/proof/getProofState';
import { confirmVisitPass, createVisitPassPacket, resetProductLoopPassStoreForTests } from '../app/src/lib/product-loop/productLoop';
import { getWorldClassReadiness } from '../app/src/lib/readiness/operatingReadiness';
import { getExecutionAudit } from '../app/src/lib/readiness/executionAudit';
import { getMerchantValidationState, normalizeMerchantValidation } from '../app/src/lib/traction/merchantValidation';
import { buildBeneficiaryIntentManifestHash, isValidWebhookSignature, verifyFraudGauntlet } from '../sdk/src/index';

describe('proof hardening regressions', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    resetProductLoopPassStoreForTests();
  });

  it('binds the published manifest to current source, IDL, generator, and verifier', () => {
    const manifest = readJson<Record<string, unknown>>('app/public/proofs/devnet-causal-commerce.json');
    const current = computeProofHashes();

    expect(manifest.programSourceHash).to.equal(current.programSourceHash);
    expect(manifest.idlHash).to.equal(current.idlHash);
    expect(manifest.proofGeneratorHash).to.equal(current.proofGeneratorHash);
    expect(manifest.verifierHash).to.equal(current.verifierHash);
  });

  it('does not let generic custom program errors satisfy specific expected errors', () => {
    expect(expectedErrorMatched('Error Code: InvalidClaimPass', expectedPatternsFor('InvalidVisitorAuthority'))).to.equal(false);
    expect(expectedErrorMatched('Error Code: InvalidClaimPass', expectedPatternsFor('InvalidClaimPass'))).to.equal(true);
    expect(expectedErrorMatched('custom program error: 0x178f', expectedPatternsFor('InvalidVisitorAuthority'))).to.equal(false);
  });

  it('keeps public proof artifacts and well-known metadata reachable while hiding old surfaces', () => {
    expect(isPublicDemoRoute('/proofs/fraud-gauntlet.json')).to.equal(true);
    expect(isPublicDemoRoute('/proofs/devnet-causal-commerce.json')).to.equal(true);
    expect(isPublicDemoRoute('/proofs/devnet-causal-commerce-verifier.json')).to.equal(true);
    expect(isPublicDemoRoute('/proofs/proof-feed.json')).to.equal(true);
    expect(isPublicDemoRoute('/.well-known/blink.json')).to.equal(true);
    expect(isPublicDemoRoute('/icon.png')).to.equal(true);
    expect(isPublicDemoRoute('/admin')).to.equal(false);
    expect(isPublicDemoRoute('/frontier')).to.equal(false);
  });

  it('does not default missing gauntlet data to a false 16/16 success label', () => {
    expect(gauntletLabel({})).to.equal('Pending');
  });

  it('keeps canonical artifact hashes self-consistent after stamping', () => {
    for (const file of [
      'app/public/proofs/devnet-causal-commerce.json',
      'app/public/proofs/devnet-causal-commerce-verifier.json',
      'app/public/proofs/fraud-gauntlet.json',
      'app/public/proofs/proof-feed.json',
    ]) {
      const artifact = readJson<Record<string, unknown>>(file);
      expect(artifact.artifactHash, file).to.equal(canonicalArtifactHash(artifact));
    }
  });

  it('uses canonical verifier hashes that are not self-referential raw file hashes', () => {
    const current = computeProofHashes();
    const manifest = readJson<Record<string, unknown>>('app/public/proofs/devnet-causal-commerce.json');
    const published = readJson<Record<string, unknown>>('app/public/proofs/devnet-causal-commerce-verifier.json');

    expect(manifest.publishedVerifierHash).to.equal(current.publishedVerifierHash);
    expect(published.publishedVerifierHash).to.equal(current.publishedVerifierHash);
  });

  it('wires the customer and terminal surfaces to product-loop APIs instead of static timers', () => {
    const claim = fs.readFileSync('app/src/app/claim/[token]/page.tsx', 'utf8');
    const claimClient = fs.readFileSync('app/src/components/product/ProductClaimFlow.tsx', 'utf8');
    const terminal = fs.readFileSync('app/src/components/product/MerchantTerminalFlow.tsx', 'utf8');

    expect(claim).to.include('ProductClaimFlow');
    expect(claimClient).to.include('/api/product-loop/claim-pass');
    expect(terminal).to.include('/api/product-loop/terminal/confirm');
    expect(terminal).not.to.include('setTimeout');
    expect(terminal).not.to.include('NEXT_PUBLIC_TERMINAL_DEMO');
  });

  it('creates a proof-backed pass packet and rejects mismatched terminal codes', () => {
    const slug = 'thamel-brew-counter-attested-visits';
    const pass = createVisitPassPacket(slug, slug);
    expect(pass?.ok).to.equal(true);
    expect(pass?.passCode).to.match(/^VS-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(pass?.passMac).to.match(/^[0-9a-f]{64}$/);
    expect(pass?.passId).to.match(/^pass_[0-9a-f]{18}$/);
    expect(pass?.nonce).to.match(/^[0-9a-f]{24}$/);

    const accepted = confirmVisitPass({
      slug,
      token: slug,
      passId: pass?.passId,
      nonce: pass?.nonce,
      terminalDevicePda: pass?.campaign.terminalDevicePda,
      merchantAlias: pass?.campaign.merchantAlias,
      passCode: pass?.passCode,
      passMac: pass?.passMac,
    });
    expect(accepted.ok).to.equal(true);
    expect(accepted.status).to.equal('verified');
    expect(accepted.checks.every((check) => check.ok)).to.equal(true);

    const rejected = confirmVisitPass({ slug, token: slug, passCode: 'VS-USED-PASS' });
    expect(rejected.ok).to.equal(false);
    expect(rejected.status).to.equal('rejected');
    expect(JSON.stringify(rejected)).not.to.include('Expected ');
    expect(JSON.stringify(rejected)).not.to.include(pass?.passCode);
    const missingMac = confirmVisitPass({ slug, token: slug, passCode: pass?.passCode });
    expect(missingMac.ok).to.equal(false);
  });

  it('requires a real pass signing secret in production unless demo fallback is explicit', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.PRODUCT_LOOP_PASS_SECRET;
    delete process.env.VIRAL_SYNC_ALLOW_DEMO_PASS_FALLBACK;
    expect(() => createVisitPassPacket('thamel-brew-counter-attested-visits')).to.throw(/PRODUCT_LOOP_PASS_SECRET/);

    process.env.VIRAL_SYNC_ALLOW_DEMO_PASS_FALLBACK = 'true';
    const fallbackPass = createVisitPassPacket('thamel-brew-counter-attested-visits');
    expect(fallbackPass?.ok).to.equal(true);

    resetProductLoopPassStoreForTests();
    process.env.PRODUCT_LOOP_PASS_SECRET = 'x'.repeat(32);
    delete process.env.VIRAL_SYNC_ALLOW_DEMO_PASS_FALLBACK;
    const productionPass = createVisitPassPacket('thamel-brew-counter-attested-visits');
    expect(productionPass?.ok).to.equal(true);
  });

  it('enforces pass expiration, one-time use, campaign binding, and terminal binding', () => {
    process.env.PRODUCT_LOOP_PASS_TTL_MS = '1000';
    const slug = 'thamel-brew-counter-attested-visits';
    const pass = createVisitPassPacket(slug, slug);
    expect(pass).to.not.equal(null);

    const expired = confirmVisitPass({
      slug,
      token: slug,
      passId: pass?.passId,
      nonce: pass?.nonce,
      terminalDevicePda: pass?.campaign.terminalDevicePda,
      merchantAlias: pass?.campaign.merchantAlias,
      passCode: pass?.passCode,
      passMac: pass?.passMac,
      nowMs: Date.now() + 60_000,
    });
    expect(expired.ok).to.equal(false);
    expect(expired.reason).to.equal('Invalid or expired pass.');

    resetProductLoopPassStoreForTests();
    const fresh = createVisitPassPacket(slug, slug);
    const wrongTerminal = confirmVisitPass({
      slug,
      token: slug,
      passId: fresh?.passId,
      nonce: fresh?.nonce,
      terminalDevicePda: 'wrong-terminal',
      merchantAlias: fresh?.campaign.merchantAlias,
      passCode: fresh?.passCode,
      passMac: fresh?.passMac,
    });
    expect(wrongTerminal.ok).to.equal(false);

    const wrongCampaign = confirmVisitPass({
      slug: 'missing-campaign',
      token: slug,
      passId: fresh?.passId,
      nonce: fresh?.nonce,
      terminalDevicePda: fresh?.campaign.terminalDevicePda,
      merchantAlias: fresh?.campaign.merchantAlias,
      passCode: fresh?.passCode,
      passMac: fresh?.passMac,
    });
    expect(wrongCampaign.ok).to.equal(false);

    const accepted = confirmVisitPass({
      slug,
      token: slug,
      passId: fresh?.passId,
      nonce: fresh?.nonce,
      terminalDevicePda: fresh?.campaign.terminalDevicePda,
      merchantAlias: fresh?.campaign.merchantAlias,
      passCode: fresh?.passCode,
      passMac: fresh?.passMac,
    });
    expect(accepted.ok).to.equal(true);

    const reused = confirmVisitPass({
      slug,
      token: slug,
      passId: fresh?.passId,
      nonce: fresh?.nonce,
      terminalDevicePda: fresh?.campaign.terminalDevicePda,
      merchantAlias: fresh?.campaign.merchantAlias,
      passCode: fresh?.passCode,
      passMac: fresh?.passMac,
    });
    expect(reused.ok).to.equal(false);
  });

  it('does not publish unsigned terminal confirmation links from campaign actions', () => {
    const actionRoute = fs.readFileSync('app/src/app/api/actions/campaign/[slug]/route.ts', 'utf8');

    expect(actionRoute).to.include('const terminalUrl =');
    expect(actionRoute).to.include('mac=${encodeURIComponent(pass.passMac)}');
    expect(actionRoute).to.include('passId=${encodeURIComponent(pass.passId)}');
    expect(actionRoute).to.include('nonce=${encodeURIComponent(pass.nonce)}');
    expect(actionRoute).to.include('terminal: terminalUrl');
    expect(actionRoute).to.include('terminalSigned: terminalUrl');
  });

  it('restricts mutation route CORS in production instead of using wildcard origins', () => {
    const corsHelper = fs.readFileSync('app/src/lib/http/cors.ts', 'utf8');
    expect(corsHelper).to.include('LAUNCH_ALLOWED_ORIGINS');
    expect(corsHelper).to.include("return allowed.includes(origin) ? origin : 'null'");
    expect(corsHelper).to.include('withPublicReadHeaders');
    expect(corsHelper).to.include("response.headers.set('Access-Control-Allow-Origin', '*');");
    expect(corsHelper).to.include('corsOrigin(request, options.publicRead === true)');

    for (const file of [
      'app/src/app/api/product-loop/claim-pass/route.ts',
      'app/src/app/api/product-loop/terminal/confirm/route.ts',
      'app/src/app/api/actions/campaign/[slug]/route.ts',
    ]) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).to.include('withCorsHeaders');
      expect(source).not.to.include("response.headers.set('Access-Control-Allow-Origin', '*');");
    }
  });

  it('keeps protocol and lineage hardening wired into the on-chain surface', () => {
    const program = fs.readFileSync('programs/viral_sync/src/instructions/causal_commerce.rs', 'utf8');
    const lib = fs.readFileSync('programs/viral_sync/src/lib.rs', 'utf8');
    const errors = fs.readFileSync('programs/viral_sync/src/errors.rs', 'utf8');
    const runner = fs.readFileSync('scripts/run-causal-commerce-localnet.ts', 'utf8');
    const verifier = fs.readFileSync('scripts/verify-causal-receipt-localnet.ts', 'utf8');

    expect(program).to.include('set_terminal_device_status');
    expect(lib).to.include('pub fn set_terminal_device_status');
    expect(program).to.include('InvalidLineageProof');
    expect(program).to.include('claim_pass.depth == 1');
    expect(program).to.include('parent_receipt_id_hash == [0; 32]');
    expect(program).to.include('claim_pass.referrer_receipt != Pubkey::default()');
    expect(program).to.include('remaining_accounts');
    expect(program).to.include('parent_receipt.status == CausalReceiptStatus::Settled');
    expect(program).to.include('parent_receipt.receipt_id_hash == parent_receipt_id_hash');
    expect(runner).to.include('child-parent-receipt-hash-mismatch');
    expect(verifier).to.include('childParentReceiptVerified');
    expect(errors).to.include('InvalidLineageProof');
  });

  it('publishes agent discovery surfaces without advertising disabled paid x402 flows', () => {
    const mcp = JSON.parse(fs.readFileSync('app/public/.well-known/mcp.json', 'utf8')) as {
      tools: Array<{ name: string; endpoint?: string; payment?: string | Record<string, unknown> }>;
      proofContract?: { currentFraudGauntlet?: string };
    };
    const blink = JSON.parse(fs.readFileSync('app/public/.well-known/blink.json', 'utf8')) as {
      rules?: Array<{ pathPattern?: string }>;
      x402?: { relayer?: Record<string, string> };
    };
    const agentRoute = fs.readFileSync('app/src/app/api/agent/receipt/[id]/route.ts', 'utf8');
    const relayer = fs.readFileSync('relayer/src/index.ts', 'utf8');

    const toolByName = new Map(mcp.tools.map((tool) => [tool.name, tool]));
    expect(toolByName.get('agent_receipt_context')?.endpoint).to.equal('GET /api/agent/receipt/{id}');
    expect(toolByName.has('x402_create_campaign')).to.equal(false);
    expect(toolByName.has('x402_verify_receipt')).to.equal(false);
    expect(mcp.proofContract?.currentFraudGauntlet).to.equal('19/19');

    expect(blink.rules?.some((rule) => rule.pathPattern === '/api/agent/receipt/*')).to.equal(true);
    expect(blink.x402).to.equal(undefined);

    expect(agentRoute).to.include('viral_sync_agent_receipt_context');
    expect(agentRoute).to.include('childLineageProof');
    expect(agentRoute).to.include('fraudGauntletBlockedAllCases');
    expect(agentRoute).to.include('sourceHashesMatched');

    expect(relayer).to.include("app.get('/.well-known/mcp.json'");
    expect(relayer).to.include('campaign_creation_not_enabled');
    expect(relayer).to.include('publicErrorMessage');
    expect(relayer).to.include('Relay request rejected by policy.');
    expect(relayer).not.to.include('x402_paid_campaign_creation');
    expect(relayer).to.include('relay_sponsored_transaction');
  });

  it('compares webhook signatures in constant time for hex and plain encodings', () => {
    expect(isValidWebhookSignature({ payload: 'unused', signature: '616263', expectedSignature: '616263' })).to.equal(true);
    expect(isValidWebhookSignature({ payload: 'unused', signature: 'abc', expectedSignature: 'abc' })).to.equal(true);
    expect(isValidWebhookSignature({ payload: 'unused', signature: '616263', expectedSignature: '616264' })).to.equal(false);
    expect(isValidWebhookSignature({ payload: 'unused', signature: '616263', expectedSignature: 'abc' })).to.equal(true);
  });

  it('SDK verifies the currently published negative-path suite', () => {
    const gauntlet = readJson<Record<string, unknown>>('app/public/proofs/fraud-gauntlet.json');
    const result = verifyFraudGauntlet(gauntlet);
    expect(result.ok).to.equal(true);

    const cases = (gauntlet.cases as Array<{ id: string }>).map((item) => item.id);
    for (const id of [
      'root-parent-lineage-mismatch',
      'child-parent-receipt-hash-mismatch',
      'paused-terminal-device',
      'claim-pass-depth-exceeds-max-depth',
    ]) {
      expect(cases).to.include(id);
      expect(result.checks[`${id}:present`]).to.equal(true);
    }
    expect(result.checks['claim-pass-depth-exceeded:present']).to.equal(undefined);
  });

  it('keeps beneficiary binding explicit for v2 manifests and child lineage receipts', () => {
    const hash = buildBeneficiaryIntentManifestHash({
      receiptIdHashHex: 'a'.repeat(64),
      referrerBeneficiary: '11111111111111111111111111111111',
      visitorBeneficiary: '22222222222222222222222222222222',
      rewardAmount: '1000',
      rewardMint: '33333333333333333333333333333333',
      referrerSplitBps: 8000,
    });
    const changed = buildBeneficiaryIntentManifestHash({
      receiptIdHashHex: 'a'.repeat(64),
      referrerBeneficiary: '44444444444444444444444444444444',
      visitorBeneficiary: '22222222222222222222222222222222',
      rewardAmount: '1000',
      rewardMint: '33333333333333333333333333333333',
      referrerSplitBps: 8000,
    });
    const program = fs.readFileSync('programs/viral_sync/src/instructions/causal_commerce.rs', 'utf8');

    expect(hash).to.match(/^[0-9a-f]{64}$/);
    expect(hash).not.to.equal(changed);
    expect(program).to.include('referrer_beneficiary');
    expect(program).to.include('parent_receipt.visitor_beneficiary');
    expect(program).to.include('ViralSyncError::IntentMismatch');
    const runner = fs.readFileSync('scripts/run-causal-commerce-localnet.ts', 'utf8');
    expect(runner).to.include('visitorAuthority.publicKey,\n    visitorAuthority.publicKey,');
  });

  it('keeps merchant validation honest until required evidence is verified', () => {
    const validation = getMerchantValidationState();
    const proofPage = fs.readFileSync('app/src/app/proof/page.tsx', 'utf8');
    const validationRoute = fs.readFileSync('app/src/app/api/agent/validation/route.ts', 'utf8');
    const mcp = JSON.parse(fs.readFileSync('app/public/.well-known/mcp.json', 'utf8')) as {
      tools: Array<{ name: string; endpoint?: string; payment?: string | Record<string, unknown> }>;
    };
    const blink = JSON.parse(fs.readFileSync('app/public/.well-known/blink.json', 'utf8')) as {
      rules?: Array<{ pathPattern?: string }>;
    };

    expect(validation.artifactType).to.equal('viral_sync_merchant_validation_context');
    expect(validation.technicalProofVerified).to.equal(false);
    expect(validation.tractionClaimAllowed).to.equal(false);
    expect(validation.claimStatus).to.equal('not_claimed');
    expect(validation.evidenceSummary.requiredSlots).to.be.greaterThan(0);
    expect(validation.evidenceSummary.requiredVerifiedSlots).to.equal(0);
    expect(validation.safeSubmissionWording).to.match(/not claimed/i);

    const claimable = normalizeMerchantValidation({
      merchantAlias: 'Proof Cafe',
      evidenceSlots: [
        { id: 'quote', status: 'verified', requiredForClaimingTraction: true },
        { id: 'video', status: 'verified', requiredForClaimingTraction: true },
      ],
    });
    expect(claimable.tractionClaimAllowed).to.equal(true);
    expect(claimable.claimStatus).to.equal('claimable');

    expect(proofPage).not.to.include('id="validation"');
    expect(proofPage).not.to.include('Traction not claimed');
    expect(proofPage).to.include('What this proof does not claim.');
    expect(validationRoute).to.include('technical_proof_only_do_not_claim_live_traction');
    expect(mcp.tools.some((tool) => tool.name === 'merchant_validation_context' && tool.endpoint === 'GET /api/agent/validation')).to.equal(true);
    expect(blink.rules?.some((rule) => rule.pathPattern === '/api/agent/validation')).to.equal(true);
  });

  it('ships an inspectable operating readiness gate instead of vague roadmap prose', () => {
    const proof = getProofState();
    const validation = getMerchantValidationState(proof);
    const readiness = getWorldClassReadiness(proof, validation);
    const proofPage = fs.readFileSync('app/src/app/proof/page.tsx', 'utf8');
    const merchantToday = fs.readFileSync('app/src/app/merchant/today/page.tsx', 'utf8');
    const readinessRoute = fs.readFileSync('app/src/app/api/agent/readiness/route.ts', 'utf8');
    const mcp = JSON.parse(fs.readFileSync('app/public/.well-known/mcp.json', 'utf8')) as {
      tools: Array<{ name: string; endpoint?: string; payment?: string | Record<string, unknown> }>;
    };
    const blink = JSON.parse(fs.readFileSync('app/public/.well-known/blink.json', 'utf8')) as {
      rules?: Array<{ pathPattern?: string }>;
    };

    expect(readiness.artifactType).to.equal('viral_sync_operating_readiness');
    expect(readiness.workstreams.map((item) => item.phase)).to.deep.equal(['economics', 'security', 'pilot_ops', 'demo_narrative', 'submission_gate']);
    expect(readiness.economics.grossMarginModel).to.match(/Protocol revenue/);
    expect(readiness.security.mainnetEligible).to.equal(false);
    expect(readiness.security.requiredBeforeMainnet).to.include('External security review or audit memo');
    expect(readiness.pilotOps.missingRequiredEvidence.length).to.be.greaterThan(0);
    expect(readiness.demoNarrative.oneLine).to.equal('Money only moves when a conversion is co-signed and settled on Solana.');
    expect(readiness.finalGate.claimProtocolProof).to.equal(true);
    expect(readiness.finalGate.claimLiveTraction).to.equal(false);
    expect(readiness.finalGate.submitToJudges).to.equal(true);
    expect(readiness.score).to.be.greaterThan(50);

    expect(proofPage).not.to.include('id="readiness"');
    expect(proofPage).not.to.include('/api/agent/readiness');
    expect(proofPage).not.to.include('World-class readiness gate');
    expect(proofPage).not.to.include('Submit to judges');
    expect(proofPage).to.include('Public evidence for one POC-1 receipt');
    expect(merchantToday).to.include('Operating readiness gate');
    expect(readinessRoute).to.include('getWorldClassReadiness');
    expect(mcp.tools.some((tool) => tool.name === 'world_class_readiness' && tool.endpoint === 'GET /api/agent/readiness')).to.equal(true);
    expect(blink.rules?.some((rule) => rule.pathPattern === '/api/agent/readiness')).to.equal(true);
  });

  it('accounts for execution phases and separates code completion from founder-only personal work', () => {
    const proof = getProofState();
    const validation = getMerchantValidationState(proof);
    const readiness = getWorldClassReadiness(proof, validation);
    const audit = getExecutionAudit(proof, validation, readiness);
    const proofPage = fs.readFileSync('app/src/app/proof/page.tsx', 'utf8');
    const merchantToday = fs.readFileSync('app/src/app/merchant/today/page.tsx', 'utf8');
    const executionAuditRoute = fs.readFileSync('app/src/app/api/agent/execution-audit/route.ts', 'utf8');
    const mcp = JSON.parse(fs.readFileSync('app/public/.well-known/mcp.json', 'utf8')) as {
      tools: Array<{ name: string; endpoint?: string; payment?: string | Record<string, unknown> }>;
    };
    const blink = JSON.parse(fs.readFileSync('app/public/.well-known/blink.json', 'utf8')) as {
      rules?: Array<{ pathPattern?: string }>;
    };

    expect(audit.artifactType).to.equal('viral_sync_execution_audit');
    expect(audit.allPhasesAccountedFor).to.equal(true);
    expect(audit.phases.map((item) => item.phase)).to.deep.equal([
      'product_loop',
      'protocol_hardening',
      'lineage_hardening',
      'agent_x402_surface',
      'merchant_validation',
      'economics',
      'security',
      'pilot_ops',
      'demo_narrative',
      'submission_gate',
      'submission_dependency_gate',
      'founder_launch_posture',
    ]);
    expect(audit.allCodeExecutableWorkComplete).to.equal(true);
    expect(audit.personalWorkStillRequired).to.equal(true);
    expect(audit.summary.protocolProofClaimAllowed).to.equal(true);
    expect(audit.summary.liveTractionClaimAllowed).to.equal(false);
    expect(audit.summary.mainnetClaimAllowed).to.equal(false);
    expect(audit.finalPersonalActions).to.include('Record final demo video and upload it to the hackathon submission.');
    expect(audit.forbiddenClaims.join(' ')).to.match(/Do not claim live merchant traction/);
    expect(audit.phases[10].title).to.equal('Submission and dependency risk gate');
    expect(audit.phases[11].title).to.equal('Final founder proof and launch posture');

    expect(proofPage).not.to.include('id="execution-audit"');
    expect(proofPage).not.to.include('/api/agent/execution-audit');
    expect(proofPage).to.include('Devnet Evidence');
    expect(merchantToday).to.include('Execution audit');
    expect(executionAuditRoute).to.include('getExecutionAudit');
    expect(mcp.tools.some((tool) => tool.name === 'execution_audit' && tool.endpoint === 'GET /api/agent/execution-audit')).to.equal(true);
    expect(blink.rules?.some((rule) => rule.pathPattern === '/api/agent/execution-audit')).to.equal(true);
  });
});
