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

export interface CooldownResult {
	onCooldown: boolean;
	timeLeft: number;
}

export interface PluginCommand {
	command?: string | string[] | RegExp;
	help?: string | string[];
	[key: string]: any;
}

export interface DidYouMeanResult {
	command: string;
	similarity: string;
}

// cooldown utilities
const cooldownCache = new Map<string, number>();
const cooldownTimers = new Map<string, NodeJS.Timeout>();

export function checkCooldown(
	userId: string | number,
	command: string,
	customCooldown?: number
): CooldownResult {
	const defaultCooldown = typeof setting !== 'undefined' ? setting.cooldown : 10;
	const cooldownSeconds = customCooldown ?? defaultCooldown;
	const cooldownMilliseconds = cooldownSeconds * 1000;
	const now = Date.now();
	const key = `${userId}_${command}`;
	const expirationTime = cooldownCache.get(key);
	if (expirationTime && now < expirationTime) {
		return {
			onCooldown: true,
			timeLeft: Number(((expirationTime - now) / 1000).toFixed(1)),
		};
	}

	cooldownCache.set(key, now + cooldownMilliseconds);

	const existingTimer = cooldownTimers.get(key);
	if (existingTimer) {
		clearTimeout(existingTimer);
	}
	const timer = setTimeout(() => {
		cooldownCache.delete(key);
		cooldownTimers.delete(key);
	}, cooldownMilliseconds);
	cooldownTimers.set(key, timer);
	return {
		onCooldown: false,
		timeLeft: 0,
	};
}

// command matching
function getSimilarity(str1: string, str2: string): number {
	if (!str1 && !str2) return 100;
	if (!str1 || !str2) return 0;

	const a = str1.toLowerCase();
	const b = str2.toLowerCase();
	if (a === b) return 100;

	const aLen = a.length;
	const bLen = b.length;
	let prevRow = Array.from({ length: aLen + 1 }, (_, i) => i);
	let currRow = new Array<number>(aLen + 1);

	for (let i = 1; i <= bLen; i++) {
		currRow[0] = i;
		for (let j = 1; j <= aLen; j++) {
			const cost = b[i - 1] === a[j - 1] ? 0 : 1;
			currRow[j] = Math.min(
				currRow[j - 1] + 1, // insertion
				prevRow[j] + 1, // deletion
				prevRow[j - 1] + cost // substitution
			);
		}
		const temp = prevRow;
		prevRow = currRow;
		currRow = temp;
	}
	const distance = prevRow[aLen];
	const maxLen = Math.max(aLen, bLen);
	return Math.round(((maxLen - distance) / maxLen) * 100);
}

export function findDidYouMean<K>(
	input: string,
	pluginsMap: Map<K, PluginCommand>,
	threshold = 60
): DidYouMeanResult | null {
	if (!input || input.length < 2 || !pluginsMap || pluginsMap.size === 0) {
		return null;
	}
	let bestMatch: string | null = null;
	let highestPercent = 0;

	const inputLen = input.length;
	for (const [_, plugin] of pluginsMap) {
		const cmds: string[] = [];
		if (plugin.command) {
			if (plugin.command instanceof RegExp) continue;
			cmds.push(...(Array.isArray(plugin.command) ? plugin.command : [plugin.command]));
		}
		if (plugin.help) {
			cmds.push(...(Array.isArray(plugin.help) ? plugin.help : [plugin.help]));
		}

		for (const cmd of cmds) {
			if (!cmd || typeof cmd !== 'string') continue;

			const cmdLen = cmd.length;
			const maxPossiblePercent =
				(Math.min(inputLen, cmdLen) / Math.max(inputLen, cmdLen)) * 100;
			if (maxPossiblePercent < threshold && highestPercent < threshold) {
				continue;
			}

			const percent = getSimilarity(input, cmd);
			if (percent > highestPercent) {
				highestPercent = percent;
				bestMatch = cmd;
			}
		}
	}
	if (bestMatch && highestPercent >= threshold) {
		return {
			command: bestMatch,
			similarity: `${highestPercent}%`,
		};
	}
	return null;
}
