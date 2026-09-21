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

declare global {
	var bot: {
		name: string;
		token: string | undefined;
		version: string;
	};
	var setting: {
		mode: string;
		cooldown: number;
		maintenance: boolean;
	};
	var owner: {
		name: string;
		username: string;
		isAway: boolean;
		id: string | undefined;
	};
	var socmed: {
		github: string;
		instagram: string;
		telegram: string;
	};
	var channel: {
		url: string;
		id: string | undefined;
	};
	var media: {
		audio: string;
		image: string;
	};
	var message: {
		loading: string;
		done: string;
		error: string;
		maintenance: string;
		private: string;
		group: string;
		owner: string;
		nines: string;
		banned: string;
		didyoumean: string;
		missingArgs: string;
		cooldown: string;
		notRegistered: string;
		start: string;
		ownerAway: string;
	};
	var user: {
		limit: {
			default: number;
			nines: number;
			owner: number;
		};
	};
	var ai: {
		model: string | undefined;
		prompt: string | undefined;
	};
	var apikey: {
		aiKey: string | undefined;
		endKey: string | undefined;
	};
	var endpoint: {
		del: string | undefined;
		anb: string | undefined;
		nre: string | undefined;
		ypa: string | undefined;
	};
	var database: {
		provider: string | undefined;
		urldb: string | undefined;
		keydb: string | undefined;
	};
}

//export default {};
export {};
