/**
 * 版权所有。允许个人和商业使用及修改。
 * 重新分发请严格遵循 GPL-V3.0 协议，且请勿声称原创。
 *
 * 项目  :  Zero Two v0.0.1-alpha
 * 作者  :  Velix
 * 协议  :  GPL-V3.0
 * 源码  :  github.com/vlxyzo/zerotwo
 */

import { Context } from 'telegraf';
import { plugins } from './loader.ts';
import { checkCooldown } from '#lib/cooldown.ts';
import { findDidYouMean } from '#lib/didyoumean.ts';
import { log } from '#lib/logger.ts';

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
		const args = text.slice(1).trim().split(/ +/);
		const commandName = args.shift()?.toLowerCase();
		if (!commandName) return;
		const userId = ctx.from?.id.toString() || '';
		const isOwner = userId === owner.idTelegram;
		if (setting.maintenance && !isOwner) {
			await ctx.replyWithHTML(message.maintenance);
			return;
		}

		let matchedPlugin: any = null;
		for (const [_, plugin] of plugins.entries()) {
			const cmds = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
			if (cmds.includes(commandName)) {
				matchedPlugin = plugin;
				break;
			}
		}

		if (!matchedPlugin) {
			const dym = findDidYouMean(commandName, plugins, 60);
			if (dym) {
				const replyMsg = message.didyoumean.replace('{dym}', dym.command);
				await ctx.replyWithHTML(replyMsg);
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
			await ctx.replyWithHTML('👥 Command ini hanya bisa digunakan di dalam grup.');
			return;
		}

		if (matchedPlugin.register) {
			const isRegistered = false; // Ganti ini
			if (!isRegistered) {
				await ctx.replyWithHTML(message.notRegistered);
				return;
			}
		}

		const cooldown = checkCooldown(userId, commandName, matchedPlugin.cooldown);
		if (cooldown.onCooldown) {
			const replyMsg = message.cooldown.replace('{time}', `${cooldown.timeLeft}s`);
			await ctx.replyWithHTML(replyMsg);
			return;
		}

		if (typeof matchedPlugin.execute === 'function') {
			await matchedPlugin.execute(ctx, args);
		} else if (typeof matchedPlugin.exec === 'function') {
			await matchedPlugin.exec(ctx, args);
		} else {
			log.warning(`Plugin ${commandName} tidak memiliki fungsi execute() atau exec()`);
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		log.error(`Got error while exec command: ${errorMessage}`);
		await ctx.replyWithHTML(message.error).catch(() => {});
	}
}
