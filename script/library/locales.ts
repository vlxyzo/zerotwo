/**
 * 版权所有。允许个人和商业使用及修改。
 * 重新分发请严格遵循 GPL-V3.0 协议，且请勿声称原创。
 *
 * 项目  :  Zero Two v0.0.1-alpha
 * 作者  :  Velix
 * 协议  :  GPL-V3.0
 * 源码  :  github.com/vlxyzo/zerotwo
 */

// [DISABLED] Reason:
// I18n module is temporarily disabled to reduce complexity during alpha testing.
// Full multi-language support will be introduced in the v1.5.0+ stable release.

// NOTE: The structure/flow of this module is subject to change at any time
// to follow the project's workflow. It is not recommended to use this module
// until everything is finalized.

/* —————————————————————————————————————————————————————————————————————————————————————————————
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { log } from './logger.ts';

export type TranslationVariables = Record<string, string | number>;
type NestedDictionary = { [key: string]: string | string[] | NestedDictionary };
interface LocaleFile {
	meta?: { lang: string; [key: string]: unknown };
	[key: string]: unknown;
}
export class I18n {
	private static readonly pathLocales = path.join(import.meta.dirname, '../../source/locales');
	private static readonly fallbackLang = 'en';
	private static localesData: Record<string, NestedDictionary> = {};
	private static watcher: fs.FSWatcher | null = null;
	private static readonly reloadTimers = new Map<string, NodeJS.Timeout>();
	public static load(): void {
		if (!fs.existsSync(this.pathLocales)) {
			log.error(`Cannot find locales directory at ${this.pathLocales}`);
			return;
		}
		const files = fs.readdirSync(this.pathLocales);
		let loadedCount = 0;
		for (const file of files) {
			if (!file.endsWith('.json')) continue;
			const filePath = path.join(this.pathLocales, file);
			try {
				const fileContent = fs.readFileSync(filePath, 'utf-8');
				const parsedData = JSON.parse(fileContent) as LocaleFile;
				const langKey = parsedData?.meta?.lang;
				if (!langKey) {
					log.warning(`Locales ${file} is missing meta.lang. Skipped`);
					continue;
				}
				this.localesData[langKey] = parsedData as unknown as NestedDictionary;
				loadedCount++;
			} catch (error: unknown) {
				const msg = error instanceof Error ? error.message : String(error);
				log.error(`Failed to parse locales file ${file}: ${msg}`);
			}
		}
		if (!this.localesData[this.fallbackLang]) {
			log.error(
				`Fallback language ${this.fallbackLang} not found. The system may be unstable`
			);
		} else {
			log.success(`Successfully loaded ${loadedCount} languages`);
		}
		this.watchFiles();
	}
	private static watchFiles(): void {
		if (!fs.existsSync(this.pathLocales) || this.watcher) return;
		this.watcher = fs.watch(this.pathLocales, (eventType, filename) => {
			if (!filename || !filename.endsWith('.json')) return;
			const existingTimer = this.reloadTimers.get(filename);
			if (existingTimer) clearTimeout(existingTimer);
			this.reloadTimers.set(
				filename,
				setTimeout(() => {
					this.reloadTimers.delete(filename);
					void this.reloadFile(filename);
				}, 300)
			);
		});
		this.watcher.on('error', (error: Error) => {
			log.error(`Locales file watcher crashed: ${error.message}`);
			this.watcher = null;
		});
	}
	private static async reloadFile(filename: string): Promise<void> {
		log.info(`Locales file ${filename} changed. Reloading...`);
		try {
			const filePath = path.join(this.pathLocales, filename);
			const fileContent = await fsPromises.readFile(filePath, 'utf-8');
			const parsedData = JSON.parse(fileContent) as LocaleFile;
			const langKey = parsedData?.meta?.lang;
			if (langKey) {
				this.localesData[langKey] = parsedData as unknown as NestedDictionary;
				log.success(`Successfully hot reloading language ${langKey}`);
			}
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			log.error(`Failed to hot reload locales file ${filename}: ${msg}`);
		}
	}
	private static getLangData(langCode: string): NestedDictionary {
		return this.localesData[langCode] || this.localesData[this.fallbackLang] || {};
	}
	public static t(langCode: string, keyPath: string, variables?: TranslationVariables): string {
		const langObj = this.getLangData(langCode);
		const keys = keyPath.split('.');
		let currentData: unknown = langObj;
		for (const key of keys) {
			if (currentData && typeof currentData === 'object' && key in currentData) {
				currentData = (currentData as Record<string, unknown>)[key];
			} else {
				currentData = undefined;
				break;
			}
		}
		if (currentData === undefined && langCode !== this.fallbackLang) {
			return this.t(this.fallbackLang, keyPath, variables);
		}
		if (currentData === undefined) {
			log.error(`Missing translation ${keyPath} for language ${langCode}`);
			return keyPath;
		}
		let text = '';
		if (Array.isArray(currentData)) {
			text = currentData.join(', ');
		} else if (typeof currentData === 'string') {
			text = currentData;
		} else {
			log.error(`Translation ${keyPath} is not a string or array`);
			return keyPath;
		}
		if (variables && Object.keys(variables).length > 0) {
			text = text.replace(/\{(\w+)\}/g, (match, key) => {
				return variables[key] !== undefined ? String(variables[key]) : match;
			});
		}
		return text;
	}
}

I18n.load();
————————————————————————————————————————————————————————————————————————————————————————————— */
