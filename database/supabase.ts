import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js';
import { DatabaseConnectionError, DatabaseError } from './errors.ts';
import { UserRecord, UserSchema } from './types.ts';

const retryableStatusCodes = new Set([429, 500, 502, 503, 504]);

export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private openUntil = 0;

  constructor(
    private readonly threshold = 5,
    private readonly openWindowMs = 15_000,
    private readonly halfOpenRetries = 2,
  ) {}

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open' && Date.now() < this.openUntil) {
      throw new DatabaseConnectionError('Supabase circuit breaker is open', undefined);
    }

    if (this.state === 'open' && Date.now() >= this.openUntil) {
      this.state = 'half-open';
    }

    try {
      const value = await operation();
      this.reset();
      return value;
    } catch (error) {
      this.failureCount += 1;
      if (this.failureCount >= this.threshold) {
        this.state = 'open';
        this.openUntil = Date.now() + this.openWindowMs;
      }
      throw error;
    }
  }

  public reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.openUntil = 0;
  }
}

export class SupabaseDatabase {
  private readonly client: SupabaseClient;
  private readonly breaker = new CircuitBreaker();

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: 'public' },
      global: { headers: { 'X-Client-Info': 'zerotwo-db-manager' } },
    });
  }

  public async connect(): Promise<void> {
    const { error } = await this.client.from('users').select('telegramID').limit(1);
    if (error) {
      throw new DatabaseConnectionError(`Supabase ping failed: ${error.message}`, error);
    }
  }

  public async getUserByTelegramId(telegramID: number): Promise<UserRecord | null> {
    const { data, error } = await this.breaker.execute(async () =>
      this.client.from('users').select('*').eq('telegramID', telegramID).maybeSingle(),
    );

    if (error) {
      throw new DatabaseConnectionError(`Failed to fetch telegramID ${telegramID}`, error);
    }

    if (!data) return null;
    return UserSchema.parse(data);
  }

  public async upsertUser(user: UserRecord): Promise<UserRecord> {
    const next = UserSchema.parse(user);
    const { data, error } = await this.breaker.execute(async () =>
      this.client.from('users').upsert(next, { onConflict: 'telegramID' }).select().single(),
    );

    if (error || !data) {
      throw new DatabaseConnectionError(`Upsert failed for telegramID ${next.telegramID}`, error ?? undefined);
    }
    return UserSchema.parse(data);
  }

  public async bulkUpsertUsers(users: Array<UserRecord>): Promise<Array<UserRecord>> {
    if (users.length === 0) return [];
    const safeUsers = users.map(user => UserSchema.parse(user));
    const { data, error } = await this.breaker.execute(async () =>
      this.client.from('users').upsert(safeUsers, { onConflict: 'telegramID' }).select(),
    );

    if (error) {
      throw new DatabaseConnectionError('Bulk upsert failed', error);
    }

    const rows = Array.isArray(data) ? data : [];
    return rows.map(row => UserSchema.parse(row));
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.connect();
      return true;
    } catch {
      return false;
    }
  }

  public shouldRetry(error: unknown): boolean {
    if (error instanceof DatabaseError) {
      return true;
    }
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const status = Number((error as { status?: number }).status ?? 0);
      return retryableStatusCodes.has(status);
    }
    return false;
  }
}

export const createSupabaseDatabase = (url: string, anonKey: string): SupabaseDatabase => new SupabaseDatabase(url, anonKey);
