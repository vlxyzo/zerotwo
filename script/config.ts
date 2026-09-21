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
	isAway: false,
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
	error: "❌ <b>Oops! Something broke. Please try again later.</b>\n<blockquote>No worries though, I've already told my true darling about it!</blockquote>",
	maintenance: "🛠️ <b>I'm down for scheduled maintenance at the moment. I'll be back online shortly, please try again later.</b>",
	private: "💌 Let's move into DMs, <b>I can't do this in public.</b>",
	group: "👥 This one only works inside a <b>group chat.</b>",
	owner: "🔒 You're not my <b>true darling</b>. Keep your hands off this command!",
	nines: "🦖 You need to be part of the <b>Nines Squad</b> to unlock this feature.\n<blockquote>Time for an upgrade? 💎</blockquote>",
	banned: "🚫 Looks like you're <b>blacklisted</b> and can't use this feature.",
	didyoumean: "❓ <b>Didn't quite catch that.</b> Did you mean this?\n\n💬 <b>Command:</b> {command}\n📊 <b>Similarity:</b> {similarity}",
	missingArgs: "⚠️ <b>Missing arguments!</b> Here's how to use it:\n{format}",
	cooldown: "⏱️ Woah, slow down! You're going too fast. Wait <b>{time}</b> before we do this again.",
	notRegistered: "🔑 <b>You need to register first. Type /register to get started.</b>",
	start: "🌸 Hey {user}! <b>{greetings}</b>.\n\nIt's me, <b>{bot}</b>! I'm here to be your partner, your helper, and your favorite companion. Whatever you need, I'll handle it for you.\n\n<blockquote>💫 Ready to begin? Type /menu and let's fly together!</blockquote>",
	ownerAway: "🌙 My <b>true darling</b> is away right now, he's busy with something. Leave a message and he'll reply when he's back. No spam-spam okay?"
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
