/**
 * Author      :: Velix <github.com/vlxyzo>
 * License     :: GPL-V3.0
 * Repository  :: github.com/vlxyzo/zerotwo
 * Modified    :: 2026-09-15
 *
 * plz don't remove the watermark :)
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { log } from '#lib/logger.ts';

type IpcMessage = 'reset' | 'uptime' | 'exit';
type ProcessSignal = 'SIGINT' | 'SIGTERM';

class BotProcessManager {
	private readonly maxCrashes = 5;
	private readonly crashWindowMs = 60_000;
	private readonly gcIntervalMs = 15 * 60 * 1000;
	private child: ChildProcess | null = null;
	private crashCount = 0;
	private lastCrash = Date.now();
	private gcTimer?: NodeJS.Timeout;
	private isRunning = true;
	private isRestarting = false;

	constructor(private readonly entryPath: string) {
		this.registerSystemSignals();
	}

	public start(): void {
		this.isRestarting = false;

		const args = ['--expose-gc', this.entryPath, ...process.argv.slice(2)];

		this.child = spawn(process.argv[0], args, {
			stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
		});

		this.setupChildListeners();
		this.startGcInterval();
	}

	private cleanRestart(): void {
		this.isRestarting = true;
		if (this.child) {
			log.loading('Stopping current process for restart...');
			this.child.kill();
		} else {
			this.start();
		}
	}

	private cleanExit(code = 0): never {
		this.stopGcInterval();
		process.exit(code);
	}

	// handle ipc mess
	private handleIpcMessage(message: IpcMessage): void {
		switch (message) {
			case 'reset':
				log.loading('Restart request received...');
				this.cleanRestart();
				break;
			case 'uptime':
				this.child?.send(process.uptime());
				break;
			case 'exit':
				this.cleanExit(0);
				break;
		}
	}

	// graceful
	private async gracefulShutdown(signal: ProcessSignal): Promise<void> {
		this.isRunning = false;
		log.warning(`${signal} received. Shutting down gracefully...`);

		this.stopGcInterval();

		if (!this.child) {
			process.exit(0);
		}

		this.child.kill(signal);

		const forceKillTimer = setTimeout(() => {
			log.error('Child process unresponsive. Forcing shutdown...');
			process.exit(1);
		}, 8000);

		this.child.once('exit', () => {
			clearTimeout(forceKillTimer);
			process.exit(0);
		});
	}

	// event
	private setupChildListeners(): void {
		if (!this.child) return;

		this.child.on('message', (data: IpcMessage) => this.handleIpcMessage(data));
		this.child.on('exit', (code, signal) => {
			this.child = null;

			if (!this.isRunning) {
				log.success('Process stopped manually. Have a nice day :D');
				this.cleanExit(0);
			}

			if (this.isRestarting) {
				log.loading('Child process terminated. Starting fresh instance...');
				return this.start();
			}

			if (code !== 0) {
				this.handleCrash(code, signal);
			} else {
				log.success('Process exited cleanly. Have a nice day :D');
				this.cleanExit(0);
			}
		});
	}

	// handle crash, auto restart
	private handleCrash(code: number | null, signal: string | null): void {
		log.error(`Process crashed with exit code ${code || signal}`);

		const now = Date.now();
		if (now - this.lastCrash > this.crashWindowMs) {
			this.crashCount = 0;
		}

		this.crashCount++;
		this.lastCrash = now;

		if (this.crashCount >= this.maxCrashes) {
			log.error(`Process crashed ${this.crashCount} times within 1m. Stopping auto restart`);
			this.cleanExit(1);
		}

		log.loading('Auto restarting in 3s...');
		setTimeout(() => this.start(), 3000);
	}

	// timer gc
	private startGcInterval(): void {
		this.stopGcInterval();
		this.gcTimer = setInterval(() => {
			if (this.child?.connected) {
				this.child.send('gc');
			}
		}, this.gcIntervalMs);
	}

	private stopGcInterval(): void {
		if (this.gcTimer) {
			clearInterval(this.gcTimer);
			this.gcTimer = undefined;
		}
	}

	// bind event listener
	private registerSystemSignals(): void {
		process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
		process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
	}
}

// TODO: main.ts
const botScriptPath = join(import.meta.dirname, './script/main.ts');
const manager = new BotProcessManager(botScriptPath);
manager.start();
