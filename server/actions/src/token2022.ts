import {
    PublicKey,
    TransactionInstruction,
    type AccountInfo,
} from '@solana/web3.js';

const ACCOUNT_SIZE = 165;
const MINT_SIZE = 82;
const ACCOUNT_TYPE_SIZE = 1;
const ACCOUNT_TYPE_MINT = 1;
const ACCOUNT_TYPE_ACCOUNT = 2;
const EXTENSION_HEADER_SIZE = 4;
const EXTENSION_TYPE_TRANSFER_FEE_CONFIG = 1;
const EXTENSION_TYPE_TRANSFER_HOOK = 14;
const TOKEN_INSTRUCTION_TRANSFER_CHECKED = 12;
const TOKEN_INSTRUCTION_TRANSFER_FEE_EXTENSION = 26;
const TRANSFER_FEE_INSTRUCTION_TRANSFER_CHECKED_WITH_FEE = 1;
const TRANSFER_HOOK_EXECUTE_DISCRIMINATOR = Buffer.from([105, 37, 101, 197, 75, 251, 102, 26]);
const BASIS_POINTS_DENOMINATOR = 10_000n;

export interface DecodedToken2022Mint {
    address: PublicKey;
    decimals: number;
    supply: bigint;
    tlvData: Buffer;
}

export interface DecodedToken2022Account {
    address: PublicKey;
    mint: PublicKey;
    owner: PublicKey;
    amount: bigint;
    tlvData: Buffer;
}

export interface TransferFee {
    epoch: bigint;
    maximumFee: bigint;
    transferFeeBasisPoints: number;
}

export interface TransferFeeConfig {
    olderTransferFee: TransferFee;
    newerTransferFee: TransferFee;
}

export interface TransferHookAccounts {
    transferHookProgramId: PublicKey;
    validationState: PublicKey;
    merchantConfig: PublicKey;
    vaultEntry: PublicKey;
    geoFence: PublicKey;
    sourceGeneration: PublicKey;
    destGeneration: PublicKey;
    geoNonce: PublicKey;
}

interface CreateTransferInstructionParams {
    source: PublicKey;
    mint: PublicKey;
    destination: PublicKey;
    owner: PublicKey;
    amount: bigint;
    decimals: number;
    tokenProgramId: PublicKey;
    fee?: bigint | null;
    hookAccounts?: TransferHookAccounts | null;
}

function readPubkey(data: Buffer, offset: number): PublicKey {
    return new PublicKey(data.subarray(offset, offset + 32));
}

function readU64(data: Buffer, offset: number): bigint {
    return data.readBigUInt64LE(offset);
}

function readMintTlvData(data: Buffer): Buffer {
    if (data.length === MINT_SIZE) {
        return Buffer.alloc(0);
    }
    if (data.length <= ACCOUNT_SIZE || data[ACCOUNT_SIZE] !== ACCOUNT_TYPE_MINT) {
        throw new Error('Mint account is missing a valid Token-2022 mint extension header.');
    }
    return data.subarray(ACCOUNT_SIZE + ACCOUNT_TYPE_SIZE);
}

function readAccountTlvData(data: Buffer): Buffer {
    if (data.length === ACCOUNT_SIZE) {
        return Buffer.alloc(0);
    }
    if (data.length < ACCOUNT_SIZE || data[ACCOUNT_SIZE] !== ACCOUNT_TYPE_ACCOUNT) {
        throw new Error('Token account is missing a valid Token-2022 account extension header.');
    }
    return data.subarray(ACCOUNT_SIZE + ACCOUNT_TYPE_SIZE);
}

function getExtensionData(extensionType: number, tlvData: Buffer): Buffer | null {
    let cursor = 0;
    while (cursor + EXTENSION_HEADER_SIZE <= tlvData.length) {
        const entryType = tlvData.readUInt16LE(cursor);
        const entryLength = tlvData.readUInt16LE(cursor + 2);
        const valueOffset = cursor + EXTENSION_HEADER_SIZE;
        const nextOffset = valueOffset + entryLength;
        if (nextOffset > tlvData.length) {
            break;
        }
        if (entryType === extensionType) {
            return tlvData.subarray(valueOffset, nextOffset);
        }
        cursor = nextOffset;
    }
    return null;
}

function appendTransferHookAccounts(instruction: TransactionInstruction, hookAccounts: TransferHookAccounts) {
    instruction.keys.push(
        { pubkey: hookAccounts.merchantConfig, isSigner: false, isWritable: false },
        { pubkey: hookAccounts.vaultEntry, isSigner: false, isWritable: false },
        { pubkey: hookAccounts.geoFence, isSigner: false, isWritable: false },
        { pubkey: hookAccounts.sourceGeneration, isSigner: false, isWritable: true },
        { pubkey: hookAccounts.destGeneration, isSigner: false, isWritable: true },
        { pubkey: hookAccounts.geoNonce, isSigner: false, isWritable: true },
        { pubkey: hookAccounts.transferHookProgramId, isSigner: false, isWritable: false },
        { pubkey: hookAccounts.validationState, isSigner: false, isWritable: false },
    );
}

function encodeTransferCheckedData(amount: bigint, decimals: number): Buffer {
    const data = Buffer.alloc(10);
    data.writeUInt8(TOKEN_INSTRUCTION_TRANSFER_CHECKED, 0);
    data.writeBigUInt64LE(amount, 1);
    data.writeUInt8(decimals, 9);
    return data;
}

