import { expect } from 'chai';
import { Keypair, PublicKey } from '@solana/web3.js';

import {
  calculateEpochFee,
  createTransferCheckedWithOptionalFeeAndHookInstruction,
  decodeToken2022Account,
  decodeToken2022Mint,
  getTransferFeeConfig,
  getTransferHookProgramId,
} from '../server/actions/src/token2022';

const ACCOUNT_SIZE = 165;
const ACCOUNT_TYPE_SIZE = 1;

function createMintBuffer(params: {
  decimals: number;
  supply: bigint;
  hookProgramId: PublicKey;
  olderEpoch: bigint;
  olderMaxFee: bigint;
  olderBps: number;
  newerEpoch: bigint;
  newerMaxFee: bigint;
  newerBps: number;
}): Buffer {
  const transferFeeLength = 108;
  const transferHookLength = 64;
  const totalLength = ACCOUNT_SIZE
    + ACCOUNT_TYPE_SIZE
    + 4 + transferFeeLength
    + 4 + transferHookLength;
  const data = Buffer.alloc(totalLength);
  data.writeBigUInt64LE(params.supply, 36);
  data.writeUInt8(params.decimals, 44);
  data.writeUInt8(1, 45);
  data.writeUInt8(1, ACCOUNT_SIZE);

  let cursor = ACCOUNT_SIZE + ACCOUNT_TYPE_SIZE;
  data.writeUInt16LE(1, cursor);
  data.writeUInt16LE(transferFeeLength, cursor + 2);
  cursor += 4;
  data.writeBigUInt64LE(params.olderEpoch, cursor + 72);
  data.writeBigUInt64LE(params.olderMaxFee, cursor + 80);
  data.writeUInt16LE(params.olderBps, cursor + 88);
  data.writeBigUInt64LE(params.newerEpoch, cursor + 90);
  data.writeBigUInt64LE(params.newerMaxFee, cursor + 98);
  data.writeUInt16LE(params.newerBps, cursor + 106);
  cursor += transferFeeLength;

  data.writeUInt16LE(14, cursor);
  data.writeUInt16LE(transferHookLength, cursor + 2);
  cursor += 4;
  params.hookProgramId.toBuffer().copy(data, cursor + 32);

  return data;
}

function createAccountBuffer(mint: PublicKey, owner: PublicKey, amount: bigint): Buffer {
  const data = Buffer.alloc(ACCOUNT_SIZE);
  mint.toBuffer().copy(data, 0);
  owner.toBuffer().copy(data, 32);
  data.writeBigUInt64LE(amount, 64);
  data.writeUInt8(1, 108);
  return data;
}

describe('Token-2022 runtime helpers', () => {
  it('decodes mint extensions and computes epoch fees', () => {
    const mint = Keypair.generate().publicKey;
    const hookProgramId = Keypair.generate().publicKey;
    const mintInfo = decodeToken2022Mint(
      mint,
      {
        data: createMintBuffer({
          decimals: 6,
          supply: 500_000_000n,
          hookProgramId,
          olderEpoch: 10n,
          olderMaxFee: 15n,
          olderBps: 125,
          newerEpoch: 20n,
          newerMaxFee: 20n,
          newerBps: 250,
        }),
        executable: false,
        lamports: 1,
        owner: hookProgramId,
        rentEpoch: 0,
      },
      hookProgramId,
    );

    const feeConfig = getTransferFeeConfig(mintInfo);
    expect(mintInfo.decimals).to.equal(6);
    expect(getTransferHookProgramId(mintInfo)?.toBase58()).to.equal(hookProgramId.toBase58());
    expect(feeConfig?.olderTransferFee.transferFeeBasisPoints).to.equal(125);
    expect(feeConfig?.newerTransferFee.transferFeeBasisPoints).to.equal(250);
    expect(calculateEpochFee(feeConfig!, 19n, 400n)).to.equal(5n);
    expect(calculateEpochFee(feeConfig!, 25n, 1_000n)).to.equal(20n);
  });

  it('builds transfer instructions with the viral sync hook account order', () => {
    const source = Keypair.generate().publicKey;
    const mint = Keypair.generate().publicKey;
    const destination = Keypair.generate().publicKey;
    const owner = Keypair.generate().publicKey;
    const hookAccounts = {
      transferHookProgramId: Keypair.generate().publicKey,
      validationState: Keypair.generate().publicKey,
      merchantConfig: Keypair.generate().publicKey,
      vaultEntry: Keypair.generate().publicKey,
      geoFence: Keypair.generate().publicKey,
      sourceGeneration: Keypair.generate().publicKey,
      destGeneration: Keypair.generate().publicKey,
      geoNonce: Keypair.generate().publicKey,
    };

    const instruction = createTransferCheckedWithOptionalFeeAndHookInstruction({
      source,
      mint,
      destination,
      owner,
      amount: 42n,
      decimals: 9,
      tokenProgramId: Keypair.generate().publicKey,
      fee: 3n,
      hookAccounts,
    });

    expect(instruction.keys.map((key) => key.pubkey.toBase58())).to.deep.equal([
      source.toBase58(),
      mint.toBase58(),
      destination.toBase58(),
      owner.toBase58(),
      hookAccounts.merchantConfig.toBase58(),
      hookAccounts.vaultEntry.toBase58(),
      hookAccounts.geoFence.toBase58(),
      hookAccounts.sourceGeneration.toBase58(),
      hookAccounts.destGeneration.toBase58(),
      hookAccounts.geoNonce.toBase58(),
      hookAccounts.transferHookProgramId.toBase58(),
      hookAccounts.validationState.toBase58(),
    ]);
    expect(instruction.data[0]).to.equal(26);
    expect(instruction.data[1]).to.equal(1);
    expect(instruction.data.readBigUInt64LE(2)).to.equal(42n);
    expect(instruction.data.readUInt8(10)).to.equal(9);
    expect(instruction.data.readBigUInt64LE(11)).to.equal(3n);
  });

  it('decodes raw token accounts without spl-token helpers', () => {
    const mint = Keypair.generate().publicKey;
    const owner = Keypair.generate().publicKey;
    const tokenProgramId = Keypair.generate().publicKey;
    const account = Keypair.generate().publicKey;

    const decoded = decodeToken2022Account(
      account,
      {
        data: createAccountBuffer(mint, owner, 77n),
        executable: false,
        lamports: 1,
        owner: tokenProgramId,
        rentEpoch: 0,
      },
      tokenProgramId,
    );

    expect(decoded.mint.toBase58()).to.equal(mint.toBase58());
    expect(decoded.owner.toBase58()).to.equal(owner.toBase58());
    expect(decoded.amount).to.equal(77n);
  });
});
