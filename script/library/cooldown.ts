/**
 * 版权所有。允许个人和商业使用及修改。
 * 重新分发请严格遵循 GPL-V3.0 协议，且请勿声称原创。
 *
 * 项目  :  Zero Two v0.0.1-alpha
 * 作者  :  Velix
 * 协议  :  GPL-V3.0
 * 源码  :  github.com/vlxyzo/zerotwo
 */

const cooldownCache = new Map<string, number>();

export interface CooldownResult {
	onCooldown: boolean;
	timeLeft: number;
}

export function checkCooldown(
	userId: string | number,
	command: string,
	customCooldown?: number
): CooldownResult {
	const cooldownSeconds = customCooldown ?? setting.cooldown;
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
	setTimeout(() => {
		cooldownCache.delete(key);
	}, cooldownMilliseconds);
	return {
		onCooldown: false,
		timeLeft: 0,
	};
}
