/**
 * 版权所有。允许个人和商业使用及修改。
 * 重新分发请严格遵循 GPL-V3.0 协议，且请勿声称原创。
 *
 * 项目  :  Zero Two v0.0.1-alpha
 * 作者  :  Velix
 * 协议  :  GPL-V3.0
 * 源码  :  github.com/vlxyzo/zerotwo
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '#lib/logger.ts';
import {
	isChatType,
	type ChatInsert,
	type ChatRow,
	type ChatType,
	type IDatabaseAdapter,
	type TelegramID,
	type TelegramIDInput,
	type UserInsert,
	type UserRow,
} from './types.ts';
import { parseWithBigInt, stringifyWithBigInt, toTelegramId } from './utils.ts';

type Collection = 'users' | 'chats';

class KeyedMutex {
	private readonly queue = new Map<string, Promise<unknown>>();
	public run<T>(key: string, task: () => Promise<T>): Promise<T> {
		const previous = this.queue.get(key) ?? Promise.resolve();
		const settled = previous.then(task, task);
		this.queue.set(
			key,
			settled.then(
				() => undefined,
				() => undefined
			)
		);
		return settled;
	}
}

function isNotFoundError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as NodeJS.ErrnoException).code === 'ENOENT'
	);
}

export class LocalAdapter implements IDatabaseAdapter {
	public readonly providerName = 'local' as const;
	private readonly rootPath: string;
	private readonly mutex = new KeyedMutex();

	constructor(rootPath: string = path.resolve(process.cwd(), 'database', 'activity')) {
		this.rootPath = rootPath;
	}

	async init(): Promise<void> {
		try {
			await fs.mkdir(path.join(this.rootPath, 'users'), { recursive: true });
			await fs.mkdir(path.join(this.rootPath, 'chats'), { recursive: true });
			log.success(`Local adapter initialized at ${this.rootPath}`);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			log.error(`Gagal menyiapkan direktori Local Database: ${message}`);
		}
	}

	async disconnect(): Promise<void> {
		log.warning('Local adapter disconnected');
	}

	async getUser(id: TelegramIDInput): Promise<UserRow | null> {
		try {
			const telegramId = toTelegramId(id);
			const record = await this.readRecord('users', telegramId);
			return record ? this.normalizeUser(record) : null;
		} catch (error) {
			this.logCaught('getUser', error);
			return null;
		}
	}

	async upsertUser(user: UserInsert): Promise<UserRow | null> {
		try {
			const telegramId = toTelegramId(user.id);
			const record: UserRow = {
				id: telegramId,
				username: user.username ?? null,
				first_name: user.first_name,
				is_banned: user.is_banned ?? false,
				created_at: user.created_at ?? new Date().toISOString(),
			};
			const ok = await this.writeRecord('users', telegramId, record);
			return ok ? record : null;
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
			const existing = await this.readRecord('users', telegramId);
			if (!existing) {
				log.warning(`${op}: user ${telegramId.toString()} not found in local database`);
				return false;
			}

			const updated: UserRow = { ...this.normalizeUser(existing), is_banned: banned };
			return await this.writeRecord('users', telegramId, updated);
		} catch (error) {
			this.logCaught(op, error);
			return false;
		}
	}

	async getChat(id: TelegramIDInput): Promise<ChatRow | null> {
		try {
			const telegramId = toTelegramId(id);
			const record = await this.readRecord('chats', telegramId);
			return record ? this.normalizeChat(record) : null;
		} catch (error) {
			this.logCaught('getChat', error);
			return null;
		}
	}

	async upsertChat(chat: ChatInsert): Promise<ChatRow | null> {
		try {
			const telegramId = toTelegramId(chat.id);
			const record: ChatRow = {
				id: telegramId,
				title: chat.title,
				type: chat.type,
				created_at: chat.created_at ?? new Date().toISOString(),
			};
			const ok = await this.writeRecord('chats', telegramId, record);
			return ok ? record : null;
		} catch (error) {
			this.logCaught('upsertChat', error);
			return null;
		}
	}

	private filePath(collection: Collection, id: TelegramID): string {
		return path.join(this.rootPath, collection, `${id.toString()}.json`);
	}

	private async readRecord(
		collection: Collection,
		id: TelegramID
	): Promise<Record<string, unknown> | null> {
		try {
			const raw = await fs.readFile(this.filePath(collection, id), 'utf-8');
			return parseWithBigInt<Record<string, unknown>>(raw);
		} catch (error) {
			if (isNotFoundError(error)) return null;
			const message = error instanceof Error ? error.message : String(error);
			log.error(`Failed reading ${collection}/${id.toString()}: ${message}`);
			return null;
		}
	}

	private writeRecord(collection: Collection, id: TelegramID, record: unknown): Promise<boolean> {
		return this.mutex.run(`${collection}:${id.toString()}`, async () => {
			const target = this.filePath(collection, id);
			const tempFile = path.join(
				path.dirname(target),
				`.${id.toString()}.${process.pid}.${Date.now()}.tmp`
			);

			try {
				await fs.writeFile(tempFile, stringifyWithBigInt(record, true), 'utf-8');
				await fs.rename(tempFile, target);
				return true;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				log.error(`Failed writing ${collection}/${id.toString()}: ${message}`);
				await fs.rm(tempFile, { force: true }).catch(() => undefined);
				return false;
			}
		});
	}

	private normalizeUser(record: Record<string, unknown>): UserRow {
		return {
			id: toTelegramId(record.id),
			username: typeof record.username === 'string' ? record.username : null,
			first_name: typeof record.first_name === 'string' ? record.first_name : '',
			is_banned: Boolean(record.is_banned),
			created_at:
				typeof record.created_at === 'string'
					? record.created_at
					: new Date().toISOString(),
		};
	}

	private normalizeChat(record: Record<string, unknown>): ChatRow {
		const rawType = typeof record.type === 'string' ? record.type : 'private';
		const type: ChatType = isChatType(rawType) ? rawType : 'private';

		return {
			id: toTelegramId(record.id),
			title: typeof record.title === 'string' ? record.title : '',
			type,
			created_at:
				typeof record.created_at === 'string'
					? record.created_at
					: new Date().toISOString(),
		};
	}

	private logCaught(operation: string, error: unknown): void {
		const message = error instanceof Error ? error.message : String(error);
		log.error(`[Local:${operation}] Exception: ${message}`);
	}
}
