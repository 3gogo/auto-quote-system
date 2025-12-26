/**
 * 平台接口定义
 * 定义所有平台需要实现的统一接口
 */

/**
 * 平台类型
 */
export type PlatformType = 'miniprogram' | 'h5' | 'android' | 'ios';

/**
 * 录音结果
 */
export interface RecordResult {
  /** 录音时长（毫秒） */
  duration: number;
  /** 音频数据（Base64） */
  audioData: string;
  /** 音频格式 */
  format: string;
  /** 采样率 */
  sampleRate: number;
  /** 临时文件路径（如果有） */
  tempFilePath?: string;
}

/**
 * 录音配置
 */
export interface RecordOptions {
  /** 最大录音时长（毫秒） */
  maxDuration?: number;
  /** 采样率 */
  sampleRate?: number;
  /** 声道数 */
  numberOfChannels?: number;
  /** 编码格式 */
  format?: string;
}

/**
 * 录音服务接口
 */
export interface IRecorderService {
  /** 检查是否支持录音 */
  isSupported(): boolean;
  /** 请求录音权限 */
  requestPermission(): Promise<boolean>;
  /** 开始录音 */
  start(options?: RecordOptions): Promise<void>;
  /** 停止录音 */
  stop(): Promise<RecordResult>;
  /** 取消录音 */
  cancel(): void;
  /** 是否正在录音 */
  isRecording(): boolean;
  /** 设置录音开始回调 */
  onStart(callback: () => void): void;
  /** 设置录音错误回调 */
  onError(callback: (error: Error) => void): void;
}

/**
 * 音频播放服务接口
 */
export interface IAudioService {
  /** 播放 URL */
  playUrl(url: string): Promise<void>;
  /** 播放 Base64 音频 */
  playBase64(data: string, format?: string): Promise<void>;
  /** 停止播放 */
  stop(): void;
  /** 暂停播放 */
  pause(): void;
  /** 恢复播放 */
  resume(): void;
  /** 是否正在播放 */
  isPlaying(): boolean;
  /** 设置音量 */
  setVolume(volume: number): void;
  /** 设置播放结束回调 */
  onEnd(callback: () => void): void;
  /** 设置播放错误回调 */
  onError(callback: (error: Error) => void): void;
}

/**
 * 振动服务接口
 */
export interface IVibrateService {
  /** 短振动 */
  short(): void;
  /** 长振动 */
  long(): void;
}

/**
 * 提示服务接口
 */
export interface IToastService {
  /** 成功提示 */
  success(message: string): void;
  /** 错误提示 */
  error(message: string): void;
  /** 普通提示 */
  info(message: string): void;
  /** 显示加载 */
  showLoading(message?: string): void;
  /** 隐藏加载 */
  hideLoading(): void;
  /** 确认对话框 */
  confirm(options: {
    title: string;
    content: string;
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean>;
}

/**
 * 存储服务接口
 */
export interface IStorageService {
  /** 获取值 */
  get<T>(key: string): Promise<T | null>;
  /** 设置值 */
  set<T>(key: string, value: T): Promise<void>;
  /** 移除值 */
  remove(key: string): Promise<void>;
  /** 清除所有 */
  clear(): Promise<void>;
}

/**
 * 平台适配器接口
 */
export interface IPlatformAdapter {
  /** 平台类型 */
  readonly type: PlatformType;
  /** 录音服务 */
  readonly recorder: IRecorderService;
  /** 音频服务 */
  readonly audio: IAudioService;
  /** 振动服务 */
  readonly vibrate: IVibrateService;
  /** 提示服务 */
  readonly toast: IToastService;
  /** 存储服务 */
  readonly storage: IStorageService;
  /** 初始化 */
  init(): Promise<void>;
}

