/**
 * ASR Provider 抽象层
 * 支持多种 ASR 后端切换：Whisper、阿里云 Paraformer 等
 */

import { ASRResult, ASROptions } from './asr-engine';

/**
 * ASR Provider 接口
 */
export interface ASRProvider {
  /** Provider 名称 */
  readonly name: string;
  
  /** Provider 类型 */
  readonly type: 'whisper' | 'aliyun-paraformer' | 'aliyun-funasr' | 'vosk' | 'xunfei';

  /**
   * 初始化 Provider
   */
  init(): Promise<void>;

  /**
   * 识别音频
   * @param audioBuffer 音频数据
   * @param options 识别选项
   */
  recognize(audioBuffer: Buffer, options?: ASROptions): Promise<ASRResult>;

  /**
   * 从文件识别
   * @param filePath 音频文件路径
   * @param options 识别选项
   */
  recognizeFromFile(filePath: string, options?: ASROptions): Promise<ASRResult>;

  /**
   * 设置热词
   * @param hotwords 热词列表
   */
  setHotwords(hotwords: string[]): void;

  /**
   * 检查是否可用
   */
  isAvailable(): Promise<boolean>;

  /**
   * 获取配置
   */
  getOptions(): ASROptions;

  /**
   * 销毁资源
   */
  destroy(): Promise<void>;
}

/**
 * ASR Provider 配置
 */
export interface ASRProviderConfig {
  name: string;
  type: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  language?: string;
  sampleRate?: number;
  hotwords?: string[];
}

/**
 * ASR Provider 基类
 */
export abstract class BaseASRProvider implements ASRProvider {
  abstract readonly name: string;
  abstract readonly type: 'whisper' | 'aliyun-paraformer' | 'aliyun-funasr' | 'vosk' | 'xunfei';

  protected config: ASRProviderConfig;
  protected options: ASROptions = {};
  protected initialized: boolean = false;

  constructor(config: ASRProviderConfig) {
    this.config = config;
    this.options = {
      language: config.language || 'zh-CN',
      sampleRate: config.sampleRate || 16000,
      hotwords: config.hotwords || []
    };
  }

  abstract init(): Promise<void>;
  abstract recognize(audioBuffer: Buffer, options?: ASROptions): Promise<ASRResult>;
  abstract recognizeFromFile(filePath: string, options?: ASROptions): Promise<ASRResult>;

  setHotwords(hotwords: string[]): void {
    this.options.hotwords = hotwords;
  }

  async isAvailable(): Promise<boolean> {
    return this.initialized;
  }

  getOptions(): ASROptions {
    return { ...this.options };
  }

  async destroy(): Promise<void> {
    this.initialized = false;
  }
}

/**
 * ASR Provider 工厂
 */
export class ASRProviderFactory {
  private static providers: Map<string, ASRProvider> = new Map();
  private static defaultProvider: string = 'whisper';

  /**
   * 注册 Provider
   */
  static register(provider: ASRProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * 获取 Provider
   */
  static get(name: string): ASRProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * 获取默认 Provider
   */
  static getDefault(): ASRProvider | undefined {
    return this.providers.get(this.defaultProvider);
  }

  /**
   * 设置默认 Provider
   */
  static setDefault(name: string): void {
    if (this.providers.has(name)) {
      this.defaultProvider = name;
    }
  }

  /**
   * 获取所有 Provider
   */
  static getAll(): ASRProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * 获取第一个可用的 Provider
   */
  static async getFirstAvailable(): Promise<ASRProvider | undefined> {
    for (const provider of this.providers.values()) {
      if (await provider.isAvailable()) {
        return provider;
      }
    }
    return undefined;
  }
}

