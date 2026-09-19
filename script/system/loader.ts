/**
 * 版权所有。允许个人和商业使用及修改。
 * 重新分发请严格遵循 GPL-V3.0 协议，且请勿声称原创。
 *
 * 项目  :  Zero Two v0.0.1-alpha
 * 作者  :  Velix
 * 协议  :  GPL-V3.0
 * 源码  :  github.com/vlxyzo/zerotwo
 */

import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { log } from '#lib/logger.ts';
import type { PluginHandler, PluginModule } from './types.ts';

const pluginDir = join(import.meta.dirname, '../plugin');
export const plugins = new Map<string, PluginHandler>();

export async function loadPlugins(): Promise<void> {
	if (!existsSync(pluginDir)) {
		log.error(`Plugin directory not found at ${pluginDir}`);
		return;
	}

	plugins.clear();

	const files = readdirSync(pluginDir, { recursive: true })
		.filter((f): f is string => typeof f === 'string')
		.filter(f => f.endsWith('.js') || f.endsWith('.ts'))
		.filter(f => !f.endsWith('.d.ts'));
	let loadedCount = 0;

	for (const file of files) {
		const filePath = join(pluginDir, file);
		const pluginKey = file.replace(/\\/g, '/');
		try {
			const fileUrl = pathToFileURL(filePath);
			fileUrl.searchParams.set('v', Date.now().toString());
			const module = (await import(fileUrl.href)) as PluginModule;
			const plugin = module.handler || module.default;
			if (plugin) {
				plugins.set(pluginKey, plugin);
				loadedCount++;
			} else {
				log.warning(
					`Plugin ${pluginKey} skipped. Missing export handler or command property`
				);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			log.error(`Failed to load plugin ${pluginKey}: ${error.message}`);
		}
	}
	log.success(`Successfully loaded ${loadedCount} plugins`);
}
