/**
 * 版权所有。允许个人和商业使用及修改。
 * 重新分发请严格遵循 GPL-V3.0 协议，且请勿声称原创。
 *
 * 项目  :  Zero Two v0.0.1-alpha
 * 作者  :  Velix
 * 协议  :  GPL-V3.0
 * 源码  :  github.com/vlxyzo/zerotwo
 */

import pkg from '../package.json' with { type: 'json' };

globalThis.bot = {
	name: 'Zero Two',
	token: process.env.BOT_TOKEN,
	version: pkg.version,
	owner: '@vlxyzo',
	mode: 'public',
};

globalThis.database = {
	provider: process.env.DB_PROVIDER,
	urldb: process.env.SUPABASE_URL,
	keydb: process.env.SUPABASE_ANON_KEY,
};

globalThis.user = {
	limit: {
		default: 10,
		nines: 200,
		owner: -1,
	},
};

globalThis.socmed = {
	github: 'https://github.com/vlxyzo',
	instagram: 'https://instagram.com/vlxyzo',
	telegram: 'https://t.me/vlxyzo',
};

globalThis.channel = {
	url: 'https://t.me/vlxzo',
	id: '-1004292434918',
};

globalThis.media = {
	audio: '../source/media/audio/*.m4a',
	image: '../source/media/image/thumb/*.png',
};

globalThis.endpoint = {
	del: process.env.ENDPOINT_1,
	anb: process.env.ENDPOINT_2,
	nre: process.env.ENDPOINT_3,
	ypa: process.env.ENDPOINT_4,
};
