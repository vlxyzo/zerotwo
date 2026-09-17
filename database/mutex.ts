export class AsyncMutex {
  private current: Promise<void> = Promise.resolve();

  public async runExclusive<T>(callback: () => Promise<T> | T): Promise<T> {
    const previous = this.current;
    let release: (() => void) | undefined;

    this.current = new Promise<void>(resolve => {
      release = resolve;
    });

    await previous;
    try {
      return await callback();
    } finally {
      release?.();
    }
  }
}

export class KeyedMutex {
  private readonly locks = new Map<string, Promise<unknown>>();

  public async run<T>(key: string, callback: () => Promise<T> | T): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    const next = previous
      .then(() => callback(), () => callback())
      .finally(() => {
        if (this.locks.get(key) === next) {
          this.locks.delete(key);
        }
      });

    this.locks.set(key, next);
    return await next;
  }
}
