/**
 * 版权所有。允许个人和商业使用及修改。
 * 重新分发请严格遵循 GPL-V3.0 协议，且请勿声称原创。
 *
 * 项目  :  Zero Two v0.0.1-alpha
 * 作者  :  Velix
 * 协议  :  GPL-V3.0
 * 源码  :  github.com/vlxyzo/zerotwo
 */

declare global {
	var bot: {
		name: string;
		token: string | undefined;
		version: string;
		owner: string;
		mode: string;
	};
	var database: {
		provider: string | undefined;
		urldb: string | undefined;
		keydb: string | undefined;
	};
	var user: {
		limit: {
			default: number;
			nines: number;
			owner: number;
		};
	};
	var socmed: {
		github: string;
		instagram: string;
		telegram: string;
	};
	var channel: {
		url: string;
		id: string;
	};
	var media: {
		audio: string;
		image: string;
	};
	var endpoint: {
		del: string | undefined;
		anb: string | undefined;
		nre: string | undefined;
		ypa: string | undefined;
	};
}

export {};
