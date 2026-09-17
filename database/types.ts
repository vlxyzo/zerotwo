import { z } from 'zod';

export const TelegramIdInputSchema = z.union([
  z.bigint(),
  z.number().int().finite(),
  z.string().trim().regex(/^-?\d+$/),
]);

export type TelegramIdInput = z.infer<typeof TelegramIdInputSchema>;
export type TelegramId = bigint;

export const UserStatusSchema = z.object({
  afk: z.boolean().default(false),
  since: z.string().datetime().default(() => new Date(0).toISOString()),
  reason: z.string().default(''),
});

export const UserNinesSchema = z.object({
  nines: z.boolean().default(false),
  expired: z.string().datetime().default(() => new Date(0).toISOString()),
});

export const UserInfoSchema = z.object({
  isRegistered: z.boolean().default(true),
  dateRegister: z.string().datetime().default(() => new Date().toISOString()),
  snKey: z.number().int().nonnegative().default(0),
  isFollowingCh: z.boolean().default(false),
  isNines: UserNinesSchema.default({
    nines: false,
    expired: new Date(0).toISOString(),
  }),
  isAfk: UserStatusSchema.default({
    afk: false,
    since: new Date(0).toISOString(),
    reason: '',
  }),
  languageDefault: z.enum(['en', 'id', 'ar', 'ru', 'tr', 'fa', 'ko']).default('en'),
});

export type UserInfo = z.infer<typeof UserInfoSchema>;

export const UserSchema = z.object({
  id: z.number().int().nonnegative(),
  telegramID: z.number().int().nonnegative(),
  username: z.string().nullable().optional(),
  first_name: z.string().default(''),
  last_name: z.string().default(''),
  limit: z.number().int().min(0).default(10),
  warning: z.number().int().min(0).default(0),
  isOwner: z.boolean().default(false),
  isBanned: z.boolean().default(false),
  info: UserInfoSchema.default({
    isRegistered: true,
    dateRegister: new Date().toISOString(),
    snKey: 0,
    isFollowingCh: false,
    isNines: { nines: false, expired: new Date(0).toISOString() },
    isAfk: { afk: false, since: new Date(0).toISOString(), reason: '' },
    languageDefault: 'en',
  }),
});

export type UserRecord = z.infer<typeof UserSchema>;

export const UserEnvelopeSchema = z.object({
  user: z.array(UserSchema).default([]),
});

export type UserEnvelope = z.infer<typeof UserEnvelopeSchema>;

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export type CacheEntry<T> = {
  value: T;
  expiresAt: number | null;
};

export const isTelegramId = (value: unknown): value is TelegramId => typeof value === 'bigint';

export const normalizeTelegramId = (value: TelegramIdInput): TelegramId => {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || !Number.isFinite(value)) {
      throw new TypeError(`Invalid Telegram ID number: ${String(value)}`);
    }
    return BigInt(value);
  }
  return BigInt(value);
};
