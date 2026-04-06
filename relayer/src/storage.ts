import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Client as PgClient } from 'pg';
import { createClient } from 'redis';
import type { MerchantBudgetState, RelayerAction } from '@viral-sync/shared';

export interface RelayPersistenceConfig {
    statePath: string;
    auditLogPath: string;
    auditLogEnabled: boolean;
    redisUrl?: string;
    databaseUrl?: string;
}

export interface RelayPersistence {
    cacheBackend: string;
    auditBackend: string;
    statePath?: string;
    auditLogPath?: string;
    replayEntries: number;
    rateLimitedClients: number;
    merchantBudgetsTracked: number;
    appendAuditLog(event: Record<string, unknown>): Promise<void>;
    checkRateLimit(key: string, windowMs: number, max: number): Promise<boolean>;
    registerReplay(hash: string, replayWindowMs: number): Promise<boolean>;
    getMerchantBudget(merchant: string): Promise<MerchantBudgetState | null>;
    setMerchantBudget(state: MerchantBudgetState): Promise<void>;
    getPausedActions(): Promise<RelayerAction[]>;
    setPausedActions(actions: RelayerAction[]): Promise<void>;
    cleanup(): Promise<void>;
    close(): Promise<void>;
}

interface PersistedRelayState {
    replayProtection: Record<string, number>;
    rateLimitMap: Record<string, number[]>;
    merchantBudgets: Record<string, MerchantBudgetState>;
    pausedActions: RelayerAction[];
}

function ensureParentDir(targetPath: string) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
}

class FileRelayPersistence implements RelayPersistence {
    public readonly cacheBackend = 'file';
    public readonly auditBackend = 'file';
    public readonly statePath: string;
    public readonly auditLogPath: string;

    private readonly auditLogEnabled: boolean;
    private readonly rateLimitMap: Map<string, number[]>;
    private readonly rateLimitedClientsMap: Map<string, number>;
    private readonly replayProtection: Map<string, number>;
    private readonly merchantBudgets: Map<string, MerchantBudgetState>;
    private pausedActions: RelayerAction[];
    private persistTimer: NodeJS.Timeout | null = null;

    constructor(config: RelayPersistenceConfig) {
        this.statePath = config.statePath;
        this.auditLogPath = config.auditLogPath;
        this.auditLogEnabled = config.auditLogEnabled;

        const persistedState = this.loadState();
        this.rateLimitMap = new Map<string, number[]>(
            Object.entries(persistedState.rateLimitMap).map(([key, timestamps]) => [key, timestamps])
        );
        this.rateLimitedClientsMap = new Map<string, number>();
        this.replayProtection = new Map<string, number>(
            Object.entries(persistedState.replayProtection).map(([hash, timestamp]) => [hash, timestamp])
        );
        this.merchantBudgets = new Map<string, MerchantBudgetState>(
            Object.entries(persistedState.merchantBudgets).map(([merchant, budget]) => [merchant, budget])
        );
        this.pausedActions = persistedState.pausedActions;
    }

    get replayEntries(): number {
        return this.replayProtection.size;
    }

    get rateLimitedClients(): number {
        return this.rateLimitedClientsMap.size;
    }

    get merchantBudgetsTracked(): number {
        return this.merchantBudgets.size;
    }

    async appendAuditLog(event: Record<string, unknown>): Promise<void> {
        if (!this.auditLogEnabled) {
            return;
        }

        ensureParentDir(this.auditLogPath);
        fs.appendFileSync(
            this.auditLogPath,
            `${JSON.stringify({ ts: new Date().toISOString(), ...event })}\n`
        );
    }

    async checkRateLimit(key: string, windowMs: number, max: number): Promise<boolean> {
        const now = Date.now();
        const existing = this.rateLimitMap.get(key) || [];
        const recent = existing.filter((timestamp) => now - timestamp < windowMs);
        if (recent.length >= max) {
            this.rateLimitMap.set(key, recent);
            this.rateLimitedClientsMap.set(key, now);
            this.schedulePersist();
            return false;
        }

        recent.push(now);
        this.rateLimitMap.set(key, recent);
        this.schedulePersist();
        return true;
    }

