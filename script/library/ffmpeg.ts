/**
 * 版权所有。允许个人和商业使用及修改。
 * 重新分发请严格遵循 GPL-V3.0 协议，且请勿声称原创。
 *
 * 项目  :  Zero Two v0.0.1-alpha
 * 作者  :  Velix
 * 协议  :  GPL-V3.0
 * 源码  :  github.com/vlxyzo/zerotwo
 */

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface FFmpegOptions {
	timeoutMs?: number;
	customFfmpegPath?: string;
}

export type ConversionQuality = 'low' | 'medium' | 'high' | 'ultra';

export class FFmpegWrapper {
	private readonly ffmpegPath: string;
	private readonly defaultTimeout: number;

	constructor(options: FFmpegOptions = {}) {
		this.ffmpegPath = options.customFfmpegPath ?? 'ffmpeg';
		this.defaultTimeout = options.timeoutMs ?? 60_000;
	}

	private execute(
		args: readonly string[],
		timeoutMs?: number,
		captureStdout = false
	): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			const child = spawn(this.ffmpegPath, args, {
				stdio: ['ignore', captureStdout ? 'pipe' : 'ignore', 'pipe'],
			});

			const stdoutChunks: Buffer[] = [];
			const stderrChunks: Buffer[] = [];
			const actualTimeout = timeoutMs ?? this.defaultTimeout;
			let isSettled = false;

			const timer = setTimeout(() => {
				if (!isSettled) {
					isSettled = true;
					child.kill('SIGKILL');
					reject(new Error(`FFmpeg process timed out after ${actualTimeout}ms`));
				}
			}, actualTimeout);

