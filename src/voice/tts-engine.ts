import { EventEmitter } from 'events';

export interface TTSAudio {
  /** 音频数据缓冲区 */
  buffer: Buffer;
  /** 音频格式 */
  format: string;
  /** 采样率 */
  sampleRate: number;
  /** 声道数 */
  channels: number;
  /** 时长（毫秒） */
  duration: number;
}

export interface TTSEngineOptions {
  /** 发音人 */
  speaker?: string;
  /** 语速（0.5-2.0） */
  speed?: number;
  /** 音量（0-100） */
  volume?: number;
  /** 音调（-100 到 100） */
  pitch?: number;
  /** 输出格式 */
  format?: 'wav' | 'mp3' | 'ogg';
  /** 采样率 */
  sampleRate?: number;
  /** 语言 */
  language?: string;
}

/**
 * TTS 引擎抽象类
 * 支持多种 TTS 引擎：PaddleSpeech、Edge-TTS、科大讯飞等
 */
export abstract class TTSEngine extends EventEmitter {
  protected options: TTSEngineOptions;

  constructor(options: TTSEngineOptions = {}) {
    super();
    this.options = {
      speaker: 'default',
      speed: 1.0,
      volume: 80,
      pitch: 0,
      format: 'wav',
      sampleRate: 16000,
      language: 'zh-CN',
      ...options
    };
  }

  /**
   * 生成语音
   * @param text 文本
   * @param options 合成选项
   * @returns 音频数据
   */
  abstract synthesize(text: string, options?: TTSEngineOptions): Promise<TTSAudio>;

  /**
   * 生成语音并保存到文件
   * @param text 文本
   * @param filePath 文件路径
   * @param options 合成选项
   * @returns 文件信息
   */
  abstract synthesizeToFile(text: string, filePath: string, options?: TTSEngineOptions): Promise<TTSAudio>;

  /**
   * 设置发音人
   * @param speaker 发音人ID
   */
  setSpeaker(speaker: string): void {
    this.options.speaker = speaker;
  }

  /**
   * 设置语速
   * @param speed 语速（0.5-2.0）
   */
  setSpeed(speed: number): void {
    this.options.speed = Math.max(0.5, Math.min(2.0, speed));
  }

  /**
   * 设置音量
   * @param volume 音量（0-100）
   */
  setVolume(volume: number): void {
    this.options.volume = Math.max(0, Math.min(100, volume));
  }

  /**
   * 设置音调
   * @param pitch 音调（-100 到 100）
   */
  setPitch(pitch: number): void {
    this.options.pitch = Math.max(-100, Math.min(100, pitch));
  }

  /**
   * 获取当前配置
   */
  getOptions(): TTSEngineOptions {
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