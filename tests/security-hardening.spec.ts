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
    expect(causalCommerce).to.include('referrer_reward_account.owner == causal_receipt.referrer_beneficiary');
    expect(causalCommerce).to.include('visitor_reward_account.owner == causal_receipt.visitor_beneficiary');
    expect(causalCommerce).to.include('reward_mint.key() == growth_campaign.reward_mint');
    expect(causalState).to.include('pub referrer_beneficiary: Pubkey');
    expect(causalState).to.include('pub visitor_beneficiary: Pubkey');
  });

  it('requires staff-device proof of possession instead of bearer-only staff headers', () => {
    const api = read('app/src/lib/launch/api.ts');
    const server = read('app/src/lib/launch/server.ts');

    expect(api).to.include('x-viral-sync-staff-signature');
    expect(api).to.include('x-viral-sync-staff-timestamp');
    expect(server).to.include('staffDeviceSigningMessage');
    expect(server).to.include('constantTimeHexEqual(expectedSignature, params.staffDeviceSignature)');
    expect(server).to.include('STAFF_DEVICE_SIGNATURE_TTL_MS');
  });

  it('forces relayer authentication, bounded payloads, and program allowlisting', () => {
    const relayer = read('relayer/src/index.ts');

    expect(relayer).to.include('RELAYER_ALLOW_UNAUTHENTICATED');
    expect(relayer).to.include('MAX_TRANSACTION_BYTES must not exceed 2048');
    expect(relayer).to.include('ALLOWED_PROGRAM_IDS must list explicit program IDs in production');
    expect(relayer).to.include('assertAllowedPrograms(decoded)');
  });
});
