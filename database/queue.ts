export interface EnqueueOptions {
  flushOnThreshold?: boolean;
}

export interface BatchJob<T> {
  key: string;
  payload: T;
}

export class BatchQueue<T> {
  private readonly queue = new Map<string, T>();
  private readonly maxBatchSize: number;
  private readonly flushIntervalMs: number;
  private readonly onFlush: (batch: Array<BatchJob<T>>) => Promise<void> | void;
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(options: {
    maxBatchSize: number;
    flushIntervalMs: number;
    onFlush: (batch: Array<BatchJob<T>>) => Promise<void> | void;
  }) {
    this.maxBatchSize = Math.max(1, options.maxBatchSize);
    this.flushIntervalMs = Math.max(250, options.flushIntervalMs);
    this.onFlush = options.onFlush;
  }

  public enqueue(key: string, payload: T, options: EnqueueOptions = {}): void {
    this.queue.set(key, payload);
    if (options.flushOnThreshold ?? true) {
      if (this.queue.size >= this.maxBatchSize) {
        void this.flush();
      }
    }
    if (this.timer === null) {
      this.timer = setInterval(() => {
        void this.flush();
      }, this.flushIntervalMs);
    }
  }

  public async flush(): Promise<void> {
    if (this.running) return;
    const pending = Array.from(this.queue.entries()).map(([key, payload]) => ({ key, payload }));
    if (pending.length === 0) return;

    this.running = true;
    try {
      this.queue.clear();
      if (this.timer !== null) {
        clearInterval(this.timer);
        this.timer = null;
      }
      await this.onFlush(pending);
    } finally {
      this.running = false;
      if (this.queue.size > 0 && this.timer === null) {
        this.timer = setInterval(() => {
          void this.flush();
        }, this.flushIntervalMs);
      }
    }
  }

  public async drain(): Promise<void> {
    await this.flush();
  }

  public stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public size(): number {
    return this.queue.size;
  }
}

export const debounce = <T extends (...args: Array<unknown>) => Promise<void> | void>(
  fn: T,
  waitMs: number,
): ((...args: Parameters<T>) => void) => {
  let timer: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      void fn(...args);
    }, waitMs);
  };
};
