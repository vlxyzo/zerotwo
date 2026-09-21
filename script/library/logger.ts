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

import { styleText } from 'node:util';
import { TimeUtil } from './times.ts';

const tm = () => styleText(['gray'], `${TimeUtil.formatTime('HH:mm:ss')}`);

export const log = {
	error: text => console.error(`${tm()} ${styleText(['white', 'bgRed', 'bold'], `⟨X⟩ ${text}`)}`),
	warning: text => console.warn(`${tm()} ${styleText(['yellow', 'bold'], '⟨!⟩')} ${text}`),
	success: text => console.log(`${tm()} ${styleText(['green', 'bold'], '⟨✓⟩')} ${text}`),
	debug: text => console.log(`${tm()} ${styleText(['gray', 'bold'], '⟨#⟩')} ${text}`),
	loading: text => console.log(`${styleText(['gray', 'italic'], text)}`),
	info: text => console.info(`${tm()} ${styleText(['magenta', 'bold'], '⟨•⟩')} ${text}`),
	zerotwo: (me, message) => console.log(`${tm()} ${styleText(['blue', 'bold'], `⟨=⟩ ${me}`)} ${message}`),
	user: (sender, command) => console.log(`${tm()} ${styleText(['bgBlue', 'white', 'bold'], `⟨>⟩ ${sender}`)} executed ${command}`),
};
