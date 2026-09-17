/**
 * 版权所有。允许个人和商业使用及修改。
 * 重新分发请严格遵循 GPL-V3.0 协议，且请勿声称原创。
 *
 * 项目  :  Zero Two v0.0.1-alpha
 * 作者  :  Velix
 * 协议  :  GPL-V3.0
 * 源码  :  github.com/vlxyzo/zerotwo
 */

import { createClient, type SupabaseClient, type PostgrestError } from '@supabase/supabase-js';
import { log } from '#lib/logger.ts';
import {
	isChatType,
	type ChatInsert,
	type ChatRow,
	type IDatabaseAdapter,
	type SupabaseSchema,
	type TelegramIDInput,
	type UserInsert,
	type UserRow,
} from './types.ts';
import { toTelegramId, withRetry } from './utils.ts';

type SupabaseUserRow = SupabaseSchema['public']['Tables']['users']['Row'];
type SupabaseChatRow = SupabaseSchema['public']['Tables']['chats']['Row'];

export class SupabaseAdapter implements IDatabaseAdapter {
	public readonly providerName = 'supabase' as const;
	private readonly client: SupabaseClient<SupabaseSchema>;
	constructor(url: string, anonKey: string) {
		this.client = createClient<SupabaseSchema>(url, anonKey, {
			auth: { persistSession: false, autoRefreshToken: false },
			db: { schema: 'public' },
			global: { headers: { 'X-Client-Info': 'zerotwo-bot' } },
		});
	}

	async init(): Promise<void> {
		const { error } = await this.client.from('users').select('id').limit(1);
		if (error) {
			throw new Error(
				`Failed to check supabase connectivity [${error.code}]: ${error.message}`
			);
		}
		log.success('Supabase adapter initialized and reachable');
	}

	async disconnect(): Promise<void> {
		try {
			await this.client.removeAllChannels();
		} finally {
			log.warning('Supabase adapter has disconnected');
		}
	}

	async getUser(id: TelegramIDInput): Promise<UserRow | null> {
		try {
			const telegramId = toTelegramId(id);
			const { data, error } = await withRetry(() =>
				this.client.from('users').select('*').eq('id', telegramId.toString()).maybeSingle()
			);

			if (error) {
				this.logDbError('getUser', error);
				return null;
			}
			return data ? this.normalizeUser(data) : null;
		} catch (error) {
			this.logCaught('getUser', error);
			return null;
		}
	}

	async upsertUser(user: UserInsert): Promise<UserRow | null> {
		try {
			const telegramId = toTelegramId(user.id);
			const payload: SupabaseSchema['public']['Tables']['users']['Insert'] = {
				id: telegramId.toString(),
				first_name: user.first_name,
				username: user.username ?? null,
				is_banned: user.is_banned ?? false,
				created_at: user.created_at ?? new Date().toISOString(),
			};

			const { data, error } = await withRetry(() =>
				this.client.from('users').upsert(payload, { onConflict: 'id' }).select().single()
			);

			if (error || !data) {
				this.logDbError('upsertUser', error);
				return null;
			}
			return this.normalizeUser(data);
		} catch (error) {
			this.logCaught('upsertUser', error);
			return null;
		}
	}

	async banUser(id: TelegramIDInput): Promise<boolean> {
		return this.setBanned(id, true);
	}

	async unbanUser(id: TelegramIDInput): Promise<boolean> {
		return this.setBanned(id, false);
	}

	private async setBanned(id: TelegramIDInput, banned: boolean): Promise<boolean> {
		const op = banned ? 'banUser' : 'unbanUser';
		try {
			const telegramId = toTelegramId(id);
			const { data, error } = await withRetry(() =>
				this.client
					.from('users')
					.update({ is_banned: banned })
					.eq('id', telegramId.toString())
					.select('id')
					.maybeSingle()
			);

			if (error) {
				this.logDbError(op, error);
				return false;
			}

			if (!data) {
				log.warning(`${op}: user ${telegramId.toString()} not found in supabase`);
				return false;
			}

			return true;
		} catch (error) {
			this.logCaught(op, error);
			return false;
		}
	}

	async getChat(id: TelegramIDInput): Promise<ChatRow | null> {
		try {
			const telegramId = toTelegramId(id);
			const { data, error } = await withRetry(() =>
				this.client.from('chats').select('*').eq('id', telegramId.toString()).maybeSingle()
			);

			if (error) {
				this.logDbError('getChat', error);
				return null;
			}
			return data ? this.normalizeChat(data) : null;
		} catch (error) {
			this.logCaught('getChat', error);
			return null;
		}
	}

	async upsertChat(chat: ChatInsert): Promise<ChatRow | null> {
		try {
			const telegramId = toTelegramId(chat.id);
			const payload: SupabaseSchema['public']['Tables']['chats']['Insert'] = {
				id: telegramId.toString(),
				title: chat.title,
				type: chat.type,
				created_at: chat.created_at ?? new Date().toISOString(),
			};

			const { data, error } = await withRetry(() =>
				this.client.from('chats').upsert(payload, { onConflict: 'id' }).select().single()
			);

			if (error || !data) {
				this.logDbError('upsertChat', error);
				return null;
			}
			return this.normalizeChat(data);
		} catch (error) {
			this.logCaught('upsertChat', error);
			return null;
		}
	}

	private normalizeUser(row: SupabaseUserRow): UserRow {
		return {
			id: toTelegramId(row.id),
			username: row.username,
			first_name: row.first_name,
			is_banned: row.is_banned,
			created_at: row.created_at,
		};
	}

	private normalizeChat(row: SupabaseChatRow): ChatRow {
		return {
			id: toTelegramId(row.id),
			title: row.title,
			type: isChatType(row.type) ? row.type : 'private',
			created_at: row.created_at,
		};
	}

	private logDbError(operation: string, error: PostgrestError | null): void {
		if (!error) return;
		log.error(`[Supabase:${operation}] ${error.code || 'UNKNOWN'} - ${error.message}`);
	}

	private logCaught(operation: string, error: unknown): void {
		const message = error instanceof Error ? error.message : String(error);
		log.error(`[Supabase:${operation}] Exception: ${message}`);
	}
}
