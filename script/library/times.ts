/**
 * Author      :: Velix <github.com/vlxyzo>
 * License     :: GPL-V3.0
 * Repository  :: github.com/vlxyzo/zerotwo
 * Modified    :: 2026-09-15
 *
 * plz don't remove the watermark :)
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
		const formatUnit = (val: number, unit: string) =>
			val > 0 ? `${val} ${unit}${val > 1 ? 's' : ''}` : '';

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
		); // fb
	}
}
