/**
 * 版权所有。允许个人和商业使用及修改。
 * 重新分发请严格遵循 GPL-V3.0 协议，且请勿声称原创。
 *
 * 项目  :  Zero Two v0.0.1-alpha
 * 作者  :  Velix
 * 协议  :  GPL-V3.0
 * 源码  :  github.com/vlxyzo/zerotwo
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { log } from '#lib/logger.ts';

export type CtPmsg = 'reset' | 'uptime' | 'exit';
export type PtCmsg = 'gc';
type SignalProcess = 'SIGINT' | 'SIGTERM';

const velix = join(import.meta.dirname, './script/main.ts');

class ProcessManager {
	private readonly maxCrashes = 5;
	private readonly crashMs = 60_000;
	private readonly garbageMs = 15 * 60 * 1000;
	private child: ChildProcess | null = null;
	private crashCount = 0;
	private lastCrash = Date.now();
	private gcTimer?: NodeJS.Timeout;
	private fcKillTime?: NodeJS.Timeout;
	private isShutdown = false;
	private isRestart = false;

	constructor(private readonly entryPath: string) {
		this.sysSignal();
	}

	public start(): void {
		this.isRestart = false;

		const args = ['--expose-gc', this.entryPath, ...process.argv.slice(2)];
		this.child = spawn(process.execPath, args, {
			stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
		});

		this.childListen();
		this.startGc();
	}

	private ellRestart(): void {
		this.isRestart = true;
		if (this.child) {
			log.loading('Wait a sec, gotta stop this one before we restart...');
			this.child.kill();
		} else {
			this.start();
		}
	}

	private ellExit(code = 0): never {
		this.stopGc();
		if (this.fcKillTime) {
			clearTimeout(this.fcKillTime);
		}
		process.exit(code);
	}

	private ipcMessage(message: CtPmsg): void {
		switch (message) {
			case 'reset':
				log.loading('You called for a restart? On it...');
				this.ellRestart();
				break;
			case 'uptime':
				if (this.child?.connected) {
					this.child.send(process.uptime());
				}
				break;
			case 'exit':
				this.ellExit(0);
				break;
		}
	}

	private async graceShutd(signal: SignalProcess): Promise<void> {
		if (this.isShutdown) return;
		this.isShutdown = true;
		log.warning(`${signal} received. Okay darling, shutting down nicely...`);
		this.stopGc();

		if (!this.child) {
			process.exit(0);
		}

		this.child.kill(signal);

		this.fcKillTime = setTimeout(() => {
			log.error('Child process is being stubborn. Forcing shutdown now...');
			process.exit(1);
		}, 8000);
		this.child.once('exit', () => {
			this.ellExit(0);
		});
	}

	private childListen(): void {
		if (!this.child) return;
		this.child.on('message', (data: CtPmsg) => this.ipcMessage(data));
		this.child.on('exit', (code, signal) => {
			this.child = null;

			if (this.isShutdown) {
				log.success(
					'Process stopped manually. Thanks for staying with me today. See you again soon! ^^'
				);
				this.ellExit(0);
			}
			if (this.isRestart) {
				log.loading('Child process terminated. Starting a fresh one for us...');
				this.start();
				return;
			}
			if (code !== 0) {
				this.crashHandle(code, signal);
			} else {
				log.success(
					'Process exited cleanly. Thanks for staying with me today. See you again soon! ^^'
				);
				this.ellExit(0);
			}
		});
	}

	private crashHandle(code: number | null, signal: string | null): void {
		log.error(`Arghh! I try to processing it but got crashed with exit code ${code || signal}`);
		const now = Date.now();
		if (now - this.lastCrash > this.crashMs) {
			this.crashCount = 0;
		}

		this.crashCount++;
		this.lastCrash = now;

		if (this.crashCount >= this.maxCrashes) {
			log.error(
				`Process keep crashing ${this.crashCount} times within 1m, its hurt! Stopping auto restart...`
			);
			log.info(
				'Darling, if this happens many times, help me by opening a new issue on GitHub: https://github.com/vlxyzo/zerotwo/issues'
			);
			this.ellExit(1);
		}
		log.loading('Fine, let me try again in 3s...');
		setTimeout(() => this.start(), 3000);
	}

	private startGc(): void {
		this.stopGc();
		this.gcTimer = setInterval(() => {
			if (this.child?.connected) {
				const gcMsg: PtCmsg = 'gc';
				this.child.send(gcMsg);
			}
		}, this.garbageMs);
	}

	private stopGc(): void {
		if (this.gcTimer) {
			clearInterval(this.gcTimer);
			this.gcTimer = undefined;
		}
	}

	private sysSignal(): void {
		const handlesignal = (signal: SignalProcess) => {
			this.graceShutd(signal).catch(err => {
				log.error(`Dont laugh! I tried to be nicely but i failed: ${String(err)}`);
				process.exit(1);
			});
		};
		process.once('SIGINT', () => handlesignal('SIGINT'));
		process.once('SIGTERM', () => handlesignal('SIGTERM'));
	}
}

const manager = new ProcessManager(velix);
manager.start();
