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

  constructor(options: ASROptions = {}) {
    super(options);

    // 默认配置
    this.modelPath = process.env.WHISPER_MODEL_PATH || path.join(__dirname, '../../../models/ggml-base.bin');
    this.whisperCppPath = process.env.WHISPER_CPP_PATH || path.join(__dirname, '../../../whisper.cpp/main');
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
    const tempFile = path.join(this.tempDir, `audio-${Date.now()}.wav`);
    const outputFile = path.join(this.tempDir, `output-${Date.now()}.txt`);

    try {
      // 保存音频文件
      fs.writeFileSync(tempFile, audioBuffer);

      // 构建命令行参数
      const args = [
        '-m', this.modelPath,
        '-f', tempFile,
        '-of', outputFile.replace('.txt', ''),
        '-l', this.options.language || 'zh',
        '--print-all',
        '--no-timestamps'
      ];

      // 如果有热词，添加到参数中
      if (this.options.hotwords && this.options.hotwords.length > 0) {
        args.push('-dt', this.options.hotwords.join(','));
      }

      // 执行 whisper.cpp
      const result = await this.execWhisperCpp(args);

      // 读取输出文件
      let text = '';
      if (fs.existsSync(outputFile)) {
        text = fs.readFileSync(outputFile, 'utf-8').trim();
      } else {
        text = result.stdout;
      }

      return {
        text: text || '',
        confidence: 0.9, // Whisper.cpp 不直接返回置信度，这里给一个默认值
        language: this.options.language,
        duration: result.duration
      };
    } finally {
      // 清理临时文件
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
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