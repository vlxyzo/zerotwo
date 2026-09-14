const timeFormatter = new Intl.DateTimeFormat('en-US', {
	timeZone: 'Asia/Jakarta',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	hourCycle: 'h23',
});

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
	timeZone: 'Asia/Jakarta',
	weekday: 'long',
	day: '2-digit',
	month: 'long',
	year: 'numeric',
});

export const dates = (date = new Date()) => {
	const d = new Date(date);
	return dateFormatter.format(isNaN(d.getTime()) ? new Date() : d);
};

export const getTime = (format = 'HH:mm', date = new Date()) => {
	const d = new Date(date);
	const parts = timeFormatter.formatToParts(d);
	const p = {};
	for (const part of parts) {
		p[part.type] = part.value;
	}

	const hourNum = parseInt(p.hour, 10);
	const ampm = hourNum >= 12 ? 'PM' : 'AM';
	let hour12 = hourNum % 12;
	hour12 = hour12 ? hour12 : 12;
	const hour12Str = hour12.toString().padStart(2, '0');
	return format
		.replace('DD', p.day)
		.replace('MM', p.month)
		.replace('YYYY', p.year)
		.replace('HH', p.hour)
		.replace('hh', hour12Str)
		.replace('mm', p.minute)
		.replace('ss', p.second)
		.replace('A', ampm);
};

export const clockString = ms => {
	const d = Math.floor(ms / (24 * 60 * 60 * 1000));
	const h = Math.floor(ms / (60 * 60 * 1000)) % 24;
	const m = Math.floor(ms / (60 * 1000)) % 60;
	const s = Math.floor(ms / 1000) % 60;
	return [
		d ? `${d} day${d > 1 ? 's' : ''}` : '',
		h ? `${h} hour${h > 1 ? 's' : ''}` : '',
		m ? `${m} minute${m > 1 ? 's' : ''}` : '',
		s ? `${s} second${s > 1 ? 's' : ''}` : '',
	]
		.filter(Boolean)
		.join(' ')
		.trim();
};

export const greetings = () => {
	const currentHour = parseInt(getTime('HH'), 10);
	if (currentHour >= 5 && currentHour < 12) return;
	if (currentHour >= 12 && currentHour < 15) return;
	if (currentHour >= 15 && currentHour < 18) return;
	return;
};
