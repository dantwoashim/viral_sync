import { expect } from 'chai';
import { readFileSync } from 'fs';
import path from 'path';

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');

describe('production security hardening guards', () => {
  it('locks causal receipt recording and settlement to merchant authority and beneficiary owners', () => {
    const causalCommerce = read('programs/viral_sync/src/instructions/causal_commerce.rs');
    const causalState = read('programs/viral_sync/src/state/causal_commerce.rs');

    expect(causalCommerce).to.include('has_one = merchant_authority @ ViralSyncError::AccessDenied');
    expect(causalCommerce).to.include('now >= campaign.starts_at');
    expect(causalCommerce).to.include('now <= campaign.expires_at');
    expect(causalCommerce).to.include('checked_add(escrow.total_settled)');
    expect(causalCommerce).to.include('campaign.total_recorded < campaign.max_redemptions');
    expect(causalCommerce).to.include('campaign.referrer_split_bps as u64');
    expect(causalCommerce).to.include('referrer_split_bps <= 10_000');
    expect(causalCommerce).to.include('intent_manifest_hash != [0; 32]');
    expect(causalCommerce).to.include('receipt.intent_manifest_hash = intent_manifest_hash');
    expect(causalCommerce).to.include('referrer_reward_account.owner == causal_receipt.referrer_beneficiary');
    expect(causalCommerce).to.include('visitor_reward_account.owner == causal_receipt.visitor_beneficiary');
    expect(causalCommerce).to.include('reward_mint.key() == growth_campaign.reward_mint');
    expect(causalState).to.include('pub intent_manifest_hash: [u8; 32]');
    expect(causalState).to.include('pub referrer_beneficiary: Pubkey');
    expect(causalState).to.include('pub visitor_beneficiary: Pubkey');
  });

  it('blocks fake treasury and arbitrary escrow generation mutation', () => {
    const treasury = read('programs/viral_sync/src/instructions/init_treasury_token_generation.rs');
    const escrows = read('programs/viral_sync/src/instructions/escrows.rs');

    expect(treasury).to.include('pub merchant_config: Account');
    expect(treasury).to.include('merchant_config.merchant == treasury_owner.key()');
    expect(treasury).to.include('gen.gen1_balance = 0');
    expect(treasury).to.not.include('gen.gen1_balance = u64::MAX');
    expect(escrows).to.include('escrow_generation.owner == escrow_authority.key()');
    expect(escrows).to.include('pub escrow_authority: Signer');
  });

  it('keeps production staff devices explicit and sends client proof headers', () => {
    const client = read('app/src/lib/launch/client.ts');
    const server = read('app/src/lib/launch/server.ts');

    expect(server).to.include('isProductionRuntime()');
    expect(server).to.include('ledger.staffDevices = []');
    expect(client).to.include('x-viral-sync-staff-device');
    expect(client).to.include('x-viral-sync-staff-signature');
    expect(client).to.include('crypto.subtle.sign');
    expect(client).to.include("action: 'challenge'");
    expect(client).to.include('x-viral-sync-staff-nonce');
  });

  it('requires staff-device proof of possession instead of bearer-only staff headers', () => {
    const api = read('app/src/lib/launch/api.ts');
    const server = read('app/src/lib/launch/server.ts');

    expect(api).to.include('x-viral-sync-staff-signature');
    expect(api).to.include('x-viral-sync-staff-timestamp');
    expect(api).to.include('x-viral-sync-staff-nonce');
    expect(server).to.include('staffDeviceSigningMessage');
    expect(server).to.include('activeStaffDeviceNonce');
    expect(server).to.include('nonce.consumedAt = new Date().toISOString()');
    expect(server).to.include('verifyStaffDeviceSignature');
    expect(server).to.include("'ecdsa-p256'");
    expect(server).to.include('STAFF_DEVICE_SIGNATURE_TTL_MS');
  });

  it('forces relayer authentication, bounded payloads, and program allowlisting', () => {
    const relayer = read('relayer/src/index.ts');

    expect(relayer).to.include('RELAYER_ALLOW_UNAUTHENTICATED');
    expect(relayer).to.include('MAX_TRANSACTION_BYTES must not exceed 2048');
    expect(relayer).to.include('ALLOWED_PROGRAM_IDS must list explicit program IDs in production');
    expect(relayer).to.include('assertAllowedPrograms(decoded)');
    expect(relayer).to.include('ALLOWED_INSTRUCTION_PREFIXES must list explicit instruction data prefixes in production');
    expect(relayer).to.include('ALLOWED_WRITABLE_ACCOUNTS must list explicit writable accounts in production');
    expect(relayer).to.include('assertInstructionPolicy(decoded)');
    expect(relayer).to.include('MAX_COMPUTE_UNITS');
  });

  it('keeps Postgres normalized instead of opaque ledger-only storage', () => {
    const server = read('app/src/lib/launch/server.ts');

    expect(server).to.include('CREATE TABLE IF NOT EXISTS causal_receipts');
    expect(server).to.include('CREATE TABLE IF NOT EXISTS staff_device_nonces');
    expect(server).to.include('UNIQUE (campaign_id, campaign_nullifier_hash)');
    expect(server).to.include('syncNormalizedLaunchTables');
    expect(server).to.include('loadLedgerFromNormalizedTables');
    expect(server).to.include('const normalizedLedger = await loadLedgerFromNormalizedTables()');
    expect(server).to.include('await syncNormalizedLaunchTables(client, ledger)');
    expect(server).to.include('INSERT INTO causal_receipts');
    expect(server).to.include('ALTER TABLE redemptions DROP COLUMN IF EXISTS code');
    expect(server).to.include('public_key_material TEXT');
    expect(server).to.not.include('CREATE TABLE IF NOT EXISTS launch_ledger');
    expect(server).to.not.include('SELECT data FROM launch_ledger');
    expect(server).to.not.include('UPDATE launch_ledger');
    expect(server).to.not.include('INSERT INTO redemptions (id, claim_id, merchant_id, code, code_hash');
  });

  it('hardens the Token-2022 transfer hook against direct invocation and spoofed token accounts', () => {
    const hook = read('programs/viral_sync/src/instructions/transfer_hook.rs');
    const merchantInit = read('programs/viral_sync/src/instructions/merchant_init.rs');

    expect(hook).to.include('require_transfer_hook_context');
    expect(hook).to.include('TransferHookAccount');
    expect(hook).to.include('source_hook.transferring');
    expect(hook).to.include('destination_hook.transferring');
    expect(hook).to.include('source_token_account.owner == &token_2022::ID');
    expect(hook).to.include('dest_token_account.owner == &token_2022::ID');
    expect(hook).to.include('require_source_authority_or_session');
    expect(hook).to.include('token_account.owner == source_authority.key()');
    expect(hook).to.include('SessionKey');
    expect(hook).to.include('session.tokens_spent.checked_add(amount)');
    expect(hook).to.include('next_spent <= session.max_tokens_per_session');
    expect(hook).to.include('seeds = [b"extra-account-metas", mint.key().as_ref()]');
    expect(hook).to.include('transfer_hook::get_program_id');
    expect(merchantInit).to.include('transfer_hook::get_program_id');
    expect(merchantInit).to.include('hook_program == crate::ID');

    const peerTransfer = hook.slice(hook.indexOf('PEER TRANSFER'));
    const gen1Subtractions = peerTransfer.match(/src_gen\.gen1_balance = src_gen\.gen1_balance\.checked_sub\(from_gen1\)/g) ?? [];
    expect(gen1Subtractions.length).to.equal(1);
  });

  it('recomputes receipt commitments before accepting or displaying proof', () => {
    const causal = read('app/src/lib/launch/causal.ts');
    const server = read('app/src/lib/launch/server.ts');

    expect(causal).to.include('verifyReceiptCommitmentProof');
    expect(causal).to.include('expectedReferrerCommitment');
    expect(causal).to.include('expectedVisitAttestationHash');
    expect(causal).to.include('expectedReceiptIdHash');
    expect(server).to.include('Receipt commitment proof failed verification');
    expect(server).to.include('commitmentProof');
  });

  it('exposes real localnet Anchor attack checks for critical protocol failures', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    const script = read('scripts/run-causal-commerce-localnet.ts');

    expect(pkg.scripts['test:anchor-attacks']).to.include('--attack-check');
    expect(script).to.include('wrong merchant authority cannot settle receipt');
    expect(script).to.include('wrong beneficiary token account cannot receive settlement');
    expect(script).to.include('sendProgramInstruction(connection, walletInfo.keypair, methods.settleReceiptReward()');
    expect(script).to.include('[attackerAuthority]');
  });

  it('exposes a devnet proof path with intent manifest and narrow effect checks', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    const script = read('scripts/run-causal-commerce-localnet.ts');
    const effectCheck = read('app/src/lib/launch/effect-check.ts');
    const proofPage = read('app/src/app/frontier-proof/page.tsx');
    const proofManifest = read('app/public/proofs/devnet-causal-commerce.json');

    expect(pkg.scripts['devnet:causal-commerce']).to.include('https://api.devnet.solana.com');
    expect(pkg.scripts['devnet:causal-commerce']).to.include('--replay-check --attack-check');
    expect(script).to.include('intentManifestHash');
    expect(script).to.include('explorerLinks');
    expect(script).to.include('https://explorer.solana.com/tx/');
    expect(effectCheck).to.include('validateCausalReceiptEffect');
    expect(effectCheck).to.include('Referrer beneficiary does not match manifest.');
    expect(effectCheck).to.include('Reward amount exceeds manifest maximum.');
    expect(effectCheck).to.include('Instruction is not allowed by manifest.');
    expect(proofPage).to.include('Merchant registered');
    expect(proofPage).to.include('Causal receipt recorded');
    expect(proofPage).to.include('Intent manifest');
    expect(proofManifest).to.include('viral-sync-devnet-causal-commerce');
  });
});
