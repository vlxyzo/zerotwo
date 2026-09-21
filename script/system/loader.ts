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
					`Plugin ${pluginKey} skipped. Missing export handler or default property`
				);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			log.error(`Failed to load plugin ${pluginKey}: ${errorMessage}`);
		}
	}

	log.success(`Successfully loaded ${loadedCount} plugins`);
}
