import { DatabaseError } from './errors.ts';

export type CacheKey = string | number | symbol;

export interface LRUCacheOptions<V> {
  maxSize: number;
  ttlMs?: number;
  onEvict?: (key: CacheKey, value: V) => void;
}

export class LRUCache<K extends CacheKey, V> {
  private readonly map = new Map<K, { value: V; expiresAt: number | null }>();
  private readonly maxSize: number;
  private readonly ttlMs: number | null;
  private readonly onEvict?: (key: K, value: V) => void;

  constructor(options: LRUCacheOptions<V>) {
    this.maxSize = Math.max(1, options.maxSize);
    this.ttlMs = options.ttlMs ?? null;
    this.onEvict = options.onEvict;
  }

  public size(): number {
    return this.map.size;
  }

  public has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  public get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.delete(key);
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  public set(key: K, value: V, ttlMs = this.ttlMs): this {
    const expiresAt = ttlMs === null || ttlMs === undefined ? null : Date.now() + ttlMs;
    if (this.map.has(key)) {
      this.map.delete(key);
    }
    while (this.map.size >= this.maxSize) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey === undefined) break;
      this.evict(oldestKey);
    }
    this.map.set(key, { value, expiresAt });
    return this;
  }

  public delete(key: K): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;
    this.map.delete(key);
    this.onEvict?.(key, entry.value);
    return true;
  }

  public clear(): void {
    for (const [key, entry] of this.map.entries()) {
      this.onEvict?.(key, entry.value);
    }
    this.map.clear();
  }

  public keys(): IterableIterator<K> {
    return this.map.keys();
  }

  public values(): IterableIterator<V> {
    return Array.from(this.map.values(), entry => entry.value)[Symbol.iterator]();
  }

  public entries(): IterableIterator<[K, V]> {
    return (function* (source: Map<K, { value: V; expiresAt: number | null }>) {
      for (const [key, entry] of source.entries()) {
        if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
          source.delete(key);
          continue;
        }
        yield [key, entry.value] as [K, V];
      }
    })(this.map);
  }

  public snapshot(): Map<K, V> {
    const snapshot = new Map<K, V>();
    for (const [key, entry] of this.map.entries()) {
      if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
        this.delete(key);
        continue;
      }
      snapshot.set(key, entry.value);
    }
    return snapshot;
  }

  public pruneExpired(): number {
    let removed = 0;
    for (const [key, entry] of this.map.entries()) {
      if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
        this.evict(key);
        removed += 1;
      }
    }
    return removed;
  }

  public assertCapacity(): void {
    const heapUsed = process.memoryUsage().heapUsed;
    const limit = 512 * 1024 * 1024;
    if (heapUsed > limit) {
      const evicted = this.pruneExpired();
      if (evicted === 0 && this.map.size > 1) {
        const oldestKey = this.map.keys().next().value;
        if (oldestKey !== undefined) {
          this.evict(oldestKey);
        }
      }
    }
  }

  private evict(key: K): void {
    const entry = this.map.get(key);
    if (!entry) return;
    this.map.delete(key);
    this.onEvict?.(key, entry.value);
  }
}

export const createLRUCache = <K extends CacheKey, V>(
  maxSize: number,
  ttlMs?: number,
  onEvict?: (key: K, value: V) => void,
): LRUCache<K, V> => new LRUCache({ maxSize, ttlMs, onEvict });

export const cacheRead = <K extends CacheKey, V>(cache: LRUCache<K, V>, key: K): V => {
  const value = cache.get(key);
  if (value === undefined) {
    throw new DatabaseError(`Cache miss for key ${String(key)}`, { code: 'CACHE_MISS' });
  }
  return value;
};