    async registerReplay(hash: string, replayWindowMs: number): Promise<boolean> {
        const now = Date.now();
        const previous = this.replayProtection.get(hash);
        if (previous && now - previous < replayWindowMs) {
            return false;
        }

        this.replayProtection.set(hash, now);
        this.schedulePersist();
        return true;
    }

    async getMerchantBudget(merchant: string): Promise<MerchantBudgetState | null> {
        return this.merchantBudgets.get(merchant) ?? null;
    }

    async setMerchantBudget(state: MerchantBudgetState): Promise<void> {
        this.merchantBudgets.set(state.merchant, state);
        this.schedulePersist();
    }

    async getPausedActions(): Promise<RelayerAction[]> {
        return [...this.pausedActions];
    }

    async setPausedActions(actions: RelayerAction[]): Promise<void> {
        this.pausedActions = [...actions];
        if (this.persistTimer) {
            clearTimeout(this.persistTimer);
            this.persistTimer = null;
        }
        this.persistState();
    }

    async cleanup(): Promise<void> {
        const now = Date.now();
        for (const [key, timestamps] of this.rateLimitMap.entries()) {
            const recent = timestamps.filter((timestamp) => now - timestamp < 60_000);
            if (recent.length === 0) {
                this.rateLimitMap.delete(key);
                this.rateLimitedClientsMap.delete(key);
                continue;
            }
            this.rateLimitMap.set(key, recent);
        }

        for (const [key, timestamp] of this.rateLimitedClientsMap.entries()) {
            if (now - timestamp >= 60_000) {
                this.rateLimitedClientsMap.delete(key);
            }
        }

        for (const [hash, timestamp] of this.replayProtection.entries()) {
            if (now - timestamp >= 5 * 60_000) {
                this.replayProtection.delete(hash);
            }
        }

        this.schedulePersist();
    }

    async close(): Promise<void> {
        if (this.persistTimer) {
            clearTimeout(this.persistTimer);
            this.persistTimer = null;
        }
        this.persistState();
    }

    private loadState(): PersistedRelayState {
        try {
            if (!fs.existsSync(this.statePath)) {
                return { replayProtection: {}, rateLimitMap: {}, merchantBudgets: {}, pausedActions: [] };
            }

            const raw = fs.readFileSync(this.statePath, 'utf8');
            const parsed = JSON.parse(raw) as Partial<PersistedRelayState>;
            return {
                replayProtection: parsed.replayProtection ?? {},
                rateLimitMap: parsed.rateLimitMap ?? {},
                merchantBudgets: parsed.merchantBudgets ?? {},
                pausedActions: parsed.pausedActions ?? [],
            };
        } catch {
            return { replayProtection: {}, rateLimitMap: {}, merchantBudgets: {}, pausedActions: [] };
        }
    }

    private persistState() {
        ensureParentDir(this.statePath);
        const body: PersistedRelayState = {
            replayProtection: Object.fromEntries(this.replayProtection),
            rateLimitMap: Object.fromEntries(this.rateLimitMap),
            merchantBudgets: Object.fromEntries(this.merchantBudgets),
            pausedActions: this.pausedActions,
        };
        fs.writeFileSync(this.statePath, JSON.stringify(body, null, 2));
    }

    private schedulePersist() {
        if (this.persistTimer) {
            return;
        }

        this.persistTimer = setTimeout(() => {
            this.persistTimer = null;
            this.persistState();
        }, 250);
    }
}

type RelayRedisClient = ReturnType<typeof createClient>;

class RedisPgRelayPersistence implements RelayPersistence {
    public readonly cacheBackend = 'redis';
    public readonly auditBackend = 'postgres';
    public readonly statePath: string | undefined;
    public readonly auditLogPath: string | undefined;
    public replayEntries = 0;
    public rateLimitedClients = 0;
    public merchantBudgetsTracked = 0;

