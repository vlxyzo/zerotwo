export class DatabaseError extends Error {
  public readonly code: string;
  public readonly cause?: unknown;
  public readonly context?: Record<string, string | number | boolean | null>;

  constructor(message: string, options?: { code?: string; cause?: unknown; context?: Record<string, string | number | boolean | null> }) {
    super(message);
    this.name = new.target.name;
    this.code = options?.code ?? 'DATABASE_ERROR';
    this.cause = options?.cause;
    this.context = options?.context;
  }
}

export class DatabaseConnectionError extends DatabaseError {
  constructor(message: string, cause?: unknown) {
    super(message, { code: 'DB_CONNECTION_ERROR', cause });
  }
}

export class CacheMissError extends DatabaseError {
  constructor(key: string) {
    super(`Cache miss for key: ${key}`, { code: 'CACHE_MISS' });
  }
}

export class SchemaValidationError extends DatabaseError {
  constructor(schemaName: string, value: unknown, cause?: unknown) {
    super(`Schema validation failed for ${schemaName}`, {
      code: 'SCHEMA_VALIDATION_ERROR',
      cause,
      context: { schemaName, valueType: typeof value },
    });
  }
}

export class LocalFileError extends DatabaseError {
  constructor(path: string, cause?: unknown) {
    super(`Local persistence failed for ${path}`, {
      code: 'LOCAL_FILE_ERROR',
      cause,
      context: { path },
    });
  }
}
