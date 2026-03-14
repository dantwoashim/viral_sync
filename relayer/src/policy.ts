import {
    Transaction,
    VersionedTransaction,
    type PublicKey,
} from '@solana/web3.js';
import {
    RELAYER_ACTIONS,
    type MerchantBudgetState,
    type MerchantBudgetUpdateRequest,
    type MerchantPlan,
    type RelayerAction,
    type RelayerActionMetric,
    type SponsoredActionResponse,
} from '@viral-sync/shared';

export interface RelayFailure {
    status: number;
    body: SponsoredActionResponse;
}

export interface RelayPolicyConfig {
    relayEnabled: boolean;
    relayerPubkey: PublicKey;
    allowedProgramIds: ReadonlySet<string>;
    maxInstructions: number;
}

export interface MerchantBudgetDefaults {
    defaultPlan: MerchantPlan;
    defaultLamports: number;
}

function fail(status: number, message: string, details?: Partial<SponsoredActionResponse>): RelayFailure {
    return {
        status,
        body: {
            status: 'error',
            error: message,
            logs: details?.logs,
        },
    };
}

export function getVersionedProgramIds(tx: VersionedTransaction): string[] {
    if (tx.message.addressTableLookups.length > 0) {
        throw new Error('Address lookup tables are not supported by this relayer policy.');
    }

    return tx.message.compiledInstructions.map((instruction) => {
        const key = tx.message.staticAccountKeys[instruction.programIdIndex];
        return key.toBase58();
    });
}

export function getLegacyProgramIds(tx: Transaction): string[] {
    return tx.instructions.map((instruction) => instruction.programId.toBase58());
}

export function validateRelayPolicy(
    tx: VersionedTransaction | Transaction,
    config: RelayPolicyConfig,
): RelayFailure | null {
    if (!config.relayEnabled) {
        return fail(503, 'Relayer is disabled until RELAYER_SECRET is configured.');
    }

    if (tx instanceof VersionedTransaction) {
        if (tx.message.staticAccountKeys.length === 0) {
            return fail(400, 'Versioned transaction contains no account keys.');
        }

        const feePayer = tx.message.staticAccountKeys[0];
        if (!feePayer.equals(config.relayerPubkey)) {
            return fail(400, 'Fee payer must be the relayer public key.');
        }

        const programIds = getVersionedProgramIds(tx);
        if (programIds.length > config.maxInstructions) {
            return fail(400, 'Transaction exceeds the relayer instruction limit.');
        }

        const rejected = programIds.filter((id) => !config.allowedProgramIds.has(id));
        if (rejected.length > 0) {
            return fail(400, 'Transaction references a non-allowlisted program.');
        }
        return null;
    }

    const feePayer = tx.feePayer;
    if (!feePayer || !feePayer.equals(config.relayerPubkey)) {
        return fail(400, 'Legacy transaction fee payer must be the relayer public key.');
    }

    const programIds = getLegacyProgramIds(tx);
    if (programIds.length > config.maxInstructions) {
        return fail(400, 'Transaction exceeds the relayer instruction limit.');
    }

    const rejected = programIds.filter((id) => !config.allowedProgramIds.has(id));
    if (rejected.length > 0) {
        return fail(400, 'Transaction references a non-allowlisted program.');
    }
    return null;
}

export function createEmptyActionMetric(): RelayerActionMetric {
    return {
        accepted: 0,
        rejected: 0,
        failed: 0,
        simulatedFailures: 0,
        sponsoredLamports: 0,
    };
}

export function createInitialActionMetrics(): Record<RelayerAction, RelayerActionMetric> {
    return Object.fromEntries(
        RELAYER_ACTIONS.map((action) => [action, createEmptyActionMetric()])
    ) as Record<RelayerAction, RelayerActionMetric>;
}

export function noteActionAccepted(
    metrics: Record<RelayerAction, RelayerActionMetric>,
    action: RelayerAction,
    sponsoredLamports: number,
    signature: string,
) {
    const metric = metrics[action];
    metric.accepted += 1;
    metric.sponsoredLamports += Math.max(0, Math.trunc(sponsoredLamports));
    metric.lastSignature = signature;
    metric.lastError = undefined;
}

export function noteActionRejected(
    metrics: Record<RelayerAction, RelayerActionMetric>,
    action: RelayerAction,
    error: string,
    simulatedFailure = false,
) {
    const metric = metrics[action];
    metric.rejected += 1;
    if (simulatedFailure) {
        metric.simulatedFailures += 1;
    }
    metric.lastError = error;
}

export function noteActionFailed(
    metrics: Record<RelayerAction, RelayerActionMetric>,
    action: RelayerAction,
    error: string,
) {
    const metric = metrics[action];
    metric.failed += 1;
    metric.lastError = error;
}

export function createDefaultMerchantBudget(
    merchant: string,
    defaults: MerchantBudgetDefaults,
    now = Date.now(),
): MerchantBudgetState {
    return {
        merchant,
        plan: defaults.defaultPlan,
        sponsoredLamportsRemaining: Math.max(0, Math.trunc(defaults.defaultLamports)),
        lifetimeSponsoredLamports: 0,
        lifetimeTransactions: 0,
        lastActionAt: 0,
        disabled: false,
    };
}

export function applyMerchantBudgetUpdate(
    merchant: string,
    existing: MerchantBudgetState | null,
    update: MerchantBudgetUpdateRequest,
    defaults: MerchantBudgetDefaults,
    now = Date.now(),
): MerchantBudgetState {
    const current = existing ?? createDefaultMerchantBudget(merchant, defaults, now);
    const next: MerchantBudgetState = {
        ...current,
        merchant,
    };

    if (typeof update.setLamportsRemaining === 'number') {
        next.sponsoredLamportsRemaining = Math.max(0, Math.trunc(update.setLamportsRemaining));
    }

    if (typeof update.lamportsDelta === 'number') {
        next.sponsoredLamportsRemaining = Math.max(
            0,
            Math.trunc(next.sponsoredLamportsRemaining + update.lamportsDelta)
        );
    }

    if (typeof update.disabled === 'boolean') {
        next.disabled = update.disabled;
    }

    if (update.plan) {
        next.plan = update.plan;
    }

    if (next.lastActionAt === 0) {
        next.lastActionAt = current.lastActionAt;
    }

    return next;
}

export function debitMerchantBudget(
    budget: MerchantBudgetState,
    sponsoredLamports: number,
    now = Date.now(),
): MerchantBudgetState {
    const debit = Math.max(0, Math.trunc(sponsoredLamports));
    return {
        ...budget,
        sponsoredLamportsRemaining: Math.max(0, budget.sponsoredLamportsRemaining - debit),
        lifetimeSponsoredLamports: budget.lifetimeSponsoredLamports + debit,
        lifetimeTransactions: budget.lifetimeTransactions + 1,
        lastActionAt: now,
    };
}

export function merchantBudgetBlockReason(
    budget: MerchantBudgetState,
    sponsoredLamports: number,
): string | null {
    if (budget.disabled) {
        return 'Merchant sponsorship is disabled for this account.';
    }
    const debit = Math.max(0, Math.trunc(sponsoredLamports));
    if (budget.sponsoredLamportsRemaining < debit) {
        return 'Merchant sponsorship budget is exhausted for this action.';
    }
    return null;
}
