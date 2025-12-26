import { ASREngine, ASRResult, ASROptions } from './asr-engine';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Whisper.cpp 语音识别引擎实现
 * 需要预先安装 whisper.cpp 并配置好模型文件
 */
export class WhisperASREngine extends ASREngine {
  private modelPath: string;
  private whisperCppPath: string;
  private tempDir: string;

  constructor(options: ASROptions & { modelPath?: string; whisperPath?: string } = {}) {
    super(options);

    // 默认配置
    this.modelPath = options.modelPath || process.env.WHISPER_MODEL_PATH || path.join(__dirname, '../../../models/ggml-base.bin');
    this.whisperCppPath = options.whisperPath || process.env.WHISPER_CPP_PATH || path.join(__dirname, '../../../whisper.cpp/main');
    this.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-quote-asr-'));

    console.log('初始化 Whisper.cpp ASR 引擎');
    console.log(`模型路径: ${this.modelPath}`);
    console.log(`Whisper.cpp 路径: ${this.whisperCppPath}`);
  }

  async init(): Promise<void> {
    // 检查模型文件是否存在
    if (!fs.existsSync(this.modelPath)) {
      throw new Error(`模型文件不存在: ${this.modelPath}`);
    }

    // 检查 whisper.cpp 可执行文件是否存在
    if (!fs.existsSync(this.whisperCppPath)) {
      throw new Error(`Whisper.cpp 可执行文件不存在: ${this.whisperCppPath}`);
    }

    console.log('Whisper.cpp ASR 引擎初始化完成');
  }

  async recognize(audioBuffer: Buffer): Promise<ASRResult> {
    // 生成临时文件
    const timestamp = Date.now();
    const tempFile = path.join(this.tempDir, `audio-${timestamp}.wav`);
    const outputFileBase = path.join(this.tempDir, `output-${timestamp}`);
    const outputFileTxt = `${outputFileBase}.txt`;

    try {
      // 保存音频文件
      fs.writeFileSync(tempFile, audioBuffer);

      // 构建命令行参数（适配新版 whisper-cli）
      const args = [
        '-m', this.modelPath,
        '-f', tempFile,
        '-of', outputFileBase,
        '-otxt',  // 输出 txt 文件
        '-l', (this.options.language || 'zh').split('-')[0],  // 只取语言代码主体部分 (zh-CN -> zh)
        '-nt',    // 不输出时间戳
        '-np'     // 只输出结果
      ];

      console.log(`[ASR] 执行命令: ${this.whisperCppPath} ${args.join(' ')}`);
      console.log(`[ASR] 临时音频文件大小: ${fs.statSync(tempFile).size} bytes`);

      // 执行 whisper.cpp
      const result = await this.execWhisperCpp(args);

      console.log(`[ASR] whisper 执行完成，耗时: ${result.duration}ms`);
      console.log(`[ASR] stdout: ${result.stdout.substring(0, 200)}`);
      console.log(`[ASR] stderr: ${result.stderr.substring(0, 200)}`);
      console.log(`[ASR] 输出文件存在: ${fs.existsSync(outputFileTxt)}`);

      // 读取输出文件
      let text = '';
      if (fs.existsSync(outputFileTxt)) {
        text = fs.readFileSync(outputFileTxt, 'utf-8').trim();
        console.log(`[ASR] 从文件读取结果: "${text}"`);
      } else {
        // 从 stdout 解析结果（备用方案）
        const lines = result.stdout.split('\n');
        for (const line of lines) {
          // 跳过时间戳行和日志行
          if (line.startsWith('[') || line.includes('whisper_') || line.includes('main:')) {
            continue;
          }
          text += line.trim() + ' ';
        }
        text = text.trim();
        console.log(`[ASR] 从 stdout 解析结果: "${text}"`);
      }

      return {
        text: text || '',
        confidence: 0.9,
        language: this.options.language,
        duration: result.duration
      };
    } finally {
      // 清理临时文件
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        if (fs.existsSync(outputFileTxt)) fs.unlinkSync(outputFileTxt);
      } catch (error) {
        console.warn('清理临时文件失败:', error);
      }
    }
  }

  async recognizeFromFile(filePath: string): Promise<ASRResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`音频文件不存在: ${filePath}`);
    }

    // 读取文件并调用 recognize
    const audioBuffer = fs.readFileSync(filePath);
    return this.recognize(audioBuffer);
  }

  private execWhisperCpp(args: string[]): Promise<{ stdout: string; stderr: string; duration: number }> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const process = spawn(this.whisperCppPath, args, {
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
        const duration = Date.now() - startTime;

        if (code === 0) {
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            duration
          });
        } else {
          reject(new Error(`Whisper.cpp 执行失败 (code: ${code}): ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  setHotwords(hotwords: string[]): void {
    super.setHotwords(hotwords);
    console.log('热词已更新:', hotwords);
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