/**
 * 版权所有。允许个人和商业使用及修改。
 * 重新分发请严格遵循 GPL-V3.0 协议，且请勿声称原创。
 *
 * 项目  :  Zero Two v0.0.1-alpha
 * 作者  :  Velix
 * 协议  :  GPL-V3.0
 * 源码  :  github.com/vlxyzo/zerotwo
 */

export interface PluginCommand {
	command?: string | string[];
	help?: string | string[];
	[key: string]: any;
}

export interface DidYouMeanResult {
	command: string;
	similarity: string;
}

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
	threshold: number = 60
): DidYouMeanResult | null {
	if (!input || input.length < 2 || !pluginsMap || pluginsMap.size === 0) {
		return null;
	}
	let bestMatch: string | null = null;
	let highestPercent = 0;
	const inputLen = input.length;
	for (const [_, plugin] of pluginsMap) {
		let cmds: string[] = [];
		if (Array.isArray(plugin.command)) {
			cmds = plugin.command;
		} else if (typeof plugin.command === 'string') {
			cmds = [plugin.command];
		} else if (Array.isArray(plugin.help)) {
			cmds = plugin.help;
		} else if (typeof plugin.help === 'string') {
			cmds = [plugin.help];
		}
		for (let i = 0; i < cmds.length; i++) {
			const cmd = cmds[i];
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