			if (captureStdout && child.stdout) {
				child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
			}
			if (child.stderr) {
				child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));
			}

			child.on('error', (err: Error) => {
				if (isSettled) return;
				isSettled = true;
				clearTimeout(timer);
				child.kill('SIGKILL');
				reject(new Error(`Failed to start FFmpeg process: ${err.message}`));
			});
			child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
				if (isSettled) return;
				isSettled = true;
				clearTimeout(timer);

				if (code === 0) {
					resolve(captureStdout ? Buffer.concat(stdoutChunks) : Buffer.alloc(0));
				} else {
					const stderrMsg = Buffer.concat(stderrChunks).toString('utf8');
					reject(
						new Error(
							`FFmpeg failed with code ${code ?? 'NULL'} (${signal ?? 'NO_SIGNAL'}): ${stderrMsg}`
						)
					);
				}
			});
		});
	}

	private async processBuffer(
		inputBuffer: Buffer,
		inputExt: string,
		outputExt: string,
		buildArgs: (inputPath: string, outputPath: string) => string[],
		timeoutMs?: number
	): Promise<Buffer> {
		const id = randomUUID();
		const tempInput = join(tmpdir(), `vlxyzo_in_${id}.${inputExt}`);
		const tempOutput = join(tmpdir(), `vlxyzo_out_${id}.${outputExt}`);
		try {
			await fs.writeFile(tempInput, inputBuffer);
			const args = buildArgs(tempInput, tempOutput);
			await this.execute(args, timeoutMs, false);
			return await fs.readFile(tempOutput);
		} finally {
			await Promise.allSettled([fs.unlink(tempInput), fs.unlink(tempOutput)]);
		}
	}

	// to voice note
	public async toVoice(audioBuffer: Buffer): Promise<Buffer> {
		return this.processBuffer(
			audioBuffer,
			'tmp',
			'ogg',
			(inPath, outPath) => [
				'-y',
				'-i',
				inPath,
				'-vn',
				'-c:a',
				'libopus',
				'-b:a',
				'32k',
				'-vbr',
				'on',
				'-compression_level',
				'10',
				'-frame_duration',
				'60',
				outPath,
			],
			60_000
		);
	}

	// to sticker
	public async toSticker(inputBuffer: Buffer, isAnimated = false): Promise<Buffer> {
		if (isAnimated) {
			return this.processBuffer(
				inputBuffer,
				'mp4',
				'webp',
				(inPath, outPath) => [
					'-y',
					'-i',
					inPath,
					'-vcodec',
					'libwebp',
					'-filter:v',
					'fps=fps=30,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
					'-lossless',
					'0',
					'-compression_level',
					'4',
					'-q:v',
					'60',
					'-loop',
					'0',
					'-an',
					outPath,
				],
				120_000
			);
		}

		return this.processBuffer(
			inputBuffer,
			'png',
			'webp',
			(inPath, outPath) => [
				'-y',
				'-i',
				inPath,
				'-vcodec',
				'libwebp',
				'-filter:v',
				'scale=512:512:force_original_aspect_ratio=decrease',
				outPath,
			],
			30_000
		);
	}

	// to telescope
	public async toTelescope(videoBuffer: Buffer): Promise<Buffer> {
		return this.processBuffer(
			videoBuffer,
			'mp4',
			'mp4',
			(inPath, outPath) => [
				'-y',
				'-i',
				inPath,
				'-vf',
				"crop=w='min(iw,ih)':h='min(iw,ih)',scale=384:384",
				'-c:v',
				'libx264',
				'-preset',
				'ultrafast',
				'-crf',
				'28',
				'-c:a',
				'aac',
				'-b:a',
				'64k',
				'-movflags',
				'+faststart',
				outPath,
			],
			300_000
		);
	}

	// compress video
	public async compressVideo(
		videoBuffer: Buffer,
		quality: ConversionQuality = 'medium'
	): Promise<Buffer> {
		const crfMap: Record<ConversionQuality, string> = {
			low: '35',
			medium: '28',
			high: '23',
			ultra: '18',
		};

		return this.processBuffer(
			videoBuffer,
			'mp4',
			'mp4',
			(inPath, outPath) => [
				'-y',
				'-i',
				inPath,
				'-c:v',
				'libx264',
				'-preset',
				'veryfast',
				'-crf',
				crfMap[quality],
				'-c:a',
				'aac',
				'-b:a',
				'128k',
				'-movflags',
				'+faststart',
				outPath,
			],
			600_000
		);
	}

	// to audio
	public async toMP3(audioBuffer: Buffer, bitrate = '192k'): Promise<Buffer> {
		return this.processBuffer(
			audioBuffer,
			'tmp',
			'mp3',
			(inPath, outPath) => [
				'-y',
				'-i',
				inPath,
				'-vn',
				'-c:a',
				'libmp3lame',
				'-b:a',
				bitrate,
				outPath,
			],
			120_000
		);
	}

	// gif to mp4
	public async gifToMp4(gifBuffer: Buffer): Promise<Buffer> {
		return this.processBuffer(
			gifBuffer,
			'gif',
			'mp4',
			(inPath, outPath) => [
				'-y',
				'-i',
				inPath,
				'-movflags',
				'faststart',
				'-pix_fmt',
				'yuv420p',
				'-vf',
				'scale=trunc(iw/2)*2:trunc(ih/2)*2',
				outPath,
			],
			120_000
		);
	}

	// get audio
	public async extractAudio(
		videoBuffer: Buffer,
		format: 'mp3' | 'aac' | 'wav' = 'mp3'
	): Promise<Buffer> {
		return this.processBuffer(
			videoBuffer,
			'mp4',
			format,
			(inPath, outPath) => [
				'-y',
				'-i',
				inPath,
				'-vn',
				'-c:a',
				format === 'mp3' ? 'libmp3lame' : format === 'aac' ? 'aac' : 'pcm_s16le',
				outPath,
			],
			120_000
		);
	}

	// get thumbnail
	public async getThumbnail(videoBuffer: Buffer, timestampSeconds = 1): Promise<Buffer> {
		return this.processBuffer(
			videoBuffer,
			'mp4',
			'jpg',
			(inPath, outPath) => [
				'-y',
				'-ss',
				timestampSeconds.toString(),
				'-i',
				inPath,
				'-vframes',
				'1',
				'-q:v',
				'2',
				outPath,
			],
			30_000
		);
	}

	// custom runner
	public async customRun(
		args: readonly string[],
		timeoutMs?: number,
		captureStdout = true
	): Promise<Buffer> {
		return this.execute(args, timeoutMs, captureStdout);
	}
}
