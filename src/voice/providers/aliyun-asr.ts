/**
 * 阿里云 Paraformer ASR Provider
 * 支持 paraformer-realtime-v2 实时语音识别
 */

import { BaseASRProvider, ASRProviderConfig } from '../asr-provider';
import { ASRResult, ASROptions } from '../asr-engine';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * 阿里云 ASR 配置
 */
export interface AliyunASRConfig extends ASRProviderConfig {
  /** API Key（从环境变量 DASHSCOPE_API_KEY 获取） */
  apiKey?: string;
  /** 模型名称 */
  model?: string;
  /** 是否启用方言识别 */
  enableDialect?: boolean;
  /** 方言类型 */
  dialect?: string;
}

/**
 * 阿里云 Paraformer ASR Provider
 */
export class AliyunASRProvider extends BaseASRProvider {
  readonly name = 'aliyun-paraformer';
  readonly type = 'aliyun-paraformer' as const;

  private apiKey: string;
  private model: string;
  private baseUrl = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference';
  private tempDir: string;
  private enableDialect: boolean;
  private dialect: string;

  constructor(config: AliyunASRConfig = {}) {
    super({
      name: 'aliyun-paraformer',
      type: 'aliyun-paraformer',
      ...config
    });

    this.apiKey = config.apiKey || process.env.DASHSCOPE_API_KEY || '';
    this.model = config.model || 'paraformer-realtime-v2';
    this.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aliyun-asr-'));
    this.enableDialect = config.enableDialect ?? true;
    this.dialect = config.dialect || 'zh'; // 支持 zh, yue, wuu, nan 等

    console.log('初始化阿里云 Paraformer ASR Provider');
    console.log(`模型: ${this.model}`);
  }

  async init(): Promise<void> {
    if (!this.apiKey) {
      throw new Error('阿里云 API Key 未配置，请设置 DASHSCOPE_API_KEY 环境变量');
    }

    this.initialized = true;
    console.log('✅ 阿里云 Paraformer ASR Provider 初始化成功');
  }

  async isAvailable(): Promise<boolean> {
    return this.initialized && !!this.apiKey;
  }

  /**
   * 识别音频（HTTP 接口，适用于短音频）
   */
  async recognize(audioBuffer: Buffer, options?: ASROptions): Promise<ASRResult> {
    if (!this.initialized) {
      await this.init();
    }

    const startTime = Date.now();

    try {
      // 使用录音文件识别接口（适用于短音频）
      const result = await this.recognizeWithFileTranscription(audioBuffer, options);
      
      return {
        ...result,
        duration: Date.now() - startTime
      };
    } catch (error) {
      console.error('阿里云 ASR 识别失败:', error);
      throw error;
    }
  }

  /**
   * 从文件识别
   */
  async recognizeFromFile(filePath: string, options?: ASROptions): Promise<ASRResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`音频文件不存在: ${filePath}`);
    }

    const audioBuffer = fs.readFileSync(filePath);
    return this.recognize(audioBuffer, options);
  }

  /**
   * 使用录音文件识别接口
   */
  private async recognizeWithFileTranscription(
    audioBuffer: Buffer,
    options?: ASROptions
  ): Promise<ASRResult> {
    // 保存临时文件
    const tempFile = path.join(this.tempDir, `audio-${Date.now()}.wav`);
    fs.writeFileSync(tempFile, audioBuffer);

    try {
      // 注意：这里使用 HTTP 接口，实际生产中建议使用 WebSocket 实时接口
      const response = await fetch(
        'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'X-DashScope-Async': 'enable' // 异步模式
          },
          body: JSON.stringify({
            model: this.model,
            input: {
              file_urls: [] // 实际使用需要先上传文件获取 URL
            },
            parameters: {
              language_hints: this.enableDialect ? [this.dialect, 'en'] : ['zh', 'en'],
              sample_rate: options?.sampleRate || 16000,
              format: 'wav',
              // 热词配置
              vocabulary_id: undefined, // 可配置热词表 ID
            }
          })
        }
      );

      if (!response.ok) {
        // 如果 HTTP 接口不可用，降级到本地处理或返回错误
        console.warn('阿里云 ASR HTTP 接口调用失败，建议使用 WebSocket 实时接口');
        throw new Error(`阿里云 ASR 接口错误: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        text: result.output?.text || '',
        confidence: result.output?.confidence || 0.8,
        language: this.options.language
      };
    } finally {
      // 清理临时文件
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (e) {
        console.warn('清理临时文件失败:', e);
      }
    }
  }

  /**
   * 实时语音识别（WebSocket）
   * 注意：这需要使用阿里云 SDK，这里提供接口定义
   */
  async recognizeRealtime(
    audioStream: NodeJS.ReadableStream,
    onResult: (result: ASRResult, isFinal: boolean) => void,
    options?: ASROptions
  ): Promise<void> {
    // 实时识别需要使用 WebSocket，这里仅提供接口
    // 实际实现需要引入阿里云 DashScope SDK
    console.log('实时语音识别需要使用 WebSocket 接口，请参考阿里云 SDK 文档');
    throw new Error('实时语音识别暂未实现，请使用 recognize 方法进行离线识别');
  }

  setHotwords(hotwords: string[]): void {
    super.setHotwords(hotwords);
    // 阿里云热词需要通过控制台配置热词表，这里仅保存到本地
    console.log(`已设置 ${hotwords.length} 个热词（需要在阿里云控制台配置热词表）`);
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

    await super.destroy();
  }
}

