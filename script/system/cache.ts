/**
 * 版权所有。允许个人和商业使用及修改。
 * 重新分发请严格遵循 GPL-V3.0 协议，且请勿声称原创。
 *
 * 项目  :  Zero Two v0.0.1-alpha
 * 作者  :  Velix
 * 协议  :  GPL-V3.0
 * 源码  :  github.com/vlxyzo/zerotwo
 */

import { log } from '#lib/logger.ts';

export type EvictionReason = 'MAX_SIZE_REACHED' | 'TTL_EXPIRED' | 'SWEEP_CLEANUP' | 'MANUAL';

export interface CacheOptions<K, V> {
	maxSize?: number;
	ttl?: number;
	sweepInterval?: number;
	name?: string;
	onEvict?: (key: K, value: V, reason: EvictionReason) => void;
}

export interface CacheStats {
	size: number;
	maxSize: number | 'Unlimited';
	ttl: number | 'No expiration';
}

export class AdvancedMap<K, V> extends Map<K, V> {
	public readonly maxSize: number;
	public readonly ttl: number;
	public readonly name: string;
	public readonly sweepInterval: number;
	public readonly onEvict: ((key: K, value: V, reason: EvictionReason) => void) | null;
	private readonly timestamps = new Map<K, number>();
	private _sweepTimer: NodeJS.Timeout | null = null;

	constructor(options: CacheOptions<K, V> = {}) {
		super();
		this.maxSize = options.maxSize ?? 0;
		this.ttl = options.ttl ?? 0;
		this.name = options.name ?? 'UnnamedCache';
		this.sweepInterval = options.sweepInterval ?? 60_000;
		this.onEvict = options.onEvict ?? null;

		if (this.ttl > 0) {
			this._startSweeper();
		}
	}

	public override set(key: K, value: V): this {
		if (this.has(key)) {
			super.delete(key);
			this.timestamps.delete(key);
		} else if (this.maxSize > 0 && this.size >= this.maxSize) {
			const oldestKey = this.keys().next().value;
			if (oldestKey !== undefined) {
				this._evict(oldestKey, 'MAX_SIZE_REACHED');
			}
		}

		this.timestamps.set(key, Date.now());
		return super.set(key, value);
	}

	public override get(key: K): V | undefined {
		if (!this.has(key)) return undefined;
		if (this.ttl > 0) {
			const timeAdded = this.timestamps.get(key);
			if (timeAdded !== undefined && Date.now() - timeAdded > this.ttl) {
				this._evict(key, 'TTL_EXPIRED');
				return undefined;
			}
		}

		return super.get(key);
	}

	public override delete(key: K): boolean {
		this.timestamps.delete(key);
		return super.delete(key);
	}

	public override clear(): void {
		this.timestamps.clear();
		super.clear();
	}

	public destroy(): void {
		if (this._sweepTimer) {
			clearInterval(this._sweepTimer);
			this._sweepTimer = null;
		}
		this.clear();
	}

	private _evict(key: K, reason: EvictionReason = 'MANUAL'): void {
		const value = super.get(key);
		this.delete(key);

		if (value !== undefined && typeof this.onEvict === 'function') {
			try {
				this.onEvict(key, value, reason);
			} catch (e) {
				const errorMsg = e instanceof Error ? e.message : String(e);
				log.error(`Cache ${this.name} error during eviction callback: ${errorMsg}`);
			}
		}
	}

	private _startSweeper(): void {
		this._sweepTimer = setInterval(() => {
			const now = Date.now();
			let sweepCount = 0;

			for (const [key, timeAdded] of this.timestamps.entries()) {
				if (now - timeAdded > this.ttl) {
					this._evict(key, 'SWEEP_CLEANUP');
					sweepCount++;
				}
			}

			if (sweepCount > 0) {
				log.info(`${this.name} swept ${sweepCount} expired items`);
			}
		}, this.sweepInterval).unref();
	}
}

class CacheManager {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private readonly caches = new Map<string, AdvancedMap<any, any>>();

	public createCache<K, V>(name: string, options: CacheOptions<K, V> = {}): AdvancedMap<K, V> {
		if (this.caches.has(name)) {
			return this.caches.get(name) as AdvancedMap<K, V>;
		}

		options.name = name;
		const cache = new AdvancedMap<K, V>(options);
		this.caches.set(name, cache);
		return cache;
	}

	public getCache<K, V>(name: string): AdvancedMap<K, V> | undefined {
		return this.caches.get(name) as AdvancedMap<K, V> | undefined;
	}

	public clearAllCaches(): void {
		let total = 0;
		for (const cache of this.caches.values()) {
			total += cache.size;
			cache.clear();
		}

		log.success(`Cleared ${total} total items across all caches`);
	}

	public destroyAll(): void {
		for (const cache of this.caches.values()) {
			cache.destroy();
		}

		this.caches.clear();
	}

	public getStats(): Record<string, CacheStats> {
		const stats: Record<string, CacheStats> = {};
		for (const [name, cache] of this.caches.entries()) {
			stats[name] = {
				size: cache.size,
				maxSize: cache.maxSize || 'Unlimited',
				ttl: cache.ttl || 'No expiration',
			};
		}

		return stats;
	}
}

export const GlobalCache = new CacheManager();
