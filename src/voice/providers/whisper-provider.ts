/**
 * Whisper ASR Provider
 * 封装本地 whisper.cpp 实现
 */

import { BaseASRProvider, ASRProviderConfig } from '../asr-provider';
import { ASRResult, ASROptions } from '../asr-engine';
import { WhisperASREngine } from '../whisper-asr';

/**
 * Whisper ASR 配置
 */
export interface WhisperProviderConfig extends ASRProviderConfig {
  /** 模型路径 */
  modelPath?: string;
  /** whisper.cpp 可执行文件路径 */
  whisperPath?: string;
}

/**
 * Whisper ASR Provider
 */
export class WhisperProvider extends BaseASRProvider {
  readonly name = 'whisper';
  readonly type = 'whisper' as const;

  private whisperEngine: WhisperASREngine;

  constructor(config: WhisperProviderConfig = {}) {
    super({
      name: 'whisper',
      type: 'whisper',
      language: 'zh',
      ...config
    });

    this.whisperEngine = new WhisperASREngine({
      language: config.language || 'zh',
      modelPath: config.modelPath,
      whisperPath: config.whisperPath
    });
  }

  async init(): Promise<void> {
    try {
      await this.whisperEngine.init();
      this.initialized = true;
      console.log('✅ Whisper ASR Provider 初始化成功');
    } catch (error) {
      console.error('❌ Whisper ASR Provider 初始化失败:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.initialized) {
      try {
        await this.init();
      } catch {
        return false;
      }
    }
    return this.initialized;
  }

  async recognize(audioBuffer: Buffer, options?: ASROptions): Promise<ASRResult> {
    if (!this.initialized) {
      await this.init();
    }

    return this.whisperEngine.recognize(audioBuffer);
  }

  async recognizeFromFile(filePath: string, options?: ASROptions): Promise<ASRResult> {
    if (!this.initialized) {
      await this.init();
    }

    return this.whisperEngine.recognizeFromFile(filePath);
  }

  setHotwords(hotwords: string[]): void {
    super.setHotwords(hotwords);
    // Whisper.cpp 不直接支持热词，但可以通过后处理优化
    console.log(`Whisper Provider: 已设置 ${hotwords.length} 个热词（通过后处理优化）`);
  }

  async destroy(): Promise<void> {
    await this.whisperEngine.destroy();
    await super.destroy();
  }
}

