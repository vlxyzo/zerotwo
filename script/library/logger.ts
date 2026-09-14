/**
 * Author      :: Velix <github.com/vlxyzo>
 * License     :: GPL-V3.0
 * Repository  :: github.com/vlxyzo/zerotwo
 * Modified    :: 2026-09-14
 */

import { styleText } from 'node:util';
import { getTime } from './times.js';

const tm = () => styleText(['gray', 'bold'], `${getTime('HH:mm:ss')}`);

export const log = {
	error: text => console.error(`${tm()} ${styleText(['white', 'bgRed', 'bold'], `⟨X⟩ ${text}`)}`),
	warning: text => console.warn(`${tm()} ${styleText(['yellow', 'bold'], '⟨!⟩')} ${text}`),
	success: text => console.log(`${tm()} ${styleText(['green', 'bold'], '⟨✓⟩')} ${text}`),
	loading: text => console.log(`${styleText(['gray', 'italic'], text)}`),
	info: text => console.info(`${tm()} ${styleText(['magenta', 'bold'], '⟨•⟩')} ${text}`),
	zero: (me, message) =>
		console.log(`${tm()} ${styleText(['blue', 'bold'], `⟨#⟩ ${me}:`)} ${message}`),
	user: (sender, command) =>
		console.log(
			`${tm()} ${styleText(['bgBlue', 'white', 'bold'], `⟨@⟩ ${sender}:`)} > ${command}`
		),
};
