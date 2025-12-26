/**
 * H5/Web 平台适配器
 * 实现 Web 浏览器环境下的平台接口
 */

import type {
  IPlatformAdapter,
  IRecorderService,
  IAudioService,
  IVibrateService,
  IToastService,
  IStorageService,
  RecordResult,
  RecordOptions
} from './interface';
import { arrayBufferToBase64 } from '../shared/utils';

/**
 * H5 录音服务
 */
class H5RecorderService implements IRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private recording = false;
  private startTime = 0;
  private onStartCallback: (() => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;

  isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  }

  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch {
      return false;
    }
  }

  async start(options: RecordOptions = {}): Promise<void> {
    if (this.recording) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: options.sampleRate || 16000,
          channelCount: options.numberOfChannels || 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // 选择最佳的音频格式
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      this.audioChunks = [];
      this.startTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        if (this.onErrorCallback) {
          this.onErrorCallback(new Error('录音出错'));
        }
      };

      this.mediaRecorder.start(100); // 每 100ms 收集一次数据
      this.recording = true;

      if (this.onStartCallback) {
        this.onStartCallback();
      }

      // 设置最大录音时长
      const maxDuration = options.maxDuration || 60000;
      setTimeout(() => {
        if (this.recording) {
          this.stop();
        }
      }, maxDuration);

    } catch (error) {
      console.error('开始录音失败:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error instanceof Error ? error : new Error('录音失败'));
      }
      throw error;
    }
  }

  async stop(): Promise<RecordResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.recording) {
        reject(new Error('没有正在进行的录音'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const duration = Date.now() - this.startTime;
          const blob = new Blob(this.audioChunks, { type: this.mediaRecorder!.mimeType });
          
          // 转换为 ArrayBuffer 再转 Base64
          const arrayBuffer = await blob.arrayBuffer();
          const audioData = arrayBufferToBase64(arrayBuffer);

          // 清理
          this.cleanup();

          resolve({
            duration,
            audioData,
            format: this.getFormatFromMimeType(this.mediaRecorder!.mimeType),
            sampleRate: 16000
          });
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.stop();
      this.recording = false;
    });
  }

  cancel(): void {
    if (this.mediaRecorder && this.recording) {
      this.mediaRecorder.stop();
      this.recording = false;
    }
    this.cleanup();
  }

  isRecording(): boolean {
    return this.recording;
  }

  onStart(callback: () => void): void {
    this.onStartCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/mpeg'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'audio/webm';
  }

  private getFormatFromMimeType(mimeType: string): string {
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('mpeg')) return 'mp3';
    return 'webm';
  }
}

/**
 * H5 音频播放服务
 */
class H5AudioService implements IAudioService {
  private audio: HTMLAudioElement | null = null;
  private playing = false;
  private onEndCallback: (() => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;

  playUrl(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cleanup();
      
      this.audio = new Audio(url);
      this.setupEventListeners(resolve, reject);
      this.audio.play().catch(reject);
    });
  }

  playBase64(data: string, format = 'mp3'): Promise<void> {
    const mimeType = this.getMimeType(format);
    const url = `data:${mimeType};base64,${data}`;
    return this.playUrl(url);
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.playing = false;
    this.cleanup();
  }

  pause(): void {
    if (this.audio) {
      this.audio.pause();
    }
  }

  resume(): void {
    if (this.audio) {
      this.audio.play();
    }
  }

  isPlaying(): boolean {
    return this.playing;
  }

  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  onEnd(callback: () => void): void {
    this.onEndCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  private setupEventListeners(resolve: () => void, reject: (error: Error) => void): void {
    if (!this.audio) return;

    this.audio.onplay = () => {
      this.playing = true;
    };

    this.audio.onended = () => {
      this.playing = false;
      if (this.onEndCallback) {
        this.onEndCallback();
      }
      resolve();
    };

    this.audio.onerror = () => {
      this.playing = false;
      const error = new Error('音频播放失败');
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
      reject(error);
    };
  }

  private cleanup(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
  }

  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      webm: 'audio/webm',
      m4a: 'audio/mp4'
    };
    return mimeTypes[format] || 'audio/mpeg';
  }
}

/**
 * H5 振动服务
 */
class H5VibrateService implements IVibrateService {
  private isSupported(): boolean {
    return 'vibrate' in navigator;
  }

  short(): void {
    if (this.isSupported()) {
      navigator.vibrate(50);
    }
  }

  long(): void {
    if (this.isSupported()) {
      navigator.vibrate(200);
    }
  }
}

/**
 * H5 提示服务
 */
class H5ToastService implements IToastService {
  private loadingElement: HTMLElement | null = null;

  success(message: string): void {
    this.showToast(message, 'success');
  }

  error(message: string): void {
    this.showToast(message, 'error');
  }

  info(message: string): void {
    this.showToast(message, 'info');
  }

  showLoading(message = '加载中...'): void {
    this.hideLoading();
    
    this.loadingElement = document.createElement('div');
    this.loadingElement.className = 'platform-loading';
    this.loadingElement.innerHTML = `
      <div class="loading-mask"></div>
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">${message}</div>
      </div>
    `;
    document.body.appendChild(this.loadingElement);
  }

  hideLoading(): void {
    if (this.loadingElement) {
      this.loadingElement.remove();
      this.loadingElement = null;
    }
  }

  confirm(options: {
    title: string;
    content: string;
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      const result = window.confirm(`${options.title}\n\n${options.content}`);
      resolve(result);
    });
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    const toast = document.createElement('div');
    toast.className = `platform-toast platform-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // 动画显示
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // 2 秒后移除
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
}

/**
 * H5 存储服务
 */
class H5StorageService implements IStorageService {
  private prefix = 'auto_quote_';

  async get<T>(key: string): Promise<T | null> {
    const value = localStorage.getItem(this.prefix + key);
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(this.prefix + key, stringValue);
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(this.prefix + key);
  }

  async clear(): Promise<void> {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}

/**
 * H5 平台适配器
 */
export class H5Adapter implements IPlatformAdapter {
  readonly type = 'h5' as const;
  readonly recorder = new H5RecorderService();
  readonly audio = new H5AudioService();
  readonly vibrate = new H5VibrateService();
  readonly toast = new H5ToastService();
  readonly storage = new H5StorageService();

  async init(): Promise<void> {
    // 注入必要的样式
    this.injectStyles();
    console.log('[H5Adapter] 初始化完成');
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .platform-toast {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.8);
        background: rgba(0, 0, 0, 0.75);
        color: #fff;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 10000;
        opacity: 0;
        transition: all 0.3s ease;
        pointer-events: none;
      }
      .platform-toast.show {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      .platform-toast-success { background: rgba(82, 196, 26, 0.9); }
      .platform-toast-error { background: rgba(255, 77, 79, 0.9); }
      
      .platform-loading {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10001;
      }
      .loading-mask {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.3);
      }
      .loading-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.75);
        padding: 24px 32px;
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top-color: #fff;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      .loading-text {
        color: #fff;
        font-size: 14px;
        margin-top: 12px;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}

// 导出默认实例
export const h5Adapter = new H5Adapter();

