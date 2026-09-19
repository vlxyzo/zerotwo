/**
 * 版权所有。允许个人和商业使用及修改。
 * 重新分发请严格遵循 GPL-V3.0 协议，且请勿声称原创。
 *
 * 项目  :  Zero Two v0.0.1-alpha
 * 作者  :  Velix
 * 协议  :  GPL-V3.0
 * 源码  :  github.com/vlxyzo/zerotwo
 */

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
		if (!Number.isInteger(value))
			throw new TypeError(`[toTeleId] Umm, this ${value} is not an integer`);
		return BigInt(value);
	}

	if (/^-?\d+$/.test(value)) return BigInt(value);
	throw new TypeError(`[toTeleId] Umm, this ${value} is not a valid integer id`);
}

export function toDbId(value: TelegramId | IdInput): number {
	const id = typeof value === 'bigint' ? value : toTeleId(value);
	if (id > BigInt(Number.MAX_SAFE_INTEGER) || id < BigInt(Number.MIN_SAFE_INTEGER)) {
		throw new RangeError(`[toDbId] Umm, this ${id} exceeds javascript safe integer range`);
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
	telegram_id: number;
	username?: string | null;
	first_name?: string | null;
	last_name?: string | null;
	user_limit?: number | null;
	warning?: number | null;
	is_owner?: boolean | null;
	is_banned?: boolean | null;
	info?: TInfo | null;
}

export type UserUpdate = Partial<Omit<UserInsert, 'id'>> & { id: TelegramId };

export interface PluginHandler {
	command?: string | string[] | RegExp;
	register?: boolean;
	owner?: boolean;
	admin?: boolean;
	group?: boolean;
	private?: boolean;
	execute?: (ctx: any) => Promise<void> | void;
	[key: string]: any;
}

export interface PluginModule {
	handler?: PluginHandler;
	default?: PluginHandler;
}