function encodeTransferCheckedWithFeeData(amount: bigint, decimals: number, fee: bigint): Buffer {
    const data = Buffer.alloc(19);
    data.writeUInt8(TOKEN_INSTRUCTION_TRANSFER_FEE_EXTENSION, 0);
    data.writeUInt8(TRANSFER_FEE_INSTRUCTION_TRANSFER_CHECKED_WITH_FEE, 1);
    data.writeBigUInt64LE(amount, 2);
    data.writeUInt8(decimals, 10);
    data.writeBigUInt64LE(fee, 11);
    return data;
}

export function decodeToken2022Mint(
    address: PublicKey,
    info: AccountInfo<Buffer> | null,
    tokenProgramId: PublicKey,
): DecodedToken2022Mint {
    if (!info) {
        throw new Error('Token mint account not found.');
    }
    if (!info.owner.equals(tokenProgramId)) {
        throw new Error('Mint is not owned by the configured Token-2022 program.');
    }
    if (info.data.length < MINT_SIZE) {
        throw new Error('Mint account data is too small.');
    }

    return {
        address,
        supply: readU64(info.data, 36),
        decimals: info.data.readUInt8(44),
        tlvData: readMintTlvData(info.data),
    };
}

export function decodeToken2022Account(
    address: PublicKey,
    info: AccountInfo<Buffer> | null,
    tokenProgramId: PublicKey,
): DecodedToken2022Account {
    if (!info) {
        throw new Error('Token account not found.');
    }
    if (!info.owner.equals(tokenProgramId)) {
        throw new Error('Token account is not owned by the configured Token-2022 program.');
    }
    if (info.data.length < ACCOUNT_SIZE) {
        throw new Error('Token account data is too small.');
    }

    return {
        address,
        mint: readPubkey(info.data, 0),
        owner: readPubkey(info.data, 32),
        amount: readU64(info.data, 64),
        tlvData: readAccountTlvData(info.data),
    };
}

export function getTransferFeeConfig(mint: DecodedToken2022Mint): TransferFeeConfig | null {
    const extensionData = getExtensionData(EXTENSION_TYPE_TRANSFER_FEE_CONFIG, mint.tlvData);
    if (!extensionData || extensionData.length < 108) {
        return null;
    }

    return {
        olderTransferFee: {
            epoch: readU64(extensionData, 72),
            maximumFee: readU64(extensionData, 80),
            transferFeeBasisPoints: extensionData.readUInt16LE(88),
        },
        newerTransferFee: {
            epoch: readU64(extensionData, 90),
            maximumFee: readU64(extensionData, 98),
            transferFeeBasisPoints: extensionData.readUInt16LE(106),
        },
    };
}

export function getTransferHookProgramId(mint: DecodedToken2022Mint): PublicKey | null {
    const extensionData = getExtensionData(EXTENSION_TYPE_TRANSFER_HOOK, mint.tlvData);
    if (!extensionData || extensionData.length < 64) {
        return null;
    }

    const programId = readPubkey(extensionData, 32);
    return programId.equals(PublicKey.default) ? null : programId;
}

export function calculateEpochFee(
    transferFeeConfig: TransferFeeConfig,
    epoch: bigint,
    preFeeAmount: bigint,
): bigint {
    const transferFee = epoch >= transferFeeConfig.newerTransferFee.epoch
        ? transferFeeConfig.newerTransferFee
        : transferFeeConfig.olderTransferFee;

    if (transferFee.transferFeeBasisPoints === 0 || preFeeAmount === 0n) {
        return 0n;
    }

    const rawFee = (preFeeAmount * BigInt(transferFee.transferFeeBasisPoints) + BASIS_POINTS_DENOMINATOR - 1n)
        / BASIS_POINTS_DENOMINATOR;
    return rawFee > transferFee.maximumFee ? transferFee.maximumFee : rawFee;
}

export function findTransferHookValidationPda(mint: PublicKey, transferHookProgramId: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('extra-account-metas'), mint.toBuffer()],
        transferHookProgramId,
    )[0];
}

export function createTransferCheckedWithOptionalFeeAndHookInstruction(
    params: CreateTransferInstructionParams,
): TransactionInstruction {
    const keys = [
        { pubkey: params.source, isSigner: false, isWritable: true },
        { pubkey: params.mint, isSigner: false, isWritable: false },
        { pubkey: params.destination, isSigner: false, isWritable: true },
        { pubkey: params.owner, isSigner: true, isWritable: false },
    ];

    const instruction = new TransactionInstruction({
        programId: params.tokenProgramId,
        keys,
        data: params.fee == null
            ? encodeTransferCheckedData(params.amount, params.decimals)
            : encodeTransferCheckedWithFeeData(params.amount, params.decimals, params.fee),
    });

    if (params.hookAccounts) {
        appendTransferHookAccounts(instruction, params.hookAccounts);
    }

    return instruction;
}

export function buildTransferHookExecuteData(amount: bigint): Buffer {
    const data = Buffer.alloc(16);
    TRANSFER_HOOK_EXECUTE_DISCRIMINATOR.copy(data, 0);
    data.writeBigUInt64LE(amount, 8);
    return data;
}
