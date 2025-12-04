/**
 * 语音识别结果
 */
export interface ASRResult {
  /** 识别出的文本 */
  text: string;
  /** 置信度（0-1） */
  confidence: number;
  /** 语言 */
  language?: string;
  /** 音频时长（毫秒） */
  duration?: number;
}

/**
 * 语音识别选项
 */
export interface ASROptions {
  /** 语言代码，如 'zh-CN', 'en-US' */
  language?: string;
  /** 采样率 */
  sampleRate?: number;
  /** 声道数 */
  channels?: number;
  /** 音频格式 */
  format?: string;
  /** 热词列表 */
  hotwords?: string[];
}

/**
 * 语音服务选项
 */
export interface VoiceRecognitionOptions extends ASROptions {
  /** ASR 引擎类型 */
  engine?: 'whisper' | 'vosk' | 'xunfei';
}

/**
 * TTS 选项
 */
export interface TTSEngine {
  /** 发音人 */
  speaker?: string;
  /** 语速 */
  speed?: number;
  /** 音量 */
  volume?: number;
  /** 音调 */
  pitch?: number;
}

/**
 * 语音文件信息
 */
export interface AudioFileInfo {
  /** 文件路径 */
  path: string;
  /** 文件大小 */
  size: number;
  /** 时长（毫秒） */
  duration: number;
  /** 采样率 */
  sampleRate: number;
  /** 声道数 */
  channels: number;
  /** 格式 */
  format: string;
}

/**
 * 语音识别请求
 */
export interface VoiceRecognitionRequest {
  /** 音频数据（base64） */
  audio: string;
  /** 语言 */
  language?: string;
  /** 热词 */
  hotwords?: string[];
  /** 上下文信息 */
  context?: {
    /** 顾客 ID */
    customerId?: string;
    /** 商品列表 */
    items?: Array<{
      name: string;
      quantity: number;
      unit: string;
    }>;
  };
}

/**
 * 语音识别响应
 */
export interface VoiceRecognitionResponse {
  /** 请求 ID */
  requestId: string;
  /** 识别结果 */
  result: ASRResult;
  /** 处理时间（毫秒） */
  processingTime: number;
}

/**
 * TTS 合成请求
 */
export interface TTSSynthesisRequest {
  /** 要合成的文本 */
  text: string;
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
 * TTS 合成响应
 */
export interface TTSSynthesisResponse {
  /** 请求 ID */
  requestId: string;
  /** 音频信息 */
  audio: TTSAudio;
  /** 处理时间（毫秒） */
  processingTime: number;
}