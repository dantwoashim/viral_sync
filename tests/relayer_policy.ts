import { expect } from 'chai';
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';

import {
  applyMerchantBudgetUpdate,
  createDefaultMerchantBudget,
  createInitialActionMetrics,
  debitMerchantBudget,
  merchantBudgetBlockReason,
  noteActionAccepted,
  noteActionRejected,
  validateRelayPolicy,
} from '../relayer/src/policy';

function buildLegacyTransaction(feePayer: PublicKey, programId: PublicKey): Transaction {
  const tx = new Transaction({
    feePayer,
    recentBlockhash: Keypair.generate().publicKey.toBase58(),
  });
  tx.add(new TransactionInstruction({
    programId,
    keys: [],
    data: Buffer.alloc(0),
  }));
  return tx;
}

describe('relayer policy helpers', () => {
  it('rejects legacy transactions with the wrong fee payer', () => {
    const relayer = Keypair.generate().publicKey;
    const tx = buildLegacyTransaction(Keypair.generate().publicKey, SystemProgram.programId);

    const failure = validateRelayPolicy(tx, {
      relayEnabled: true,
      relayerPubkey: relayer,
      allowedProgramIds: new Set([SystemProgram.programId.toBase58()]),
      maxInstructions: 8,
    });

    expect(failure?.status).to.equal(400);
    expect(failure?.body.error).to.contain('fee payer');
  });

  it('rejects versioned transactions that reference non-allowlisted programs', () => {
    const relayer = Keypair.generate().publicKey;
    const disallowedProgram = Keypair.generate().publicKey;
    const message = new TransactionMessage({
      payerKey: relayer,
      recentBlockhash: Keypair.generate().publicKey.toBase58(),
      instructions: [
        new TransactionInstruction({
          programId: disallowedProgram,
          keys: [],
          data: Buffer.alloc(0),
        }),
      ],
    }).compileToV0Message();
    const tx = new VersionedTransaction(message);

    const failure = validateRelayPolicy(tx, {
      relayEnabled: true,
      relayerPubkey: relayer,
      allowedProgramIds: new Set([SystemProgram.programId.toBase58()]),
      maxInstructions: 8,
    });

    expect(failure?.status).to.equal(400);
    expect(failure?.body.error).to.contain('non-allowlisted');
  });

  it('applies merchant budget updates and debits sponsored lamports', () => {
    const defaults = { defaultPlan: 'free' as const, defaultLamports: 1_000 };
    const initial = createDefaultMerchantBudget('merchant-1', defaults);
    const updated = applyMerchantBudgetUpdate(
      'merchant-1',
      initial,
      { lamportsDelta: -250, disabled: false, plan: 'growth' },
      defaults,
    );

    expect(updated.plan).to.equal('growth');
    expect(updated.sponsoredLamportsRemaining).to.equal(750);
    expect(merchantBudgetBlockReason(updated, 800)).to.contain('exhausted');

    const charged = debitMerchantBudget(updated, 300, 1_234);
    expect(charged.sponsoredLamportsRemaining).to.equal(450);
    expect(charged.lifetimeSponsoredLamports).to.equal(300);
    expect(charged.lifetimeTransactions).to.equal(1);
    expect(charged.lastActionAt).to.equal(1_234);
  });

  it('tracks accepted and rejected action metrics', () => {
    const metrics = createInitialActionMetrics();
    noteActionAccepted(metrics, 'geo-redeem', 500, 'sig-1');
    noteActionRejected(metrics, 'geo-redeem', 'rate limited');

    expect(metrics['geo-redeem'].accepted).to.equal(1);
    expect(metrics['geo-redeem'].rejected).to.equal(1);
    expect(metrics['geo-redeem'].sponsoredLamports).to.equal(500);
    expect(metrics['geo-redeem'].lastSignature).to.equal('sig-1');
    expect(metrics['geo-redeem'].lastError).to.equal('rate limited');
  });
});