    private readonly redis: RelayRedisClient;
    private readonly pg: PgClient;
    private readonly rateLimitedBuckets = new Map<string, number>();

    constructor(redis: RelayRedisClient, pg: PgClient) {
        this.redis = redis;
        this.pg = pg;
    }

    async appendAuditLog(event: Record<string, unknown>): Promise<void> {
        await this.pg.query(
            `insert into relayer_audit_events (event_type, payload)
             values ($1, $2::jsonb)`,
            [String(event.outcome ?? 'event'), JSON.stringify({ ts: new Date().toISOString(), ...event })]
        );
    }

    async checkRateLimit(key: string, windowMs: number, max: number): Promise<boolean> {
        const bucket = Math.floor(Date.now() / windowMs);
        const namespacedKey = `viral-sync:relayer:rate:${hashKey(key)}:${bucket}`;
        const count = await this.redis.incr(namespacedKey);
        await this.redis.pExpire(namespacedKey, Math.max(windowMs * 2, 1_000));
        if (count > max && !this.rateLimitedBuckets.has(namespacedKey)) {
            this.rateLimitedBuckets.set(namespacedKey, Date.now() + Math.max(windowMs * 2, 1_000));
            this.rateLimitedClients = this.rateLimitedBuckets.size;
        }
        return count <= max;
    }

    async registerReplay(hash: string, replayWindowMs: number): Promise<boolean> {
        const result = await this.redis.set(
            `viral-sync:relayer:replay:${hash}`,
            String(Date.now()),
            {
                NX: true,
                PX: replayWindowMs,
            }
        );
        if (result === 'OK') {
            this.replayEntries += 1;
            return true;
        }
        return false;
    }

    async getMerchantBudget(merchant: string): Promise<MerchantBudgetState | null> {
        const raw = await this.redis.get(`viral-sync:relayer:merchant:${merchant}`);
        return raw ? JSON.parse(raw) as MerchantBudgetState : null;
    }

    async setMerchantBudget(state: MerchantBudgetState): Promise<void> {
        const added = await this.redis.sAdd('viral-sync:relayer:merchants', state.merchant);
        if (added > 0) {
            this.merchantBudgetsTracked += 1;
        }
        await this.redis.set(
            `viral-sync:relayer:merchant:${state.merchant}`,
            JSON.stringify(state),
        );
    }

    async getPausedActions(): Promise<RelayerAction[]> {
        const members = await this.redis.sMembers('viral-sync:relayer:paused-actions');
        return members as RelayerAction[];
    }

    async setPausedActions(actions: RelayerAction[]): Promise<void> {
        const key = 'viral-sync:relayer:paused-actions';
        await this.redis.del(key);
        if (actions.length > 0) {
            await this.redis.sAdd(key, actions);
        }
    }

    async cleanup(): Promise<void> {
        const now = Date.now();
        for (const [key, expiresAt] of this.rateLimitedBuckets.entries()) {
            if (expiresAt <= now) {
                this.rateLimitedBuckets.delete(key);
            }
        }
        this.rateLimitedClients = this.rateLimitedBuckets.size;
    }

    async close(): Promise<void> {
        await this.redis.quit();
        await this.pg.end();
    }
}

function hashKey(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
}

export async function createRelayPersistence(
    config: RelayPersistenceConfig
): Promise<RelayPersistence> {
    if (config.redisUrl && config.databaseUrl) {
        const redis = createClient({ url: config.redisUrl });
        const pg = new PgClient({ connectionString: config.databaseUrl });

        await redis.connect();
        await pg.connect();
        await pg.query(`
            create table if not exists relayer_audit_events (
                id bigserial primary key,
                event_type text not null,
                payload jsonb not null,
                created_at timestamptz not null default now()
            )
        `);

        return new RedisPgRelayPersistence(redis, pg);
    }

    return new FileRelayPersistence(config);
}
