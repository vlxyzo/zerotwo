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
import { handleCallbackQuery, handleMessage } from '#sys/handler.ts';
import { loadPlugins } from '#sys/loader.ts';
import { DbManager } from '#sys/database.ts';

let shuttingDown = false;

async function bootstrap(): Promise<void> {
	try {
		log.loading('Starting Zero Two Bot initialization...');

		const token = getRequiredBotToken();
		validateOwnerConfiguration();

		const zeroTwo = new Telegraf(token);
		await loadPlugins();
		zeroTwo.on('message', handleMessage);
		zeroTwo.on('callback_query', handleCallbackQuery);

		zeroTwo.catch((error, ctx) => {
			log.error(
				`Unhandled Telegraf error on update ${ctx.update.update_id}: ${errorMessage(error)}`
			);
		});

		registerShutdownHandlers(zeroTwo);

		const me = await zeroTwo.telegram.getMe();
		log.success(
			`[System] ${bot.name} (v${bot.version}) terhubung ke Telegram sebagai @${me.username ?? me.first_name}.`
		);

		void zeroTwo.launch().catch(error => {
			log.error(`Telegram polling stopped unexpectedly: ${errorMessage(error)}`);
			DbManager.stop();
			process.exitCode = 1;
		});

		log.success(`[System] ${bot.name} update polling started successfully!`);

		void DbManager.syncOfflineQueue().catch(error => {
			log.error(`Database offline queue synchronization failed: ${errorMessage(error)}`);
		});
	} catch (error) {
		log.error(`Gagal memulai aplikasi: ${errorMessage(error)}`);
		DbManager.stop();
		process.exitCode = 1;
	}
}

function getRequiredBotToken(): string {
	const token = typeof bot.token === 'string' ? bot.token.trim() : '';

	if (!token) {
		throw new Error(
			"Can't find BOT_TOKEN. Pastikan sudah diatur di environment variables atau .env file."
		);
	}

	return token;
}

function validateOwnerConfiguration(): void {
	const ownerId = typeof owner.id === 'string' ? owner.id.trim() : '';

	if (!ownerId || !/^-?\d+$/.test(ownerId)) {
		throw new Error(
			'OWNER_ID is missing or invalid. Set OWNER_ID to the numeric Telegram user ID of the bot owner.'
		);
	}
}

function registerShutdownHandlers(zeroTwo: Telegraf): void {
	const shutdown = (signal: NodeJS.Signals): void => {
		if (shuttingDown) {
			return;
		}

		shuttingDown = true;

		log.warning(`\nMenerima sinyal ${signal}. Memulai proses shutdown...`);

		try {
			zeroTwo.stop(signal);
		} catch (error) {
			log.error(`Failed to stop Telegram polling cleanly: ${errorMessage(error)}`);
		}
		DbManager.stop();
		log.success('Shutdown selesai. Proses dihentikan dengan aman.');
		process.exitCode = 0;
	};

	process.once('SIGINT', () => shutdown('SIGINT'));
	process.once('SIGTERM', () => shutdown('SIGTERM'));
}

function errorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === 'object' && error !== null && 'message' in error) {
		return String((error as { message: unknown }).message);
	}
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
}

void bootstrap();
