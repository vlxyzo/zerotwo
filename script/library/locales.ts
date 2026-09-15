/**
 * Author      :: Velix <github.com/vlxyzo>
 * License     :: GPL-V3.0
 * Repository  :: github.com/vlxyzo/zerotwo
 * Modified    :: 2026-09-15
 *
 * plz don't remove the watermark :)
 */

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
	private static reloadTimer?: NodeJS.Timeout;
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
			log.warning(
				`Fallback language (${this.fallbackLang}) not found. The sistem may be unstable`
			);
		} else {
			log.success(`Successfully loaded ${loadedCount} languages`);
		}

		this.watchFiles();
	}

	private static watchFiles(): void {
		if (!fs.existsSync(this.pathLocales)) return;
		fs.watch(this.pathLocales, (eventType, filename) => {
			if (!filename || !filename.endsWith('.json')) return;
			if (this.reloadTimer) clearTimeout(this.reloadTimer);
			this.reloadTimer = setTimeout(async () => {
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
			}, 300);
		});
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
