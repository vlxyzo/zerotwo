/**
 * 版权所有。允许个人和商业使用及修改。
 * 重新分发请严格遵循 GPL-V3.0 协议，且请勿声称原创。
 *
 * 项目  :  Zero Two v0.0.1-alpha
 * 作者  :  Velix
 * 协议  :  GPL-V3.0
 * 源码  :  github.com/vlxyzo/zerotwo
 */

import { styleText } from 'node:util';
import { TimeUtil } from './times.ts';

const tm = () => styleText(['bgGray', 'white', 'bold'], `${TimeUtil.formatTime('HH:mm:ss')}`);

export const log = {
	error: text => console.error(`${tm()} ${styleText(['white', 'bgRed', 'bold'], `⟨X⟩ ${text}`)}`),
	warning: text => console.warn(`${tm()} ${styleText(['yellow', 'bold'], '⟨!⟩')} ${text}`),
	success: text => console.log(`${tm()} ${styleText(['green', 'bold'], '⟨✓⟩')} ${text}`),
	debug: text => console.log(`${tm()} ${styleText(['gray', 'bold'], '⟨+⟩')} ${text}`),
	loading: text => console.log(`${styleText(['gray', 'italic'], text)}`),
	info: text => console.info(`${tm()} ${styleText(['magenta', 'bold'], '⟨•⟩')} ${text}`),
	zerotwo: (me, message) => console.log(`${tm()} ${styleText(['blue', 'bold'], `⟨#⟩ ${me}`)} ${message}`),
	user: (sender, command) => console.log(`${tm()} ${styleText(['bgBlue', 'white', 'bold'], `⟨@⟩ ${sender}`)} executed ${command}`),
};
