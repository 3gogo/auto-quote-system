import { EventEmitter } from 'events';

export interface ASRResult {
  text: string;
  confidence: number;
  language?: string;
  duration?: number;
}

export interface ASROptions {
  language?: string;
  sampleRate?: number;
  channels?: number;
  format?: string;
  hotwords?: string[];
}

/**
 * 语音识别引擎抽象类
 * 支持多种 ASR 引擎：Whisper.cpp、Vosk、科大讯飞等
 */
export abstract class ASREngine extends EventEmitter {
  protected options: ASROptions;

  constructor(options: ASROptions = {}) {
    super();
    this.options = {
      language: 'zh-CN',
      sampleRate: 16000,
      channels: 1,
      format: 'wav',
      hotwords: [],
      ...options
    };
  }

  /**
   * 识别音频文件
   * @param audioBuffer 音频数据缓冲区
   * @returns 识别结果
   */
  abstract recognize(audioBuffer: Buffer): Promise<ASRResult>;

  /**
   * 识别音频文件（从文件路径）
   * @param filePath 音频文件路径
   * @returns 识别结果
   */
  abstract recognizeFromFile(filePath: string): Promise<ASRResult>;

  /**
   * 设置热词
   * @param hotwords 热词列表
   */
  setHotwords(hotwords: string[]): void {
    this.options.hotwords = hotwords;
  }

  /**
   * 获取当前配置
   */
  getOptions(): ASROptions {
    return { ...this.options };
  }

  /**
   * 初始化引擎
   */
  abstract init(): Promise<void>;

  /**
   * 释放资源
   */
  abstract destroy(): Promise<void>;
}