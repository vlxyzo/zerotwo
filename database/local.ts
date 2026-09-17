import { createReadStream, promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { LocalFileError, SchemaValidationError } from './errors.ts';
import { AsyncMutex } from './mutex.ts';
import { normalizeTelegramId, UserEnvelope, UserEnvelopeSchema, UserRecord, UserSchema } from './types.ts';

export class LocalDatabase {
  public readonly filePath: string;
  private readonly mutex = new AsyncMutex();

  constructor(filePath = join(process.cwd(), 'database', 'User.json')) {
    this.filePath = filePath;
  }

  public async ensureReady(): Promise<void> {
    await fs.mkdir(dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch {
      await this.atomicWrite({ user: [] });
    }
  }

  public async hydrate(): Promise<Map<number, UserRecord>> {
    const envelope = await this.readState();
    const map = new Map<number, UserRecord>();
    for (const user of envelope.user) {
      const parsed = UserSchema.parse(user);
      map.set(parsed.telegramID, parsed);
    }
    return map;
  }

  public async readState(): Promise<UserEnvelope> {
    await this.ensureReady();
    const stream = createReadStream(this.filePath, { encoding: 'utf-8' });
    const chunks: Array<string> = [];

    try {
      for await (const chunk of stream) {
        chunks.push(String(chunk));
      }
      const raw = chunks.join('');
      if (!raw.trim()) {
        return { user: [] };
      }
      const parsed = JSON.parse(raw) as unknown;
      return UserEnvelopeSchema.parse(parsed);
    } catch (error) {
      throw new LocalFileError(this.filePath, error);
    }
  }

  public async upsertUser(user: UserRecord): Promise<UserRecord> {
    return this.mutex.runExclusive(async () => {
      const state = await this.readState();
      const normalized = UserSchema.parse(user);
      const index = state.user.findIndex(current => current.telegramID === normalized.telegramID);
      if (index >= 0) {
        state.user[index] = normalized;
      } else {
        state.user.push(normalized);
      }
      await this.atomicWrite(state);
      return normalized;
    });
  }

  public async getUser(telegramID: number): Promise<UserRecord | null> {
    const state = await this.readState();
    return state.user.find(current => current.telegramID === telegramID) ?? null;
  }

  public async replaceAll(users: Array<UserRecord>): Promise<void> {
    await this.mutex.runExclusive(async () => {
      const next = UserEnvelopeSchema.parse({ user: users.map(user => UserSchema.parse(user)) });
      await this.atomicWrite(next);
    });
  }

  public async atomicWrite(payload: UserEnvelope): Promise<void> {
    await this.mutex.runExclusive(async () => {
      const serialized = JSON.stringify(UserEnvelopeSchema.parse(payload), null, 2);
      const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;

      try {
        await fs.writeFile(tempPath, serialized, 'utf-8');
        await fs.rename(tempPath, this.filePath);
      } catch (error) {
        await fs.rm(tempPath, { force: true }).catch(() => undefined);
        throw new LocalFileError(this.filePath, error);
      }
    });
  }

  public async getUserByTelegramId(input: number | string | bigint): Promise<UserRecord | null> {
    const telegramID = Number(normalizeTelegramId(input));
    return this.getUser(telegramID);
  }
}

export const localDatabase = new LocalDatabase();
