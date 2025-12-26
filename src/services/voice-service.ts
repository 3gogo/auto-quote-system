import { ASREngine, ASRResult, ASROptions } from '../voice/asr-engine';
import { WhisperASREngine } from '../voice/whisper-asr';
import { TTSEngine, TTSAudio, TTSEngineOptions } from '../voice/tts-engine';
import { PaddleTTSEngine } from '../voice/paddle-tts';
import { EdgeTTSEngine } from '../voice/edge-tts';
import * as fs from 'fs';
import * as path from 'path';

export interface VoiceRecognitionOptions extends ASROptions {
  engine?: 'whisper' | 'vosk' | 'xunfei';
}

export interface TTSSynthesisOptions extends TTSEngineOptions {
  engine?: 'paddle' | 'edge' | 'xunfei';
}

/**
 * 语音服务
 * 负责语音识别和语音合成功能
 */
export class VoiceService {
  private asrEngine!: ASREngine;
  private ttsEngine!: TTSEngine;
  private initialized: boolean = false;

  constructor() {}

  /**
   * 初始化语音服务
   */
  async init(asrOptions: VoiceRecognitionOptions = {}, ttsOptions: TTSSynthesisOptions = {}): Promise<void> {
    if (this.initialized) {
      return;
    }

    let asrInitialized = false;
    let ttsInitialized = false;

    // 初始化 ASR 引擎（允许失败）
    const asrEngineType = asrOptions.engine || process.env.ASR_ENGINE || 'whisper';
    try {
      switch (asrEngineType) {
        case 'whisper':
          this.asrEngine = new WhisperASREngine(asrOptions);
          break;
        case 'vosk':
          throw new Error('Vosk 引擎尚未实现');
        case 'xunfei':
          throw new Error('科大讯飞引擎尚未实现');
        default:
          throw new Error(`不支持的 ASR 引擎: ${asrEngineType}`);
      }
      await this.asrEngine.init();
      asrInitialized = true;
      console.log(`✅ ASR 引擎初始化成功: ${asrEngineType}`);
    } catch (error) {
      console.warn(`⚠️ ASR 引擎初始化失败 (${asrEngineType}):`, error instanceof Error ? error.message : error);
      // ASR 失败不阻止服务启动
    }

    // 初始化 TTS 引擎
    const ttsEngineType = ttsOptions.engine || process.env.TTS_ENGINE || 'paddle';
    try {
      switch (ttsEngineType) {
        case 'paddle':
          this.ttsEngine = new PaddleTTSEngine(ttsOptions);
          break;
        case 'edge':
          this.ttsEngine = new EdgeTTSEngine(ttsOptions);
          break;
        case 'xunfei':
          throw new Error('科大讯飞 TTS 引擎尚未实现');
        default:
          throw new Error(`不支持的 TTS 引擎: ${ttsEngineType}`);
      }
      await this.ttsEngine.init();
      ttsInitialized = true;
      console.log(`✅ TTS 引擎初始化成功: ${ttsEngineType}`);
    } catch (error) {
      console.warn(`⚠️ TTS 引擎初始化失败 (${ttsEngineType}):`, error instanceof Error ? error.message : error);
    }

    // 至少一个引擎初始化成功即可
    if (asrInitialized || ttsInitialized) {
      this.initialized = true;
      console.log(`✅ 语音服务初始化完成，ASR: ${asrInitialized ? '可用' : '不可用'}, TTS: ${ttsInitialized ? '可用' : '不可用'}`);
    } else {
      throw new Error('语音服务初始化失败：ASR 和 TTS 引擎都不可用');
    }
  }

  /**
   * 识别语音
   * @param audioBuffer 音频数据
   * @param options 识别选项
   * @returns 识别结果
   */
  async recognizeSpeech(audioBuffer: Buffer, options?: VoiceRecognitionOptions): Promise<ASRResult> {
    if (!this.initialized) {
      await this.init(options);
    }

    try {
      const result = await this.asrEngine.recognize(audioBuffer);
      console.log('语音识别结果:', result.text);
      return result;
    } catch (error) {
      console.error('语音识别失败:', error);
      throw new Error('语音识别失败，请检查音频格式或网络连接');
    }
  }

