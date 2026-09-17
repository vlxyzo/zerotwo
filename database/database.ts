import { BatchQueue } from './queue.ts';
import { LRUCache } from './cache.ts';
import { DatabaseConnectionError, DatabaseError } from './errors.ts';
import { LocalDatabase } from './local.ts';
import { AsyncMutex } from './mutex.ts';
import { SupabaseDatabase, createSupabaseDatabase } from './supabase.ts';
import { normalizeTelegramId, type DeepPartial, type TelegramIdInput, type UserRecord, UserSchema } from './types.ts';

export type DatabaseUserInput = Omit<UserRecord, 'id'> & { id?: number; telegramID: number };

export interface DatabaseManagerOptions {
  localPath?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  cacheSize?: number;
  ttlMs?: number;
  flushIntervalMs?: number;
  maxBatchSize?: number;
}

export class DatabaseManager {
  private readonly local: LocalDatabase;
  private readonly supabase?: SupabaseDatabase;
  private readonly cache: LRUCache<number, UserRecord>;
  private readonly mutex = new AsyncMutex();
  private readonly queue: BatchQueue<UserRecord>;
  private initialized = false;

  constructor(options: DatabaseManagerOptions = {}) {
    this.local = new LocalDatabase(options.localPath ?? undefined);
    this.cache = new LRUCache<number, UserRecord>({
      maxSize: options.cacheSize ?? 10_000,
      ttlMs: options.ttlMs ?? 5 * 60 * 1000,
    });

    if (options.supabaseUrl && options.supabaseKey) {
      this.supabase = createSupabaseDatabase(options.supabaseUrl, options.supabaseKey);
    }

    this.queue = new BatchQueue<UserRecord>({
      maxBatchSize: options.maxBatchSize ?? 32,
      flushIntervalMs: options.flushIntervalMs ?? 5_000,
      onFlush: async batch => {
        const records = batch.map(item => item.payload);
        await this.local.replaceAll(Array.from(this.cache.snapshot().values()).concat(records));
        if (this.supabase) {
          await this.supabase.bulkUpsertUsers(records);
        }
      },
    });
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    await this.local.ensureReady();
    const hydrated = await this.local.hydrate();
    for (const user of hydrated.values()) {
      this.cache.set(user.telegramID, user);
    }

    if (this.supabase) {
      try {
        await this.supabase.connect();
      } catch (error) {
        const cause = error instanceof Error ? error.message : String(error);
        console.warn(`Supabase unavailable during init: ${cause}`);
      }
    }

    this.initialized = true;
  }

  public async getUser(input: TelegramIdInput): Promise<UserRecord | null> {
    const telegramID = Number(normalizeTelegramId(input));
    await this.init();

    const cached = this.cache.get(telegramID);
    if (cached) {
      return cached;
    }

    if (this.supabase) {
      try {
        const remote = await this.supabase.getUserByTelegramId(telegramID);
        if (remote) {
          this.cache.set(telegramID, remote);
          return remote;
        }
      } catch (error) {
        const cause = error instanceof Error ? error.message : String(error);
        console.warn(`getUser fallback: ${cause}`);
      }
    }

    return this.local.getUser(telegramID);
  }

  public async upsertUser(input: DeepPartial<UserRecord> & { telegramID: number }): Promise<UserRecord> {
    const normalized = UserSchema.parse({
      id: input.id ?? 0,
      telegramID: input.telegramID,
      username: input.username ?? null,
      first_name: input.first_name ?? '',
      last_name: input.last_name ?? '',
      limit: input.limit ?? 10,
      warning: input.warning ?? 0,
      isOwner: input.isOwner ?? false,
      isBanned: input.isBanned ?? false,
      info: input.info ?? {
        isRegistered: true,
        dateRegister: new Date().toISOString(),
        snKey: 0,
        isFollowingCh: false,
        isNines: { nines: false, expired: new Date(0).toISOString() },
        isAfk: { afk: false, since: new Date(0).toISOString(), reason: '' },
        languageDefault: 'en',
      },
    });

    return this.mutex.runExclusive(async () => {
      await this.init();
      this.cache.set(normalized.telegramID, normalized);
      this.queue.enqueue(String(normalized.telegramID), normalized, { flushOnThreshold: true });

      try {
        if (this.supabase) {
          await this.supabase.upsertUser(normalized);
        }
      } catch (error) {
        throw new DatabaseConnectionError(`Supabase write failed for telegramID ${normalized.telegramID}`, error);
      }

      await this.local.upsertUser(normalized);
      return normalized;
    });
  }

  public async flush(): Promise<void> {
    await this.queue.flush();
    const current = Array.from(this.cache.snapshot().values());
    await this.local.replaceAll(current);
  }

  public async shutdown(): Promise<void> {
    this.queue.stop();
    await this.flush();
  }
}

export const databaseManager = new DatabaseManager();
export default databaseManager;
