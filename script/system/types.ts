/**
 * 版权所有。允许个人和商业使用及修改。
 * 重新分发请严格遵循 GPL-V3.0 协议，且请勿声称原创。
 *
 * 项目  :  Zero Two v0.0.1-alpha
 * 作者  :  Velix
 * 协议  :  GPL-V3.0
 * 源码  :  github.com/vlxyzo/zerotwo
 */

import type { Context } from 'telegraf';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type TelegramId = bigint;
export type IdInput = bigint | number | string;
export type ChatType = 'private' | 'group' | 'supergroup' | 'channel';
const valid_types: readonly ChatType[] = ['private', 'group', 'supergroup', 'channel'];

export function isChat(value: string): value is ChatType {
	return (valid_types as readonly string[]).includes(value);
}

export function toTeleId(value: IdInput): TelegramId {
	if (typeof value === 'bigint') return value;
	if (typeof value === 'number') {
		if (!Number.isInteger(value)) {
			throw new TypeError(`[toTeleId] Provided number ${value} is not an integer`);
		}
		return BigInt(value);
	}

	if (typeof value === 'string' && /^-?\d+$/.test(value)) {
		return BigInt(value);
	}

	throw new TypeError(
		`[toTeleId] Provided value ${value} is not a valid integer string or number`
	);
}

export function toDbId(value: TelegramId | IdInput): number {
	const id = typeof value === 'bigint' ? value : toTeleId(value);

	if (id > BigInt(Number.MAX_SAFE_INTEGER) || id < BigInt(Number.MIN_SAFE_INTEGER)) {
		throw new RangeError(
			`[toDbId] ID ${id} exceeds JavaScript safe integer range (${Number.MAX_SAFE_INTEGER})`
		);
	}

	return Number(id);
}

export interface UserRow<TInfo extends Json = Json> {
	id: number;
	telegram_id: number;
	username: string | null;
	first_name: string | null;
	last_name: string | null;
	user_limit: number | null;
	warning: number | null;
	is_owner: boolean | null;
	is_banned: boolean | null;
	info: TInfo | null;
}

export interface UserInsert<TInfo extends Json = Json> {
	id?: number;
	telegram_id: number | bigint;
	username?: string | null;
	first_name?: string | null;
	last_name?: string | null;
	user_limit?: number | null;
	warning?: number | null;
	is_owner?: boolean | null;
	is_banned?: boolean | null;
	info?: TInfo | null;
}

export type UserUpdate = Partial<Omit<UserInsert, 'id' | 'telegram_id'>> & {
	telegram_id: number | bigint;
};

export interface PluginHandler<C extends Context = Context> {
	command?: string | string[] | RegExp;
	register?: boolean;
	owner?: boolean;
	admin?: boolean;
	group?: boolean;
	private?: boolean;
	execute?: (ctx: C) => Promise<void> | void;
	[key: string]: unknown;
}

export interface PluginModule<C extends Context = Context> {
	handler?: PluginHandler<C>;
	default?: PluginHandler<C>;
}
