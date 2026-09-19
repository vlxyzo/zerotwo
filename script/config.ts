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
};

globalThis.setting = {
	mode: 'public',
	cooldown: 10,
	maintenance: false,
};

globalThis.owner = {
	name: 'Velix',
	username: '@vlxyzo',
	idTelegram: '',
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

globalThis.message = {
	loading: "⏳ <i>Hold on tight. I'm processing it...</i>",
	done: "✅ <b>All done!</b>",
	error: "❌ <b>Oops! Something went wrong inside my system. Please try again later.</b>",
	maintenance: "<blockquote>🛠️ I'm taking a little break right now. Come back later, okay?</blockquote>",
	private: "💌 Come to my DMs darling. I won't do this in public!",
	group: "👥 This features can be used inside a <b>group</b>",
	owner: "🔒 You're not my <b>true darling</b>. Keep your hands off this command!",
	nines: "👑 You need to be in the <b>elite squad</b> to use this. <i>Time for an upgrade?</i>",
	banned: "🚫 <b>You've been blacklisted. I don't want to see you again, anymore!</b>",
	didyoumean: "❓ Huh? What are you trying to say? Is this what you mean?\n\n<blockquote>{dym}</blockquote>",
	missingArgs: "⚠️ You forgot to give me the details. Try it like this:\n<code>{format}</code>",
	cooldown: "⏱️ Woah, slow down! You're going too fast. Wait <code>{time}</code> before we do this again.",
	notRegistered: "<blockquote>📝 You need to register first before you can be my darling. Type <code>/register</code></blockquote>",
	start: "🌸 Hello @{user}! <b>{greetings}</b>.\n\nI'm <b>{bot}</b>, i'll be your partner right now. <b>Let's fly together darling!</b>\n\n<blockquote>Type <code>/help</code> to see what we can do.</blockquote>",
};

globalThis.user = {
	limit: {
		default: 10,
		nines: 200,
		owner: -1,
	},
};

globalThis.ai = {
	model: process.env.AI_MODEL,
	prompt: process.env.AI_PROMPT,
};

globalThis.apikey = {
	aiKey: process.env.AI_KEY,
	endKey: process.env.KEY_ENDPOINT,
};

globalThis.endpoint = {
	del: process.env.ENDPOINT_1,
	anb: process.env.ENDPOINT_2,
	nre: process.env.ENDPOINT_3,
	ypa: process.env.ENDPOINT_4,
};

globalThis.database = {
	provider: process.env.DB_PROVIDER,
	urldb: process.env.DB_URL,
	keydb: process.env.DB_KEY,
};
