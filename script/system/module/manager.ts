/**
 * 版权所有。允许个人和商业使用及修改。
 * 重新分发请严格遵循 GPL-V3.0 协议，且请勿声称原创。
 *
 * 项目  :  Zero Two v0.0.1-alpha
 * 作者  :  Velix
 * 协议  :  GPL-V3.0
 * 源码  :  github.com/vlxyzo/zerotwo
 */

import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { GlobCache, type AdvMap } from '../cache.ts';
import { log } from '#lib/logger.ts';
import { toDbId, type Json, type UserInsert, type UserRow } from './types.ts';

type UserRecord = UserRow<Json>;
type UserPayload = UserInsert<Json>;

interface DatabaseSchema {
	public: {
		Tables: {
			users: {
				Row: UserRecord;
				Insert: UserPayload;
				Update: Partial<Omit<UserPayload, 'telegram_id'>>;
				Relationships: [];
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
}

export interface DatabaseManagerOptions {
	directory?: string;
	usersFile?: string;
	queueFile?: string;
	sweepIntervalMs?: number;
	cacheTtlMs?: number;
	client?: SupabaseClient<DatabaseSchema> | null;
}

export class DatabaseSyncError extends Error {
	public override readonly name = 'DatabaseSyncError';

	public constructor(
		message: string,
		public readonly cause?: unknown
	) {
		super(message, { cause });
	}
}

export class DatabaseConfigurationError extends DatabaseSyncError {
	public override readonly name = 'DatabaseConfigurationError';
}

type FileOperation<T> = () => Promise<T>;

const isRecord = (value: Json): value is Record<string, Json | undefined> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isUserRow = (value: unknown): value is UserRecord => {
	if (!isRecord(value as Json)) return false;
	const row = value as Record<string, Json | undefined>;
	return (
		typeof row.id === 'number' &&
		typeof row.telegram_id === 'number' &&
		(row.username === null || typeof row.username === 'string') &&
		(row.first_name === null || typeof row.first_name === 'string') &&
		(row.last_name === null || typeof row.last_name === 'string') &&
		(row.user_limit === null || typeof row.user_limit === 'number') &&
		(row.warning === null || typeof row.warning === 'number') &&
		(row.is_owner === null || typeof row.is_owner === 'boolean') &&
		(row.is_banned === null || typeof row.is_banned === 'boolean') &&
		(row.info === null || typeof row.info === 'object')
	);
};

const isUserPayload = (value: unknown): value is UserPayload => {
	if (!isRecord(value as Json)) return false;
	const payload = value as Record<string, Json | undefined>;
	return typeof payload.telegram_id === 'number' && Number.isSafeInteger(payload.telegram_id);
};

export class DatabaseManager {
	private static readonly defaultDirectory = join(process.cwd(), 'database', 'activity');
	private readonly client: SupabaseClient<DatabaseSchema> | null;
	private readonly usersFile: string;
	private readonly queueFile: string;
	private readonly cache: AdvMap<number, UserRecord>;
	private readonly sweepIntervalMs: number;
	private fileTail: Promise<void> = Promise.resolve();
	private syncPromise: Promise<void> | null = null;
	private sweepTimer: NodeJS.Timeout | null = null;
	private stopped = false;

	public constructor(options: DatabaseManagerOptions = {}) {
		const directory = options.directory ?? DatabaseManager.defaultDirectory;
		this.usersFile = options.usersFile ?? join(directory, 'users.json');
		this.queueFile = options.queueFile ?? join(directory, 'queue.json');
		this.sweepIntervalMs = options.sweepIntervalMs ?? 30_000;
		this.client =
			options.client === undefined
				? DatabaseManager.createConfiguredClient()
				: options.client;
		this.cache = GlobCache.createCache<number, UserRecord>('users_cache', {
			ttl: options.cacheTtlMs ?? 60_000,
			sweepInterval: Math.min(options.cacheTtlMs ?? 60_000, 60_000),
		});
		this.startSweeper();
	}

	public async getUser(
		telegramId: Parameters<typeof toDbId>[0]
	): Promise<UserRecord | undefined> {
		const key = toDbId(telegramId);
		const cached = this.cache.get(key);
		if (cached) return cached;

		try {
			const client = this.requireClient();
			const { data, error } = await client
				.from('users')
				.select('*')
				.eq('telegram_id', key)
				.maybeSingle();
			if (error) throw error;
			if (data && !isUserRow(data)) {
				throw new DatabaseSyncError('Supabase returned an invalid users row');
			}
			if (data) this.cache.set(key, data);
			return data ?? undefined;
		} catch (error) {
			log.error(`Supabase read failed. Using local users mirror: ${errorMessage(error)}`);
			const users = await this.readUsers();
			const local = users.find(user => user.telegram_id === key);
			if (local) this.cache.set(key, local);
			return local;
		}
	}

	public async upsertUser<TInfo extends Json>(userData: UserInsert<TInfo>): Promise<void> {
		const payload = this.normalizePayload(userData);
		try {
			const client = this.requireClient();
			const { error } = await client.from('users').upsert(payload, {
				onConflict: 'telegram_id',
			});
			if (error) throw error;
		} catch (error) {
			log.error(`Supabase upsert failed. Queueing local update: ${errorMessage(error)}`);
			await this.enqueue(payload);
		}
		await this.updateLocalMirror(payload);
		this.cache.delete(payload.telegram_id);
	}

	public async syncOfflineQueue(): Promise<void> {
		if (this.syncPromise) return this.syncPromise;
		this.syncPromise = this.syncQueue().finally(() => {
			this.syncPromise = null;
		});
		return this.syncPromise;
	}

	public stop(): void {
		this.stopped = true;
		if (this.sweepTimer) clearInterval(this.sweepTimer);
		this.sweepTimer = null;
	}

	private async syncQueue(): Promise<void> {
		const pending = await this.claimQueue();
		if (pending.length === 0) return;
		if (!this.client) {
			await this.restoreQueue(pending);
			return;
		}

		let completed = 0;
		try {
			for (const payload of pending) {
				const { error } = await this.client.from('users').upsert(payload, {
					onConflict: 'telegram_id',
				});
				if (error) throw error;
				completed++;
			}
		} catch (error) {
			await this.restoreQueue(pending.slice(completed));
			throw new DatabaseSyncError('Offline user queue sync failed', error);
		}
	}

	private async claimQueue(): Promise<UserPayload[]> {
		return this.withFileLock(async () => {
			const queue = await this.readQueue();
			if (queue.length > 0) await this.writeJsonAtomic(this.queueFile, []);
			return queue;
		});
	}

	private async restoreQueue(payloads: readonly UserPayload[]): Promise<void> {
		if (payloads.length === 0) return;
		await this.withFileLock(async () => {
			const current = await this.readQueue();
			await this.writeJsonAtomic(this.queueFile, [...payloads, ...current]);
		});
	}

	private async enqueue(payload: UserPayload): Promise<void> {
		await this.withFileLock(async () => {
			const queue = await this.readQueue();
			const next = queue.filter(item => item.telegram_id !== payload.telegram_id);
			next.push(payload);
			await this.writeJsonAtomic(this.queueFile, next);
		});
	}

	private async updateLocalMirror(payload: UserPayload): Promise<void> {
		await this.withFileLock(async () => {
			const users = await this.readUsers();
			const index = users.findIndex(user => user.telegram_id === payload.telegram_id);
			const current = index >= 0 ? users[index] : undefined;
			const merged = this.mergePayload(current, payload);
			if (index >= 0) users[index] = merged;
			else users.push(merged);
			await this.writeJsonAtomic(this.usersFile, users);
		});
	}

	private async readUsers(): Promise<UserRecord[]> {
		return this.readJson(
			this.usersFile,
			value => {
				if (!Array.isArray(value) || !value.every(isUserRow)) {
					throw new DatabaseSyncError(`Invalid local users file: ${this.usersFile}`);
				}
				return value;
			},
			[]
		);
	}

	private async readQueue(): Promise<UserPayload[]> {
		return this.readJson(
			this.queueFile,
			value => {
				if (!Array.isArray(value) || !value.every(isUserPayload)) {
					throw new DatabaseSyncError(`Invalid offline queue file: ${this.queueFile}`);
				}
				return value as UserPayload[];
			},
			[]
		);
	}

	private async readJson<T>(file: string, parse: (value: unknown) => T, empty: T): Promise<T> {
		try {
			return parse(JSON.parse(await fs.readFile(file, 'utf8')));
		} catch (error) {
			if (isMissingFile(error)) return empty;
			if (error instanceof SyntaxError) {
				throw new DatabaseSyncError(`Invalid JSON in ${file}`, error);
			}
			throw error;
		}
	}

	private async writeJsonAtomic(file: string, value: unknown): Promise<void> {
		await fs.mkdir(dirname(file), { recursive: true });
		const temporary = `${file}.tmp`;
		await fs.writeFile(temporary, `${JSON.stringify(value)}\n`, 'utf8');
		await fs.rename(temporary, file);
	}

	private normalizePayload<TInfo extends Json>(payload: UserInsert<TInfo>): UserPayload {
		return {
			...payload,
			telegram_id: toDbId(payload.telegram_id),
			id: payload.id === undefined ? undefined : toDbId(payload.id),
		};
	}

	private mergePayload(current: UserRecord | undefined, payload: UserPayload): UserRecord {
		const merged = { ...current, ...payload };
		return {
			id: merged.id ?? 0,
			telegram_id: merged.telegram_id,
			username: merged.username ?? null,
			first_name: merged.first_name ?? null,
			last_name: merged.last_name ?? null,
			user_limit: merged.user_limit ?? null,
			warning: merged.warning ?? null,
			is_owner: merged.is_owner ?? null,
			is_banned: merged.is_banned ?? null,
			info: merged.info ?? null,
		};
	}

	private requireClient(): SupabaseClient<DatabaseSchema> {
		if (!this.client) {
			throw new DatabaseConfigurationError(
				'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env file'
			);
		}
		return this.client;
	}

	private startSweeper(): void {
		this.sweepTimer = setInterval(() => {
			if (this.stopped) return;
			void this.syncOfflineQueue().catch(error => {
				log.error(`Offline queue sweep failed: ${errorMessage(error)}`);
			});
		}, this.sweepIntervalMs).unref();
	}

	private withFileLock<T>(operation: FileOperation<T>): Promise<T> {
		const previous = this.fileTail;
		let release!: () => void;
		this.fileTail = new Promise<void>(resolve => {
			release = resolve;
		});
		return previous.then(operation).finally(release);
	}

	private static createConfiguredClient(): SupabaseClient<DatabaseSchema> | null {
		const url = process.env.SUPABASE_URL;
		const key = process.env.SUPABASE_ANON_KEY;
		return url && key ? createClient<DatabaseSchema>(url, key) : null;
	}
}

const defaultManager = new DatabaseManager();

export class DbManager {
	public static getUser = defaultManager.getUser.bind(defaultManager);
	public static upsertUser = defaultManager.upsertUser.bind(defaultManager);
	public static syncOfflineQueue = defaultManager.syncOfflineQueue.bind(defaultManager);
	public static stop = defaultManager.stop.bind(defaultManager);
}

function isMissingFile(error: unknown): boolean {
	return (
		typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
	);
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export type { UserPayload, UserRecord };
