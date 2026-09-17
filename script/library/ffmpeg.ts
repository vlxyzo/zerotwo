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
import { Readable, Writable } from 'node:stream';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

export interface FFmpegOptions {
	timeoutMs?: number;
	maxBufferBytes?: number;
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

	private execute(args: readonly string[], timeoutMs?: number): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			const child = spawn(this.ffmpegPath, args, {
				stdio: ['ignore', 'pipe', 'pipe'],
			});

			const stdoutChunks: Buffer[] = [];
			const stderrChunks: Buffer[] = [];
			let isSettled = false;

			const timer = setTimeout(() => {
				if (!isSettled) {
					isSettled = true;
					child.kill('SIGKILL');
					reject(
						new Error(
							`FFmpeg process timed out after ${timeoutMs ?? this.defaultTimeout}ms`
						)
					);
				}
			}, timeoutMs ?? this.defaultTimeout);

			child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
			child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));
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
					resolve(Buffer.concat(stdoutChunks));
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
		buildArgs: (inputPath: string, outputPath: string) => string[]
	): Promise<Buffer> {
		const id = randomBytes(8).toString('hex');
		const tempInput = join(tmpdir(), `vlxyzo_i_${id}.${inputExt}`);
		const tempOutput = join(tmpdir(), `vlxyzo_o_${id}.${outputExt}`);

		try {
			await fs.writeFile(tempInput, inputBuffer);
			const args = buildArgs(tempInput, tempOutput);
			await this.execute(args);
			const result = await fs.readFile(tempOutput);
			return result;
		} finally {
			await Promise.all([
				fs.unlink(tempInput).catch(() => {}),
				fs.unlink(tempOutput).catch(() => {}),
			]);
		}
	}

	// to vn
	public async toVoice(audioBuffer: Buffer): Promise<Buffer> {
		return this.processBuffer(audioBuffer, 'tmp', 'ogg', (inPath, outPath) => [
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
		]);
	}

	// to sticker
	public async toSticker(inputBuffer: Buffer, isAnimated = false): Promise<Buffer> {
		if (isAnimated) {
			return this.processBuffer(inputBuffer, 'mp4', 'webp', (inPath, outPath) => [
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
			]);
		}

		return this.processBuffer(inputBuffer, 'png', 'webp', (inPath, outPath) => [
			'-y',
			'-i',
			inPath,
			'-vcodec',
			'libwebp',
			'-filter:v',
			'scale=512:512:force_original_aspect_ratio=decrease',
			outPath,
		]);
	}

	// to telescope
	public async toTelescope(videoBuffer: Buffer): Promise<Buffer> {
		return this.processBuffer(videoBuffer, 'mp4', 'mp4', (inPath, outPath) => [
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
		]);
	}

	// video compression
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

		return this.processBuffer(videoBuffer, 'mp4', 'mp4', (inPath, outPath) => [
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
		]);
	}

	// to mp3
	public async toMP3(audioBuffer: Buffer, bitrate = '192k'): Promise<Buffer> {
		return this.processBuffer(audioBuffer, 'tmp', 'mp3', (inPath, outPath) => [
			'-y',
			'-i',
			inPath,
			'-vn',
			'-c:a',
			'libmp3lame',
			'-b:a',
			bitrate,
			outPath,
		]);
	}

	// gif to mp4
	public async gifToMp4(gifBuffer: Buffer): Promise<Buffer> {
		return this.processBuffer(gifBuffer, 'gif', 'mp4', (inPath, outPath) => [
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
		]);
	}

	// extract audio from video
	public async extractAudio(
		videoBuffer: Buffer,
		format: 'mp3' | 'aac' | 'wav' = 'mp3'
	): Promise<Buffer> {
		return this.processBuffer(videoBuffer, 'mp4', format, (inPath, outPath) => [
			'-y',
			'-i',
			inPath,
			'-vn',
			'-c:a',
			format === 'mp3' ? 'libmp3lame' : format === 'aac' ? 'aac' : 'pcm_s16le',
			outPath,
		]);
	}

	// get thumb vid
	public async getThumbnail(videoBuffer: Buffer, timestampSeconds = 1): Promise<Buffer> {
		return this.processBuffer(videoBuffer, 'mp4', 'jpg', (inPath, outPath) => [
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
		]);
	}

	// custom
	public async customRun(args: readonly string[]): Promise<Buffer> {
		return this.execute(args);
	}
}
