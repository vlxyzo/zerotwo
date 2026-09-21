/**
 * Zero Two - Telegram Bot
 * Copyright (c) 2026 Velix
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License v3.0.
 */

import type { Context } from 'telegraf';
import { DbManager } from '#sys/database.ts';
import type { PluginHandler } from '#sys/types.ts';

const handler: PluginHandler = {
	command: 'register',
	private: true,
	async execute(ctx: Context): Promise<void> {
		if (!ctx.from) return;

		const existing = await DbManager.getUser(ctx.from.id);
		if (existing) {
			await ctx.replyWithHTML('✅ <b>You are already registered.</b>');
			return;
		}

		const isOwner = String(ctx.from.id) === owner.id;
		await DbManager.upsertUser({
			telegram_id: ctx.from.id,
			username: ctx.from.username ?? null,
			first_name: ctx.from.first_name ?? null,
			last_name: ctx.from.last_name ?? null,
			user_limit: isOwner ? user.limit.owner : user.limit.default,
			is_owner: isOwner,
			is_banned: false,
			warning: 0,
			info: null,
		});

		await ctx.replyWithHTML(
			`🎉 <b>Registration complete!</b>\n\nWelcome, <b>${escapeHtml(ctx.from.first_name)}</b>. You can now use registered commands.`
		);
	},
};

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, character => {
		const entities: Record<string, string> = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;',
		};
		return entities[character] ?? character;
	});
}

export { handler };
