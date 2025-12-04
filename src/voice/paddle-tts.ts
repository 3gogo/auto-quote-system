import { TTSEngine, TTSAudio, TTSEngineOptions } from './tts-engine';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';

/**
 * PaddleSpeech TTS 引擎实现
 * 需要预先安装 PaddleSpeech
 */
export class PaddleTTSEngine extends TTSEngine {
  private modelPath: string;
  private paddleSpeechPath: string;
  private tempDir: string;

  constructor(options: TTSEngineOptions = {}) {
    super(options);

    // 默认配置
    this.modelPath = process.env.PADDLE_MODEL_PATH || path.join(__dirname, '../../../models/paddlespeech_model');
    this.paddleSpeechPath = process.env.PADDLE_SPEECH_PATH || 'paddlespeech';
    this.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-quote-tts-'));

    console.log('初始化 PaddleSpeech TTS 引擎');
    console.log(`模型路径: ${this.modelPath}`);
    console.log(`PaddleSpeech 路径: ${this.paddleSpeechPath}`);
  }

  async init(): Promise<void> {
    // 检查模型文件是否存在
    if (!fs.existsSync(this.modelPath)) {
      console.warn(`模型文件不存在: ${this.modelPath}，将使用默认模型`);
    }

    // 检查 PaddleSpeech 是否可用
    try {
      await this.checkPaddleSpeech();
      console.log('PaddleSpeech TTS 引擎初始化完成');
    } catch (error) {
      console.error('PaddleSpeech 初始化失败:', error);
      throw error;
    }
  }

  async synthesize(text: string, options?: TTSEngineOptions): Promise<TTSAudio> {
    if (!text || text.trim().length === 0) {
      throw new Error('文本不能为空');
    }

    // 合并选项
    const opts = { ...this.options, ...options };
    const outputFile = path.join(this.tempDir, `tts-${Date.now()}.wav`);

    try {
      // 构建命令行参数
      const args = [
        'tts',
        '--text', text,
        '--output', outputFile,
        '--voc', 'pwgan_csmsc',
        '--lang', opts.language || 'zh'
      ];

      // 如果有模型路径，添加模型参数
      if (fs.existsSync(this.modelPath)) {
        args.push('--am', this.modelPath);
      }

      // 设置发音人
      if (opts.speaker && opts.speaker !== 'default') {
        args.push('--spk_id', opts.speaker);
      }

      // 设置语速
      if (opts.speed && opts.speed !== 1.0) {
        args.push('--speed', opts.speed.toString());
      }

      // 执行 PaddleSpeech
      await this.execPaddleSpeech(args);

      // 读取音频文件
      if (!fs.existsSync(outputFile)) {
        throw new Error('TTS 生成失败，输出文件不存在');
      }

      const buffer = fs.readFileSync(outputFile);
      const duration = await this.getAudioDuration(outputFile);

      return {
        buffer,
        format: 'wav',
        sampleRate: opts.sampleRate || 16000,
        channels: 1,
        duration
      };
    } finally {
      // 清理临时文件
      try {
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
      } catch (error) {
        console.warn('清理临时文件失败:', error);
      }
    }
  }

  async synthesizeToFile(text: string, filePath: string, options?: TTSEngineOptions): Promise<TTSAudio> {
    if (!text || text.trim().length === 0) {
      throw new Error('文本不能为空');
    }

    // 合并选项
    const opts = { ...this.options, ...options };

    try {
      // 构建命令行参数
      const args = [
        'tts',
        '--text', text,
        '--output', filePath,
        '--voc', 'pwgan_csmsc',
        '--lang', opts.language || 'zh'
      ];

      // 如果有模型路径，添加模型参数
      if (fs.existsSync(this.modelPath)) {
        args.push('--am', this.modelPath);
      }

      // 设置发音人
      if (opts.speaker && opts.speaker !== 'default') {
        args.push('--spk_id', opts.speaker);
      }

      // 设置语速
      if (opts.speed && opts.speed !== 1.0) {
        args.push('--speed', opts.speed.toString());
      }

      // 执行 PaddleSpeech
      await this.execPaddleSpeech(args);

      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        throw new Error('TTS 生成失败，输出文件不存在');
      }

      const buffer = fs.readFileSync(filePath);
      const duration = await this.getAudioDuration(filePath);

      return {
        buffer,
        format: 'wav',
        sampleRate: opts.sampleRate || 16000,
        channels: 1,
        duration
      };
    } catch (error) {
      // 如果出错且文件存在，删除文件
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (delError) {
        console.warn('清理输出文件失败:', delError);
      }
      throw error;
    }
  }

  private execPaddleSpeech(args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.paddleSpeechPath, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim()
          });
        } else {
          reject(new Error(`PaddleSpeech 执行失败 (code: ${code}): ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async checkPaddleSpeech(): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.paddleSpeechPath, ['--help'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stderr = '';

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`PaddleSpeech 不可用: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  private getAudioDuration(filePath: string): Promise<number> {
    // 简单实现：假设采样率 16kHz，每个样本 2 字节，单声道
    // 实际应用中可以使用 ffmpeg 获取精确时长
    return new Promise((resolve) => {
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      const duration = Math.round((fileSize - 44) / (16000 * 2) * 1000); // 减去 WAV 头部 44 字节
      resolve(duration);
    });
  }

  async destroy(): Promise<void> {
    // 清理临时目录
    try {
      if (fs.existsSync(this.tempDir)) {
        fs.rmSync(this.tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('清理临时目录失败:', error);
    }
  }
}