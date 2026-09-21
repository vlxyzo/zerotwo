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

import { Context, Markup } from 'telegraf';
import { plugins } from './loader.ts';
import { DbManager } from './database.ts';
import { checkCooldown, findDidYouMean } from '#lib/utils.ts';
import { log } from '#lib/logger.ts';
import type { PluginHandler } from './types.ts';

export async function handleMessage(ctx: Context): Promise<void> {
	try {
		const msg = ctx.message;
		if (!msg) return;
		let text = '';
		if ('text' in msg) {
			text = msg.text;
		} else if ('caption' in msg) {
			text = msg.caption || '';
		}
		if (!text) return;
		const prefixRegex = /^[\\/!#.]/;
		if (!prefixRegex.test(text)) return;
		const args = text.slice(1).trim().split(/\s+/);
		const rawCommand = args.shift()?.toLowerCase();
		const commandName = rawCommand?.split('@', 1)[0];
		if (!commandName) return;
		const userId = ctx.from?.id.toString() || '';
		const isOwner = userId === owner.id;
		if (setting.maintenance && !isOwner) {
			await ctx.replyWithHTML(message.maintenance);
			return;
		}
		let matchedPlugin: PluginHandler | null = null;
		for (const plugin of plugins.values()) {
			if (!plugin.command) continue;
			if (plugin.command instanceof RegExp) {
				plugin.command.lastIndex = 0;
				if (plugin.command.test(commandName)) {
					matchedPlugin = plugin;
					break;
				}
			} else {
				const cmds = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
				if (cmds.includes(commandName)) {
					matchedPlugin = plugin;
					break;
				}
			}
		}
		if (!matchedPlugin) {
			const dym = findDidYouMean(commandName, plugins, 60);
			if (dym) {
				const replyMsg = message.didyoumean
					.replace('{command}', dym.command)
					.replace('{similarity}', dym.similarity);
				const command = dym.command.replace(/^[/\\!#.]/, '');
				await ctx.replyWithHTML(replyMsg, {
					...Markup.inlineKeyboard([
						Markup.button.callback(`▶️ /${command}`, `command:${command}`),
					]),
				});
			}
			return;
		}
		if (matchedPlugin.owner && !isOwner) {
			await ctx.replyWithHTML(message.owner);
			return;
		}
		if (matchedPlugin.private && ctx.chat?.type !== 'private') {
			await ctx.replyWithHTML(message.private);
			return;
		}
		if (matchedPlugin.group && (ctx.chat?.type === 'private' || ctx.chat?.type === 'channel')) {
			await ctx.replyWithHTML(message.group);
			return;
		}
		if (matchedPlugin.register) {
			if (!ctx.from) return;
			const userRecord = await DbManager.getUser(ctx.from.id);
			const isRegistered = !!userRecord;
			if (!isRegistered) {
				await ctx.replyWithHTML(message.notRegistered);
				return;
			}
		}
		if (userId) {
			const userRecord = await DbManager.getUser(userId);
			if (userRecord?.is_banned) {
				await ctx.replyWithHTML(message.banned);
				return;
			}
		}
		const customCooldown =
			typeof matchedPlugin.cooldown === 'number' ? matchedPlugin.cooldown : undefined;
		const cooldown = checkCooldown(userId, commandName, customCooldown);
		if (cooldown.onCooldown) {
			const replyMsg = message.cooldown.replace('{time}', `${cooldown.timeLeft}s`);
			await ctx.replyWithHTML(replyMsg);
			return;
		}
		if (typeof matchedPlugin.execute === 'function') {
			await matchedPlugin.execute(ctx);
		} else if (typeof matchedPlugin.exec === 'function') {
			await (matchedPlugin as any).exec(ctx, args);
		} else {
			log.warning(`Plugin ${commandName} doesn't have execute() or exec() function`);
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		log.error(`Got error while exec command: ${errorMessage}`);
		await ctx.replyWithHTML(message.error).catch(() => {});
	}
}
