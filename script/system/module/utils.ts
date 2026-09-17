/**
 * 版权所有。允许个人和商业使用及修改。
 * 重新分发请严格遵循 GPL-V3.0 协议，且请勿声称原创。
 *
 * 项目  :  Zero Two v0.0.1-alpha
 * 作者  :  Velix
 * 协议  :  GPL-V3.0
 * 源码  :  github.com/vlxyzo/zerotwo
 */

import type { TelegramID, TelegramIDInput } from './types.ts';

export function isTelegramIdInput(value: unknown): value is TelegramIDInput {
	return typeof value === 'bigint' || typeof value === 'number' || typeof value === 'string';
}

export function toTelegramId(value: unknown): TelegramID {
	if (!isTelegramIdInput(value)) {
		throw new TypeError(`Unsupported Telegram ID type: ${typeof value}`);
	}

	if (typeof value === 'bigint') return value;
	if (typeof value === 'number') {
		if (!Number.isFinite(value) || !Number.isInteger(value)) {
			throw new TypeError(`Invalid Telegram ID value (a number): ${value}`);
		}

		return BigInt(value);
	}

	const trimmed = value.trim();
	if (!/^-?\d+$/.test(trimmed)) {
		throw new TypeError(`Invalid Telegram ID value (a string): ${value}`);
	}

	try {
		return BigInt(trimmed);
	} catch {
		throw new TypeError(`Failed to parse Telegram ID (a string) to BigInt: ${value}`);
	}
}

const BIGINT_TAG = '\u0000bigint:';
export function bigintSafeReplacer(_key: string, value: unknown): unknown {
	return typeof value === 'bigint' ? `${BIGINT_TAG}${value.toString()}` : value;
}

export function bigintSafeReviver(_key: string, value: unknown): unknown {
	if (typeof value === 'string' && value.startsWith(BIGINT_TAG)) {
		return BigInt(value.slice(BIGINT_TAG.length));
	}
	return value;
}
// TypeError: Do not know how to serialize a BigInt
export function stringifyWithBigInt(data: unknown, pretty = false): string {
	return JSON.stringify(data, bigintSafeReplacer, pretty ? 2 : undefined);
}

export function parseWithBigInt<T>(text: string): T {
	return JSON.parse(text, bigintSafeReviver) as T;
}

export interface RetryOptions {
	retries?: number;
	baseDelayMs?: number;
	factor?: number;
	isRetryable?: (error: unknown) => boolean;
}

const TRANSIENT_ERROR_PATTERN =
	/ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|EPIPE|network|fetch failed|timeout|socket hang up/i;
export function isTransientError(error: unknown): boolean {
	if (error instanceof Error) {
		return (
			TRANSIENT_ERROR_PATTERN.test(error.message) || TRANSIENT_ERROR_PATTERN.test(error.name)
		);
	}
	return false;
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withRetry<T>(
	operation: () => T | PromiseLike<T>,
	options: RetryOptions = {}
): Promise<T> {
	const { retries = 2, baseDelayMs = 250, factor = 2, isRetryable = isTransientError } = options;
	let attempt = 0;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let lastError: unknown;
	while (attempt <= retries) {
		try {
			return await operation();
		} catch (error) {
			lastError = error;
			if (attempt === retries || !isRetryable(error)) {
				throw error;
			}
			await sleep(baseDelayMs * factor ** attempt);
			attempt++;
		}
	}
	// is still provided ts knows this function alwys resolves/rejects
	throw lastError;
}
