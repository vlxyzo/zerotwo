/**
 * 版权所有。允许个人和商业使用及修改。
 * 重新分发请严格遵循 GPL-V3.0 协议，且请勿声称原创。
 *
 * 项目  :  Zero Two v0.0.1-alpha
 * 作者  :  Velix
 * 协议  :  GPL-V3.0
 * 源码  :  github.com/vlxyzo/zerotwo
 */

export class TimeUtil {
	private static readonly timeFormatter = new Intl.DateTimeFormat('en-US', {
		timeZone: 'Asia/Jakarta',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23',
	});

	private static readonly dateFormatter = new Intl.DateTimeFormat('id-ID', {
		timeZone: 'Asia/Jakarta',
		weekday: 'long',
		day: '2-digit',
		month: 'long',
		year: 'numeric',
	});

	private static readonly hourFormatter = new Intl.DateTimeFormat('en-US', {
		timeZone: 'Asia/Jakarta',
		hour: 'numeric',
		hourCycle: 'h23',
	});

	public static formatDate(date: Date | string | number = new Date()): string {
		const d = new Date(date);
		const validDate = Number.isNaN(d.getTime()) ? new Date() : d;
		return this.dateFormatter.format(validDate);
	}

	public static formatTime(format = 'HH:mm', date: Date | string | number = new Date()): string {
		const d = new Date(date);
		const validDate = Number.isNaN(d.getTime()) ? new Date() : d;
		const parts = this.timeFormatter.formatToParts(validDate);
		const p: Record<string, string> = {};
		for (const part of parts) {
			if (part.type !== 'literal') {
				p[part.type] = part.value;
			}
		}

		const hourNum = parseInt(p.hour || '0', 10);
		const ampm = hourNum >= 12 ? 'PM' : 'AM';
		const hour12 = hourNum % 12 || 12;
		const hour12Str = hour12.toString().padStart(2, '0');
		return format
			.replace('DD', p.day || '00')
			.replace('MM', p.month || '00')
			.replace('YYYY', p.year || '0000')
			.replace('HH', p.hour || '00')
			.replace('hh', hour12Str)
			.replace('mm', p.minute || '00')
			.replace('ss', p.second || '00')
			.replace('A', ampm);
	}

	public static clockString(ms: number): string {
		if (!ms || ms < 0) return '0 seconds';

		const d = Math.floor(ms / (24 * 60 * 60 * 1000));
		const h = Math.floor(ms / (60 * 60 * 1000)) % 24;
		const m = Math.floor(ms / (60 * 1000)) % 60;
		const s = Math.floor(ms / 1000) % 60;
		const formatUnit = (val: number, unit: string) => val > 0 ? `${val} ${unit}${val > 1 ? 's' : ''}` : '';
		return (
			[
				formatUnit(d, 'day'),
				formatUnit(h, 'hour'),
				formatUnit(m, 'minute'),
				formatUnit(s, 'second'),
			]
				.filter(Boolean)
				.join(' ')
				.trim() || '0 seconds'
		);
	}

	public static getGreeting(date: Date | string | number = new Date()): string {
		const d = new Date(date);
		const validDate = Number.isNaN(d.getTime()) ? new Date() : d;
		const hourStr = this.hourFormatter.format(validDate);
		const hour = parseInt(hourStr, 10);
		if (hour >= 4 && hour < 12) {
			return 'Good morning 🌅';
		}
		if (hour >= 12 && hour < 17) {
			return 'Good afternoon ☀️';
		}
		if (hour >= 17 && hour < 21) {
			return 'Good evening 🌙';
		}
		return 'Good night 🌃';
	}
}
