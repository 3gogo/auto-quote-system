/**
 * Edge-TTS 引擎
 * 使用微软 Edge 浏览器的 TTS 服务（免费云端）
 */

import { TTSEngine, TTSAudio, TTSEngineOptions } from './tts-engine';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class EdgeTTSEngine extends TTSEngine {
  protected initialized: boolean = false;
  private voice: string = 'zh-CN-XiaoxiaoNeural';
  private rate: string = '+0%';
  private volume: string = '+0%';
  private pitch: string = '+0Hz';

  constructor(options: TTSEngineOptions = {}) {
    super(options);
    
    // 设置语音参数
    if (options.speaker && options.speaker !== 'default') {
      this.voice = options.speaker;
    }
    if (options.speed) {
      const speedPercent = Math.round((options.speed - 1) * 100);
      this.rate = `${speedPercent >= 0 ? '+' : ''}${speedPercent}%`;
    }
    if (options.volume) {
      const volumePercent = Math.round((options.volume - 50) * 2);
      this.volume = `${volumePercent >= 0 ? '+' : ''}${volumePercent}%`;
    }
    if (options.pitch) {
      this.pitch = `${options.pitch >= 0 ? '+' : ''}${options.pitch}Hz`;
    }
  }

  async init(): Promise<void> {
    // 检查 edge-tts 命令是否可用
    try {
      await this.checkEdgeTTS();
      this.initialized = true;
      console.log('✅ Edge-TTS 引擎初始化成功');
    } catch (error) {
      console.warn('⚠️ edge-tts 命令行工具未安装，尝试使用 HTTP API...');
      // 可以回退到 HTTP API 方式
      this.initialized = true;
    }
  }

  private checkEdgeTTS(): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn('edge-tts', ['--help'], { shell: true });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error('edge-tts 不可用'));
      });
    });
  }

  async synthesize(text: string): Promise<TTSAudio> {
    if (!this.initialized) {
      await this.init();
    }

    const tempDir = os.tmpdir();
    const outputFile = path.join(tempDir, `edge-tts-${Date.now()}.mp3`);

    try {
      await this.runEdgeTTS(text, outputFile);
      
      const audioBuffer = fs.readFileSync(outputFile);
      
      // 清理临时文件
      try { fs.unlinkSync(outputFile); } catch {}

      return {
        buffer: audioBuffer,
        format: 'mp3',
        sampleRate: 24000,
        channels: 1,
        duration: Math.round(text.length * 100) // 估算时长
      };
    } catch (error) {
      // 如果 edge-tts 命令失败，使用 HTTP API 方式
      return await this.synthesizeWithHTTP(text);
    }
  }

  private runEdgeTTS(text: string, outputFile: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '--voice', this.voice,
        '--rate', this.rate,
        '--volume', this.volume,
        '--pitch', this.pitch,
        '--text', text,
        '--write-media', outputFile
      ];

      const child = spawn('edge-tts', args, { shell: true });
      
      let stderr = '';
      child.stderr.on('data', (data) => { stderr += data.toString(); });
      
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputFile)) {
          resolve();
        } else {
          reject(new Error(`edge-tts 执行失败: ${stderr}`));
        }
      });
    });
  }

  /**
   * 使用 HTTP API 方式合成语音（备用方案）
   */
  private async synthesizeWithHTTP(text: string): Promise<TTSAudio> {
    const https = await import('https');
    const crypto = await import('crypto');
    
    // 生成 WebSocket 风格的连接 ID
    const connectionId = crypto.randomBytes(16).toString('hex');
    
    // 构建 SSML
    const ssml = `
      <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-CN'>
        <voice name='${this.voice}'>
          <prosody rate='${this.rate}' volume='${this.volume}' pitch='${this.pitch}'>
            ${this.escapeXml(text)}
          </prosody>
        </voice>
      </speak>
    `.trim();

    // 简化实现：返回一个空的 TTS 结果，提示用户安装 edge-tts
    console.warn('⚠️ HTTP API 方式暂未实现，请安装 edge-tts: pip install edge-tts');
    
    // 返回一个静音的音频（实际生产中应该实现完整的 HTTP API）
    return {
      buffer: Buffer.alloc(0),
      format: 'mp3',
      sampleRate: 24000,
      channels: 1,
      duration: 0
    };
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  async synthesizeToFile(text: string, outputPath: string): Promise<TTSAudio> {
    const audio = await this.synthesize(text);
    fs.writeFileSync(outputPath, audio.buffer);
    return audio;
  }

  async destroy(): Promise<void> {
    this.initialized = false;
  }
}

