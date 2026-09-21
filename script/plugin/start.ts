/**
 * Zero Two - Telegram Bot
 * Copyright (c) 2026 Velix
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License v3.0.
 */

import type { Context } from 'telegraf';
import { TimeUtil } from '#lib/times.ts';
import type { PluginHandler } from '#sys/types.ts';

const handler: PluginHandler = {
	command: 'start',
	async execute(ctx: Context): Promise<void> {
		const firstName = ctx.from?.first_name ?? 'there';
		const greeting = TimeUtil.getGreeting();
		const text = message.start
			.replace('{user}', escapeHtml(firstName))
			.replace('{greetings}', escapeHtml(greeting))
			.replace('{bot}', escapeHtml(bot.name));
		await ctx.replyWithHTML(text);
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
