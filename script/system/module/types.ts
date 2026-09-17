/**
 * Author      :: Velix <github.com/vlxyzo>
 * License     :: GPL-V3.0
 * Repository  :: github.com/vlxyzo/zerotwo
 * Modified    :: 2026-09-16
 *
 * plz don't remove the watermark :)
 */

//this file is the single src of truth for the shape of users, chats data
export type TelegramID = bigint;
export type TelegramIDInput = bigint | number | string;
export type Chat = 'private' | 'group' | 'supergroup' | 'channel';

const chat_type: readonly Chat[] = ['private', 'group', 'supergroup', 'channel'];

export function isChatType(value: string): value is Chat {
	return (chat_type as readonly string[]).includes(value);
}

/*
export interface UserInfo {
    isRegistered: boolean;
    dateRegister: string;
    snKey: number;
    isFollowingCh: boolean;
    isNines: {
        nines: boolean;
        expired: string;
    };
    isAfk: {
        afk: boolean;
        since: string;
        reason: string;
    };
    languageDefault: string;
}

export interface User {
    id?: number;
    telegramID: number;
    username: string;
    first_name: string;
    last_name: string;
    limit: number;
    warning: number;
    isOwner: boolean;
    isBanned: boolean;
    info: UserInfo;
}
*/

export interface UserRow {
	id: TelegramID;
	username: string | null;
	first_name: string;
	is_banned: boolean;
	created_at: string;
}

/**
 * is_banned dan created_at bersifat opsional dengan sengaja.
 * adapter tingkat rendah IDatabaseAdapter.upsertUser memperlakukan field yang
 * tidak diisi sebagai "pakai default" (is_banned = false, created_at = now()).
 * Jika kamu ingin perilaku "upsert rutin tidak boleh diam-diam meng-unban user
 * atau mereset created_at", gunakan `Database.upsertUser()` (facade) yang
 * melakukan merge cache-first sebelum memanggil adapter — lihat database.ts.
 */
export interface UserInsert {
	id: TelegramIDInput;
	username?: string | null;
	first_name: string;
	is_banned?: boolean;
	created_at?: string;
}

export type UserUpdate = Partial<Omit<UserInsert, 'id'>> & { id: TelegramIDInput };

export interface ChatRow {
	id: TelegramID;
	title: string;
	type: ChatType;
	created_at: string;
}

export interface ChatInsert {
	id: TelegramIDInput;
	title: string;
	type: ChatType;
	created_at?: string;
}

export type ChatUpdate = Partial<Omit<ChatInsert, 'id'>> & { id: TelegramIDInput };

// Ditulis manual mengikuti pola yang sama dengan `supabase gen types typescript`.
// Sengaja dinamai `SupabaseSchema` (bukan `Database`) agar tidak bentrok dengan
// class `Database` (facade) yang diekspor dari `database.ts`.
//
// PENTING soal BIGINT: kolom `id` bertipe `BIGINT` di Postgres. PostgREST dapat
// mengirim nilai ini sebagai JSON number, yang berisiko kehilangan presisi untuk
// nilai besar. Di sini kita perlakukan wire-shape `id` sebagai `string` (kita
// selalu mengirim & memvalidasi sebagai string dari sisi client — lihat
// `SupabaseAdapter`), lalu menormalisasinya menjadi `bigint` di lapisan domain.
export interface SupabaseSchema {
	public: {
		Tables: {
			users: {
				Row: {
					id: string;
					username: string | null;
					first_name: string;
					is_banned: boolean;
					created_at: string;
				};
				Insert: {
					id: string;
					username?: string | null;
					first_name: string;
					is_banned?: boolean;
					created_at?: string;
				};
				Update: Partial<SupabaseSchema['public']['Tables']['users']['Insert']>;
			};
			chats: {
				Row: {
					id: string;
					title: string;
					type: string;
					created_at: string;
				};
				Insert: {
					id: string;
					title: string;
					type: string;
					created_at?: string;
				};
				Update: Partial<SupabaseSchema['public']['Tables']['chats']['Insert']>;
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
}

export type ProviderName = 'supabase' | 'local';
/**
 * Kontrak yang harus dipenuhi setiap provider database (Supabase, Local, dst).
 * Aplikasi (via `Database` facade di `database.ts`) tidak perlu tahu provider
 * mana yang sedang aktif di baliknya — semua adapter berbicara dalam bahasa
 * (tipe) domain yang sama: `UserRow`, `ChatRow`, dst.
 *
 * Kontrak "Zero Crash": tidak ada method di bawah ini yang boleh melempar
 * (throw) exception ke pemanggil. Semua error wajib ditangkap secara internal,
 * dicatat lewat logger, lalu direpresentasikan sebagai `null` (untuk read/upsert
 * yang gagal) atau `false` (untuk operasi boolean seperti ban/unban).
 *
 * Catatan level-rendah vs facade: `upsertUser`/`upsertChat` di sini adalah
 * "full upsert" — pemanggil bertanggung jawab menyuplai state yang diinginkan.
 * Untuk perilaku merge yang lebih aman (tidak menimpa `is_banned`/`created_at`
 * yang sudah ada), gunakan `Database.upsertUser()`/`Database.upsertChat()`.
 */
export interface IDatabaseAdapter {
	readonly providerName: ProviderName;
	init(): Promise<void>;
	disconnect(): Promise<void>;
	getUser(id: TelegramIDInput): Promise<UserRow | null>;
	upsertUser(user: UserInsert): Promise<UserRow | null>;
	getChat(id: TelegramIDInput): Promise<ChatRow | null>;
	upsertChat(chat: ChatInsert): Promise<ChatRow | null>;
	banUser(id: TelegramIDInput): Promise<boolean>;
	unbanUser(id: TelegramIDInput): Promise<boolean>;
}
