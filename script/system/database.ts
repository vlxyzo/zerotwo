/**
 * 版权所有。允许个人和商业使用及修改。
 * 重新分发请严格遵循 GPL-V3.0 协议，且请勿声称原创。
 *
 * 项目  :  Zero Two v0.0.1-alpha
 * 作者  :  Velix
 * 协议  :  GPL-V3.0
 * 源码  :  github.com/vlxyzo/zerotwo
 */

import { GlobalCache, type AdvancedMap } from './cache.ts';
import { SupabaseAdapter } from './module/supabase.ts';
import { LocalAdapter } from './module/local.ts';
import { toTelegramId } from './module/utils.ts';
import type {
	ChatInsert,
	ChatRow,
	IDatabaseAdapter,
	ProviderName,
	TelegramID,
	TelegramIDInput,
	UserInsert,
	UserRow,
} from './module/types.ts';
import { log } from '#lib/logger.ts';

const USER_CACHE_MAX_SIZE = 2_000;
const USER_CACHE_TTL_MS = 5 * 60_000;
const CHAT_CACHE_MAX_SIZE = 1_000;
const CHAT_CACHE_TTL_MS = 5 * 60_000;
const CACHE_SWEEP_INTERVAL_MS = 60_000;
const MIN_SUPABASE_KEY_LENGTH = 20;

function isNonEmptyString(value: string | undefined): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function isValidHttpUrl(value: string): boolean {
	try {
		const parsed = new URL(value);
		return parsed.protocol === 'https:' || parsed.protocol === 'http:';
	} catch {
		return false;
	}
}

async function createLocalAdapter(): Promise<IDatabaseAdapter> {
	const adapter = new LocalAdapter();
	await adapter.init();
	return adapter;
}

async function createAdapter(): Promise<IDatabaseAdapter> {
	const rawProvider = (process.env.DB_PROVIDER ?? '').trim().toLowerCase();
	if (rawProvider !== 'supabase') {
		return createLocalAdapter();
	}

	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_ANON_KEY;
	const hasValidUrl = isNonEmptyString(url) && isValidHttpUrl(url);
	const hasValidKey = isNonEmptyString(key) && key.trim().length >= MIN_SUPABASE_KEY_LENGTH;
	if (!hasValidUrl || !hasValidKey) {
		log.warning(
			'DB_PROVIDER=supabase tapi SUPABASE_URL/SUPABASE_ANON_KEY tidak ada atau tidak valid. Fallback ke Local Database.'
		);
		return createLocalAdapter();
	}

	const supabaseAdapter = new SupabaseAdapter(url, key);
	try {
		await supabaseAdapter.init();
		return supabaseAdapter;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		log.warning(`Gagal terkoneksi ke Supabase (${message}). Fallback ke Local Database.`);
		return createLocalAdapter();
	}
}

export class Database {
	private static adapter: IDatabaseAdapter | null = null;
	private static connecting: Promise<IDatabaseAdapter> | null = null;
	private static readonly usersCache: AdvancedMap<TelegramID, UserRow> = GlobalCache.createCache<
		TelegramID,
		UserRow
	>('db:users', {
		maxSize: USER_CACHE_MAX_SIZE,
		ttl: USER_CACHE_TTL_MS,
		sweepInterval: CACHE_SWEEP_INTERVAL_MS,
	});

	private static readonly chatsCache: AdvancedMap<TelegramID, ChatRow> = GlobalCache.createCache<
		TelegramID,
		ChatRow
	>('db:chats', {
		maxSize: CHAT_CACHE_MAX_SIZE,
		ttl: CHAT_CACHE_TTL_MS,
		sweepInterval: CACHE_SWEEP_INTERVAL_MS,
	});

	private constructor() {}

	public static async connect(): Promise<IDatabaseAdapter> {
		if (this.adapter) return this.adapter;
		if (this.connecting) return this.connecting;
		this.connecting = createAdapter()
			.then(adapter => {
				this.adapter = adapter;
				log.success(`Database siap. Provider aktif: ${adapter.providerName}`);
				return adapter;
			})
			.finally(() => {
				this.connecting = null;
			});
		return this.connecting;
	}

