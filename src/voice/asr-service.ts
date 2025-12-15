/**
 * ASR 服务
 * 统一的语音识别入口，管理多种 ASR Provider
 */

import { ASRProvider, ASRProviderFactory } from './asr-provider';
import { ASRResult, ASROptions } from './asr-engine';
import { WhisperProvider } from './providers/whisper-provider';
import { AliyunASRProvider } from './providers/aliyun-asr';
import { hotwordService } from '../services/hotword-service';

/**
 * ASR 服务配置
 */
export interface ASRServiceConfig {
  /** 默认 Provider */
  defaultProvider?: 'whisper' | 'aliyun-paraformer';
  /** 是否自动切换（当默认不可用时） */
  autoFallback?: boolean;
  /** 是否自动加载热词 */
  autoLoadHotwords?: boolean;
}

/**
 * ASR 服务
 */
export class ASRService {
  private config: ASRServiceConfig;
  private initialized: boolean = false;
  private currentProvider?: ASRProvider;

  constructor(config: ASRServiceConfig = {}) {
    this.config = {
      defaultProvider: 'aliyun-paraformer',
      autoFallback: true,
      autoLoadHotwords: true,
      ...config
    };
  }

  /**
   * 初始化服务
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // 初始化热词服务
      if (this.config.autoLoadHotwords) {
        await hotwordService.init();
      }

      // 注册 Whisper Provider
      const whisperProvider = new WhisperProvider();
      ASRProviderFactory.register(whisperProvider);

      // 注册阿里云 Provider
      const aliyunProvider = new AliyunASRProvider({
        model: 'paraformer-realtime-v2',
        enableDialect: true
      });
      ASRProviderFactory.register(aliyunProvider);

      // 设置默认 Provider
      ASRProviderFactory.setDefault(this.config.defaultProvider!);

      // 初始化默认 Provider
      await this.initDefaultProvider();

      this.initialized = true;
      console.log('✅ ASR 服务初始化成功');
    } catch (error) {
      console.error('❌ ASR 服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 初始化默认 Provider
   */
  private async initDefaultProvider(): Promise<void> {
    const provider = ASRProviderFactory.getDefault();
    if (provider) {
      try {
        await provider.init();
        this.currentProvider = provider;

        // 加载热词
        if (this.config.autoLoadHotwords) {
          const hotwords = hotwordService.getAllHotwords();
          provider.setHotwords(hotwords);
        }
      } catch (error) {
        console.warn(`默认 Provider 初始化失败: ${error}`);
        if (this.config.autoFallback) {
          await this.fallbackToAvailable();
        }
      }
    }
  }

  /**
   * 降级到可用的 Provider
   */
  private async fallbackToAvailable(): Promise<void> {
    const available = await ASRProviderFactory.getFirstAvailable();
    if (available) {
      this.currentProvider = available;
      console.log(`已降级到 ASR Provider: ${available.name}`);
    } else {
      throw new Error('没有可用的 ASR Provider');
    }
  }

  /**
   * 识别音频
   */
  async recognize(audioBuffer: Buffer, options?: ASROptions): Promise<ASRResult> {
    if (!this.initialized) {
      await this.init();
    }

    if (!this.currentProvider) {
      throw new Error('没有可用的 ASR Provider');
    }

    // 刷新热词（如果需要）
    if (this.config.autoLoadHotwords) {
      await hotwordService.refreshIfNeeded();
      const hotwords = hotwordService.getAllHotwords();
      this.currentProvider.setHotwords(hotwords);
    }

    try {
      return await this.currentProvider.recognize(audioBuffer, options);
    } catch (error) {
      console.error('ASR 识别失败:', error);
      
      // 尝试降级
      if (this.config.autoFallback) {
        await this.fallbackToAvailable();
        if (this.currentProvider) {
          return await this.currentProvider.recognize(audioBuffer, options);
        }
      }
      
      throw error;
    }
  }

  /**
   * 从文件识别
   */
  async recognizeFromFile(filePath: string, options?: ASROptions): Promise<ASRResult> {
    if (!this.initialized) {
      await this.init();
    }

    if (!this.currentProvider) {
      throw new Error('没有可用的 ASR Provider');
    }

    return this.currentProvider.recognizeFromFile(filePath, options);
  }

  /**
   * 切换 Provider
   */
  async switchProvider(name: string): Promise<void> {
    const provider = ASRProviderFactory.get(name);
    if (!provider) {
      throw new Error(`未找到 ASR Provider: ${name}`);
    }

    if (!await provider.isAvailable()) {
      await provider.init();
    }

    this.currentProvider = provider;
    console.log(`已切换到 ASR Provider: ${name}`);
  }

  /**
   * 获取当前 Provider 名称
   */
  getCurrentProviderName(): string {
    return this.currentProvider?.name || 'none';
  }

  /**
   * 获取所有可用的 Provider
   */
  async getAvailableProviders(): Promise<string[]> {
    const providers = ASRProviderFactory.getAll();
    const available: string[] = [];
    
    for (const provider of providers) {
      if (await provider.isAvailable()) {
        available.push(provider.name);
      }
    }
    
    return available;
  }

  /**
   * 设置热词
   */
  setHotwords(hotwords: string[]): void {
    if (this.currentProvider) {
      this.currentProvider.setHotwords(hotwords);
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): ASRServiceConfig {
    return { ...this.config };
  }
}

// 导出单例
export const asrService = new ASRService();

