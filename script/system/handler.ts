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

import { Markup, type Context } from 'telegraf';
import { plugins } from './loader.ts';
import { DbManager } from './database.ts';
import { checkCooldown, findDidYouMean } from '#lib/utils.ts';
import { log } from '#lib/logger.ts';
import type { PluginHandler } from './types.ts';

const COMMAND_PREFIX = /^[\\/!#.]/;
const CALLBACK_COMMAND_PREFIX = 'command:';
const CALLBACK_COMMAND_PATTERN = /^[a-z0-9_]{1,64}$/i;

const OWNER_REGISTRATION_BYPASS_MESSAGE =
	'👑 <b>Owner access is always enabled.</b>\nRegistration is not required for the bot owner.';

type PluginExecutor = (ctx: Context, args: string[]) => Promise<void> | void;
type LegacyPluginExecutor = (ctx: Context, args: string[]) => Promise<void> | void;

interface DispatchOptions {
	source: 'message' | 'callback';
}

interface ParsedMessageCommand {
	commandName: string;
	args: string[];
}

export async function handleMessage(ctx: Context): Promise<void> {
	try {
		const parsed = parseMessageCommand(ctx);
		if (!parsed) return;

		await dispatchCommand(ctx, parsed.commandName, parsed.args, {
			source: 'message',
		});
	} catch (error) {
		await reportHandlerError(ctx, 'command', error);
	}
}

export async function handleCallbackQuery(ctx: Context): Promise<void> {
	try {
		const callbackData = getCallbackData(ctx);
		if (!callbackData || !callbackData.startsWith(CALLBACK_COMMAND_PREFIX)) {
			await ctx.answerCbQuery();
			return;
		}

		const rawCommand = callbackData.slice(CALLBACK_COMMAND_PREFIX.length).trim().toLowerCase();
		if (!CALLBACK_COMMAND_PATTERN.test(rawCommand)) {
			await ctx.answerCbQuery();
			log.warning(`Rejected invalid callback command payload: ${safeLogValue(rawCommand)}`);
			return;
		}

		await ctx.answerCbQuery();

		const handled = await dispatchCommand(ctx, rawCommand, [], {
			source: 'callback',
		});

		if (!handled) {
			log.warning(`Callback referenced an unknown command: ${safeLogValue(rawCommand)}`);
		}
	} catch (error) {
		await reportHandlerError(ctx, 'callback query', error);
	}
}

async function dispatchCommand(
	ctx: Context,
	commandName: string,
	args: string[],
	options: DispatchOptions
): Promise<boolean> {
	const normalizedCommand = normalizeCommandName(commandName);
	if (!normalizedCommand) return false;

	const isOwner = isContextOwner(ctx);
	if (setting.maintenance && !isOwner) {
		await ctx.replyWithHTML(message.maintenance);
		return true;
	}

	const matchedPlugin = findPlugin(normalizedCommand);
	if (!matchedPlugin) {
		if (options.source === 'message') {
			await sendDidYouMean(ctx, normalizedCommand);
		}
		return false;
	}

	if (matchedPlugin.owner === true && !isOwner) {
		await ctx.replyWithHTML(message.owner);
		return true;
	}

	const chatType = getChatType(ctx);
	if (matchedPlugin.private === true && chatType !== 'private') {
		await ctx.replyWithHTML(message.private);
		return true;
	}
	if (matchedPlugin.group === true && (chatType === 'private' || chatType === 'channel')) {
		await ctx.replyWithHTML(message.group);
		return true;
	}

	const isRegistrationCommand = isRegisterPlugin(matchedPlugin);
	if (isOwner && isRegistrationCommand) {
		await ctx.replyWithHTML(OWNER_REGISTRATION_BYPASS_MESSAGE);
		return true;
	}

	if (!isOwner && ctx.from && !isRegistrationCommand) {
		const userRecord = await DbManager.getUser(ctx.from.id);

		if (userRecord?.is_banned === true) {
			await ctx.replyWithHTML(message.banned);
			return true;
		}

		if (matchedPlugin.register === true && !userRecord) {
			await ctx.replyWithHTML(message.notRegistered);
			return true;
		}
	}

	const customCooldown = getCooldown(matchedPlugin);
	const cooldown = checkCooldown(
		ctx.from?.id?.toString() ?? 'anonymous',
		normalizedCommand,
		customCooldown
	);

	if (cooldown.onCooldown) {
		const replyMsg = message.cooldown.replace('{time}', `${cooldown.timeLeft}s`);
		await ctx.replyWithHTML(replyMsg);
		return true;
	}

	const executor = getExecutor(matchedPlugin);
	if (!executor) {
		log.warning(
			`Plugin ${safeLogValue(normalizedCommand)} doesn't have execute() or a valid legacy exec() function`
		);

		return true;
	}

	await executor(ctx, args);
	return true;
}

function parseMessageCommand(ctx: Context): ParsedMessageCommand | null {
	const msg = ctx.message;

	if (!msg) return null;
	let text = '';

	if ('text' in msg) {
		text = msg.text;
	} else if ('caption' in msg) {
		text = msg.caption ?? '';
	}

	if (!text || !COMMAND_PREFIX.test(text)) {
		return null;
	}

	const body = text.slice(1).trim();
	if (!body) {
		return null;
	}

	const tokens = body.split(/\s+/);
	const rawCommand = tokens.shift();

	if (!rawCommand) {
		return null;
	}

	const commandName = normalizeCommandName(rawCommand);
	if (!commandName) {
		return null;
	}

	return {
		commandName,
		args: tokens,
	};
}

function normalizeCommandName(rawCommand: string): string {
	return rawCommand.trim().toLowerCase().split('@', 1)[0] ?? '';
}

function findPlugin(commandName: string): PluginHandler | null {
	for (const plugin of plugins.values()) {
		const command = plugin.command;

		if (!command) {
			continue;
		}

		if (command instanceof RegExp) {
			command.lastIndex = 0;

			if (command.test(commandName)) {
				command.lastIndex = 0;
				return plugin;
			}

			command.lastIndex = 0;
			continue;
		}

		const commands = Array.isArray(command) ? command : [command];

		if (
			commands.some(
				value => typeof value === 'string' && value.trim().toLowerCase() === commandName
			)
		) {
			return plugin;
		}
	}

	return null;
}

function isRegisterPlugin(plugin: PluginHandler): boolean {
	const command = plugin.command;

	if (!command || command instanceof RegExp) {
		return false;
	}

	const commands = Array.isArray(command) ? command : [command];

	return commands.some(
		value => typeof value === 'string' && value.trim().toLowerCase() === 'register'
	);
}

async function sendDidYouMean(ctx: Context, commandName: string): Promise<void> {
	const dym = findDidYouMean(commandName, plugins, 60);

	if (!dym) {
		return;
	}

	const command = normalizeCommandName(dym.command);

	if (!command || !CALLBACK_COMMAND_PATTERN.test(command)) {
		return;
	}

	const replyMsg = message.didyoumean
		.replace('{command}', `/${command}`)
		.replace('{similarity}', dym.similarity);

	await ctx.replyWithHTML(replyMsg, {
		...Markup.inlineKeyboard([
			Markup.button.callback(`▶️ /${command}`, `${CALLBACK_COMMAND_PREFIX}${command}`),
		]),
	});
}

function getCallbackData(ctx: Context): string | null {
	const callback = ctx.callbackQuery;

	if (!callback || !('data' in callback) || typeof callback.data !== 'string') {
		return null;
	}

	return callback.data;
}

function getChatType(ctx: Context): string | undefined {
	const directChatType = ctx.chat?.type;

	if (directChatType) {
		return directChatType;
	}

	const callback = ctx.callbackQuery;

	if (!callback || !('message' in callback) || !callback.message) {
		return undefined;
	}

	if ('chat' in callback.message && callback.message.chat) {
		return callback.message.chat.type;
	}

	return undefined;
}

function isContextOwner(ctx: Context): boolean {
	const fromId = ctx.from?.id;
	const ownerId = typeof owner.id === 'string' ? owner.id.trim() : '';

	return Boolean(fromId) && ownerId.length > 0 && String(fromId) === ownerId;
}

function getCooldown(plugin: PluginHandler): number | undefined {
	const value = plugin.cooldown;

	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
		return undefined;
	}

	return value;
}

function getExecutor(plugin: PluginHandler): PluginExecutor | null {
	if (typeof plugin.execute === 'function') {
		return async (ctx, _args) => {
			await plugin.execute?.(ctx);
		};
	}

	const legacyExec = plugin.exec;

	if (typeof legacyExec === 'function') {
		return (ctx, args) => (legacyExec as LegacyPluginExecutor)(ctx, args);
	}

	return null;
}

async function reportHandlerError(
	ctx: Context,
	source: 'command' | 'callback query',
	error: unknown
): Promise<void> {
	log.error(`Got error while handling ${source}: ${errorMessage(error)}`);

	await ctx.replyWithHTML(message.error).catch(() => {});
}

function safeLogValue(value: string): string {
	return value.replace(/[\r\n]/g, '');
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
