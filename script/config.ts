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
	id: process.env.OWNER_ID,
};

globalThis.socmed = {
	github: 'https://github.com/vlxyzo',
	instagram: 'https://instagram.com/vlxyzo',
	telegram: 'https://t.me/vlxyzo',
};

globalThis.channel = {
	url: 'https://t.me/vlxzo',
	id: process.env.CHANNEL_ID,
};

globalThis.media = {
	audio: '../source/media/audio/*.m4a',
	image: '../source/media/image/thumb/*.png',
};

globalThis.message = {
	loading: '⏳ <i>Hang tight, magic in progress...</i>',
	done: "✅ <b>Done and dusted!</b>",
	error: "❌ <b>Oops! Something broke. No worries though, I've already told my true darling about it!</b>",
	maintenance: "🛠️ <b>I'm down for scheduled maintenance at the moment. I'll be back online shortly, please try again later.</b>",
	private: "💌 <b>Let's move into DMs, I can't do this in public.</b>",
	group: "👥 <b>This one only works inside a group chat.</b>",
	owner: "🔒 <b>You're not my true darling. Keep your hands off this command!</b>",
	nines: "🦖 <b>You need to be part of the Nines Squad to unlock this feature.</b>\n<blockquote>Time for an upgrade? 💎</blockquote>",
	banned: "🚫 <b>Looks like you're blacklisted and can't use this feature.</b>",
	didyoumean: "❓ <b>Didn't quite catch that. Did you mean this?</b>\n\n<blockquote>{dym}</blockquote>",
	missingArgs: "⚠️ <b>Missing arguments! Here's how to use it:</b>\n<code>{format}</code>",
	cooldown: "⏱️ <b>Woah, slow down!</b> You're going too fast. Wait <code>{time}</code> before we do this again.",
	notRegistered: "<blockquote>🔑 You need to register first. Just type <code>/register</code> to get started.</blockquote>",
	start: "🌸 Hey {user}! <b>{greetings}</b>.\n\nIt's me, <b>{bot}</b>! I'm here to be your partner, your helper, and your favorite companion. Whatever you need, I'll handle it for you.\n\n<blockquote>💫 Ready to begin? Type <code>/menu</code> and let's fly together!</blockquote>",
	ownerAway: "🌙 <b>My true darling is away right now, he's busy with something. Leave a message and he'll reply when he's back. No spam-spam okay?</b>"
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
