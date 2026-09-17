import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import { GlobCache } from '../cache.ts';
import { log } from '#lib/logger.ts';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const userCache = GlobCache.createCache('users_cache', { ttl: 60000 });

export class DbManager {
	static async getUser(telegram_id) {
		if (userCache.has(telegram_id)) return userCache.get(telegram_id);

		try {
			const { data, error } = await supabase
				.from('users')
				.select('*')
				.eq('telegram_id', telegram_id)
				.single();
			if (error) throw error;
			userCache.set(telegram_id, data);
			return data;
		} catch (err) {
			log.warning('Supabase unreachable, reading from local JSON...');
			const raw = await fs.readFile('./database/users.json', 'utf8');
			const localData = JSON.parse(raw);
			return localData.find(u => u.telegram_id === telegram_id);
		}
	}

	static async upsertUser(userData) {
		try {
			const { error } = await supabase.from('users').upsert(userData);
			if (error) throw error;
			await this._updateLocalJSON(userData);
			userCache.set(userData.telegram_id, userData);
		} catch (err) {
			log.warning('Supabase insert failed, queueing offline update...');
			await this._addToQueue(userData);
			await this._updateLocalJSON(userData);
			userCache.set(userData.telegram_id, userData);
		}
	}

	static async syncOfflineQueue() {
		// Logika setInterval untuk baca queue.json dan upload ke Supabase ketika online kembali
	}

	static async _updateLocalJSON(userData) {
		// Logika baca users.json, nimpa data user yang diubah, dan write ulang
	}

	static async _addToQueue(userData) {
		// Logika nyimpen update yang gagal ke queue.json
	}
}