	/** Menutup koneksi & mengosongkan cache. Panggil ini saat graceful shutdown (SIGINT/SIGTERM). */
	public static async disconnect(): Promise<void> {
		const adapter = this.adapter;
		this.adapter = null;
		this.usersCache.clear();
		this.chatsCache.clear();
		if (!adapter) return;
		try {
			await adapter.disconnect();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			log.error(`Error saat disconnect database: ${message}`);
		}
	}

	public static getProviderName(): ProviderName | 'uninitialized' {
		return this.adapter?.providerName ?? 'uninitialized';
	}

	private static async getAdapter(): Promise<IDatabaseAdapter> {
		return this.adapter ?? this.connect();
	}

	private static parseId(id: TelegramIDInput, context: string): TelegramID | null {
		try {
			return toTelegramId(id);
		} catch {
			log.warning(`${context} dipanggil dengan Telegram ID tidak valid: "${String(id)}"`);
			return null;
		}
	}

	public static async getUser(id: TelegramIDInput): Promise<UserRow | null> {
		const telegramId = this.parseId(id, 'getUser');
		if (telegramId === null) return null;
		const cached = this.usersCache.get(telegramId);
		if (cached) return cached;
		const adapter = await this.getAdapter();
		const user = await adapter.getUser(telegramId);
		if (user) this.usersCache.set(telegramId, user);
		return user;
	}

	/**
	 * Upsert user dengan strategi merge yang aman: `is_banned` dan `created_at`
	 * yang TIDAK diisi eksplisit akan dipertahankan dari state yang sudah
	 * diketahui (cache-first, nyaris tanpa biaya I/O tambahan pada hot-path).
	 * Ini mencegah upsert rutin (mis. dipanggil setiap pesan masuk) secara
	 * diam-diam meng-unban user atau mereset waktu pembuatan akunnya.
	 */
	public static async upsertUser(user: UserInsert): Promise<UserRow | null> {
		const telegramId = this.parseId(user.id, 'upsertUser');
		if (telegramId === null) return null;

		const existing = await this.getUser(telegramId);
		const adapter = await this.getAdapter();
		const result = await adapter.upsertUser({
			id: telegramId,
			first_name: user.first_name,
			username: user.username !== undefined ? user.username : (existing?.username ?? null),
			is_banned:
				user.is_banned !== undefined ? user.is_banned : (existing?.is_banned ?? false),
			created_at: user.created_at ?? existing?.created_at,
		});
		if (result) this.usersCache.set(result.id, result);
		return result;
	}

	public static async banUser(id: TelegramIDInput): Promise<boolean> {
		return this.setBanStatus(id, true);
	}

	public static async unbanUser(id: TelegramIDInput): Promise<boolean> {
		return this.setBanStatus(id, false);
	}

	private static async setBanStatus(id: TelegramIDInput, banned: boolean): Promise<boolean> {
		const telegramId = this.parseId(id, banned ? 'banUser' : 'unbanUser');
		if (telegramId === null) return false;

		const adapter = await this.getAdapter();
		const success = banned
			? await adapter.banUser(telegramId)
			: await adapter.unbanUser(telegramId);
		if (success) {
			const cached = this.usersCache.get(telegramId);
			if (cached) this.usersCache.set(telegramId, { ...cached, is_banned: banned });
		}
		return success;
	}

	public static async getChat(id: TelegramIDInput): Promise<ChatRow | null> {
		const telegramId = this.parseId(id, 'getChat');
		if (telegramId === null) return null;

		const cached = this.chatsCache.get(telegramId);
		if (cached) return cached;

		const adapter = await this.getAdapter();
		const chat = await adapter.getChat(telegramId);
		if (chat) this.chatsCache.set(telegramId, chat);
		return chat;
	}

	public static async upsertChat(chat: ChatInsert): Promise<ChatRow | null> {
		const telegramId = this.parseId(chat.id, 'upsertChat');
		if (telegramId === null) return null;

		const existing = await this.getChat(telegramId);
		const adapter = await this.getAdapter();
		const result = await adapter.upsertChat({
			id: telegramId,
			title: chat.title,
			type: chat.type,
			created_at: chat.created_at ?? existing?.created_at,
		});

		if (result) this.chatsCache.set(result.id, result);
		return result;
	}
}

export type {
	ChatInsert,
	ChatRow,
	ChatType,
	ChatUpdate,
	IDatabaseAdapter,
	ProviderName,
	SupabaseSchema,
	TelegramID,
	TelegramIDInput,
	UserInsert,
	UserRow,
	UserUpdate,
} from './module/types.ts';
