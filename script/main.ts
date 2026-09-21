/**
 * Zero Two - Telegram Bot
 * Copyright (c) 2026 Velix
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License v3.0.
 * See LICENSE file for details.
 *
 * @project     Zero Two v0.0.1-alpha
 * @author      Velix <github.com/vlxyzo>
 * @license     GPL-3.0
 * @source      github.com/vlxyzo/zerotwo
 */

import { Telegraf } from 'telegraf';
import { log } from '#lib/logger.ts';
import './config.ts';
import { loadPlugins } from './system/loader.ts';
import { handleMessage } from './system/handler.ts';
import { DbManager } from './system/database.ts';

async function bootstrap(): Promise<void> {
	try {
		log.loading('Starting Zero Two Bot initialization...');
		if (!bot.token) {
			throw new Error(
				`Can't find BOT_TOKEN. Pastikan sudah diatur di environment variables atau .env file.`
			);
		}

		const zeroTwo = new Telegraf(bot.token);
		await loadPlugins();
		await DbManager.syncOfflineQueue().catch(error => {
			const errorMessage = error instanceof Error ? error.message : String(error);
			log.warning(`Database offline queue could not be synchronized: ${errorMessage}`);
		});
		zeroTwo.on('message', async ctx => {
			await handleMessage(ctx);
		});
		zeroTwo.on('callback_query', async ctx => {
			const callback = ctx.callbackQuery;
			if (
				!('data' in callback) ||
				typeof callback.data !== 'string' ||
				!callback.data.startsWith('command:')
			) {
				await ctx.answerCbQuery();
				return;
			}
			await ctx.answerCbQuery();
			await ctx.reply(`/${callback.data.slice('command:'.length)}`);
		});

		await zeroTwo.launch();
		log.success(
			`[System] ${bot.name} (v${bot.version}) berhasil terhubung ke Telegram dan berjalan!`
		);

		const shutdown = (signal: NodeJS.Signals): void => {
			log.warning(`\nMenerima sinyal ${signal}. Memulai proses shutdown...`);
			zeroTwo.stop(signal);
			DbManager.stop();
			log.success('Shutdown selesai. Proses dihentikan dengan aman.');
			process.exit(0);
		};

		process.once('SIGINT', () => shutdown('SIGINT'));
		process.once('SIGTERM', () => shutdown('SIGTERM'));
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		log.error(`Gagal memulai aplikasi: ${errorMessage}`);
		process.exit(1);
	}
}

void bootstrap();