  /**
   * 从文件识别语音
   * @param filePath 音频文件路径
   * @param options 识别选项
   * @returns 识别结果
   */
  async recognizeSpeechFromFile(filePath: string, options?: VoiceRecognitionOptions): Promise<ASRResult> {
    if (!this.initialized) {
      await this.init(options);
    }

    try {
      const result = await this.asrEngine.recognizeFromFile(filePath);
      console.log('语音识别结果:', result.text);
      return result;
    } catch (error) {
      console.error('语音识别失败:', error);
      throw new Error('语音识别失败，请检查音频文件');
    }
  }

  /**
   * 设置热词
   * @param hotwords 热词列表
   */
  setHotwords(hotwords: string[]): void {
    if (this.asrEngine) {
      this.asrEngine.setHotwords(hotwords);
    }
  }

  /**
   * 获取当前配置
   */
  getOptions(): ASROptions {
    return this.asrEngine ? this.asrEngine.getOptions() : {};
  }

  /**
   * 生成语音
   * @param text 文本
   * @param options 合成选项
   * @returns 音频数据
   */
  async synthesizeSpeech(text: string, options?: TTSSynthesisOptions): Promise<TTSAudio> {
    if (!this.initialized) {
      await this.init({}, options);
    }

    try {
      const result = await this.ttsEngine.synthesize(text, options);
      console.log('TTS 合成成功:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
      return result;
    } catch (error) {
      console.error('TTS 合成失败:', error);
      throw new Error('TTS 合成失败，请检查文本内容或引擎配置');
    }
  }

  /**
   * 生成语音并保存到文件
   * @param text 文本
   * @param filePath 文件路径
   * @param options 合成选项
   * @returns 音频数据
   */
  async synthesizeSpeechToFile(text: string, filePath: string, options?: TTSSynthesisOptions): Promise<TTSAudio> {
    if (!this.initialized) {
      await this.init({}, options);
    }

    try {
      const result = await this.ttsEngine.synthesizeToFile(text, filePath, options);
      console.log('TTS 合成文件成功:', filePath);
      return result;
    } catch (error) {
      console.error('TTS 合成文件失败:', error);
      throw new Error('TTS 合成文件失败，请检查文件路径或引擎配置');
    }
  }

  /**
   * 设置 TTS 发音人
   * @param speaker 发音人ID
   */
  setTTSSpeaker(speaker: string): void {
    if (this.ttsEngine) {
      this.ttsEngine.setSpeaker(speaker);
    }
  }

  /**
   * 设置 TTS 语速
   * @param speed 语速（0.5-2.0）
   */
  setTTSspeed(speed: number): void {
    if (this.ttsEngine) {
      this.ttsEngine.setSpeed(speed);
    }
  }

  /**
   * 设置 TTS 音量
   * @param volume 音量（0-100）
   */
  setTTSVolume(volume: number): void {
    if (this.ttsEngine) {
      this.ttsEngine.setVolume(volume);
    }
  }

  /**
   * 设置 TTS 音调
   * @param pitch 音调（-100 到 100）
   */
  setTTSPitch(pitch: number): void {
    if (this.ttsEngine) {
      this.ttsEngine.setPitch(pitch);
    }
  }

  /**
   * 获取 TTS 配置
   */
  getTTSOptions(): TTSEngineOptions {
    return this.ttsEngine ? this.ttsEngine.getOptions() : {};
  }

  /**
   * 释放资源
   */
  async destroy(): Promise<void> {
    if (this.asrEngine) {
      await this.asrEngine.destroy();
      this.asrEngine = null!;
    }
    if (this.ttsEngine) {
      await this.ttsEngine.destroy();
      this.ttsEngine = null!;
    }
    this.initialized = false;
  }
}

// 导出单例
export const voiceService = new VoiceService();