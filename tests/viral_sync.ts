import * as anchor from '@coral-xyz/anchor';
import { expect } from 'chai';
import crypto from 'crypto';

const PROGRAM_ID = new anchor.web3.PublicKey('D9ds2V6y4GFGKbo8wF8qQiF81dzhkiznmZsHepcSN6Ta');

function anchorDiscriminator(name: string): Buffer {
  return crypto.createHash('sha256').update(`global:${name}`).digest().subarray(0, 8);
}

describe('viral_sync_static_contracts', () => {
  const merchant = anchor.web3.Keypair.generate().publicKey;
  const mint = anchor.web3.Keypair.generate().publicKey;
  const vault = anchor.web3.Keypair.generate().publicKey;
  const redeemer = anchor.web3.Keypair.generate().publicKey;
  const escrowGeneration = anchor.web3.Keypair.generate().publicKey;
  const referrer = anchor.web3.Keypair.generate().publicKey;
  const fence = anchor.web3.Keypair.generate().publicKey;

  it('derives merchant config from merchant_v4 + mint', () => {
    const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('merchant_v4'), mint.toBuffer()],
      PROGRAM_ID
    );

    const [legacyPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('merchant_config'), merchant.toBuffer()],
      PROGRAM_ID
    );

    expect(pda.equals(legacyPda)).to.equal(false);
  });

  it('derives vault entry from vault_entry + mint + vault', () => {
    const [vaultEntryPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('vault_entry'), mint.toBuffer(), vault.toBuffer()],
      PROGRAM_ID
    );

    const [legacyVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), merchant.toBuffer(), vault.toBuffer()],
      PROGRAM_ID
    );

    expect(vaultEntryPda.equals(legacyVaultPda)).to.equal(false);
  });

  it('derives geo fences from geo_fence + mint + vault', () => {
    const [geoFencePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('geo_fence'), mint.toBuffer(), vault.toBuffer()],
      PROGRAM_ID
    );

    const [legacyGeoFencePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('geofence'), vault.toBuffer()],
      PROGRAM_ID
    );

    expect(geoFencePda.equals(legacyGeoFencePda)).to.equal(false);
  });

  it('derives referral records from mint + referrer + redeemer', () => {
    const [referralPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('referral_v4'), mint.toBuffer(), referrer.toBuffer(), redeemer.toBuffer()],
      PROGRAM_ID
    );

    expect(anchor.web3.PublicKey.isOnCurve(referralPda.toBytes())).to.equal(false);
  });

  it('derives escrow authority from escrow_authority + escrow generation', () => {
    const [escrowAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow_authority'), escrowGeneration.toBuffer()],
      PROGRAM_ID
    );

    expect(anchor.web3.PublicKey.isOnCurve(escrowAuthority.toBytes())).to.equal(false);
  });

  it('derives geo nonce markers from fence + redeemer only', () => {
    const [geoNoncePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('geo_nonce'), fence.toBuffer(), redeemer.toBuffer()],
      PROGRAM_ID
    );

    expect(anchor.web3.PublicKey.isOnCurve(geoNoncePda.toBytes())).to.equal(false);
  });

  it('derives merchant closure snapshots from merchant_close_snapshot + merchant config', () => {
    const [merchantConfig] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('merchant_v4'), mint.toBuffer()],
      PROGRAM_ID
    );

    const [snapshotPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('merchant_close_snapshot'), merchantConfig.toBuffer()],
      PROGRAM_ID
    );

    expect(anchor.web3.PublicKey.isOnCurve(snapshotPda.toBytes())).to.equal(false);
  });

  it('derives bond claim markers from snapshot + holder', () => {
    const [merchantConfig] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('merchant_v4'), mint.toBuffer()],
      PROGRAM_ID
    );

    const [snapshotPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('merchant_close_snapshot'), merchantConfig.toBuffer()],
      PROGRAM_ID
    );

    const [claimMarkerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('bond_claim_v1'), snapshotPda.toBuffer(), redeemer.toBuffer()],
      PROGRAM_ID
    );

    expect(anchor.web3.PublicKey.isOnCurve(claimMarkerPda.toBytes())).to.equal(false);
  });

  it('keeps instruction discriminators stable for session-critical flows', () => {
    expect(anchorDiscriminator('init_token_generation').toString('hex')).to.equal('189464a9901b7c77');
    expect(anchorDiscriminator('claim_escrow').toString('hex')).to.equal('c850b69f3d4b09cd');
  });
});
