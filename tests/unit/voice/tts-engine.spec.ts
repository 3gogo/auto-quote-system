import { TTSEngine, TTSAudio, TTSEngineOptions } from '../../../src/voice/tts-engine';
import * as fs from 'fs';
import * as path from 'path';

// 模拟 TTSEngine 实现，因为 TTSEngine 是抽象类
class MockTTSEngine extends TTSEngine {
  constructor(options: TTSEngineOptions = {}) {
    super(options);
  }

  async init(): Promise<void> {}
  async destroy(): Promise<void> {}

  async synthesize(text: string, options?: TTSEngineOptions): Promise<TTSAudio> {
    const opts = { ...this.options, ...options };
    return {
      buffer: Buffer.from(`mock audio for ${text}`),
      format: opts.format || 'wav',
      sampleRate: opts.sampleRate || 16000,
      channels: 1,
      duration: 1000
    };
  }

  async synthesizeToFile(text: string, filePath: string, options?: TTSEngineOptions): Promise<TTSAudio> {
    const result = await this.synthesize(text, options);
    // 模拟写文件
    // fs.writeFileSync(filePath, result.buffer); 
    // 在测试中我们可能不希望真的写文件，或者 mock fs
    return result;
  }
}

describe('TTSEngine', () => {
  let ttsEngine: MockTTSEngine;

  beforeEach(() => {
    ttsEngine = new MockTTSEngine({
      speaker: 'test-speaker',
      speed: 1.2,
      volume: 90
    });
  });

  describe('配置管理', () => {
    it('应该使用默认配置初始化', () => {
      const engine = new MockTTSEngine();
      const options = engine.getOptions();
      
      expect(options.speaker).toBe('default');
      expect(options.speed).toBe(1.0);
      expect(options.volume).toBe(80);
      expect(options.pitch).toBe(0);
      expect(options.format).toBe('wav');
    });

    it('应该正确应用自定义配置', () => {
      const options = ttsEngine.getOptions();
      expect(options.speaker).toBe('test-speaker');
      expect(options.speed).toBe(1.2);
      expect(options.volume).toBe(90);
    });

    it('setSpeaker 应该更新发音人', () => {
      ttsEngine.setSpeaker('new-speaker');
      expect(ttsEngine.getOptions().speaker).toBe('new-speaker');
    });

    it('setSpeed 应该限制语速范围 (0.5-2.0)', () => {
      ttsEngine.setSpeed(0.1);
      expect(ttsEngine.getOptions().speed).toBe(0.5);

      ttsEngine.setSpeed(3.0);
      expect(ttsEngine.getOptions().speed).toBe(2.0);

      ttsEngine.setSpeed(1.5);
      expect(ttsEngine.getOptions().speed).toBe(1.5);
    });

    it('setVolume 应该限制音量范围 (0-100)', () => {
      ttsEngine.setVolume(-10);
      expect(ttsEngine.getOptions().volume).toBe(0);

      ttsEngine.setVolume(120);
      expect(ttsEngine.getOptions().volume).toBe(100);

      ttsEngine.setVolume(50);
      expect(ttsEngine.getOptions().volume).toBe(50);
    });

    it('setPitch 应该限制音调范围 (-100 到 100)', () => {
      ttsEngine.setPitch(-200);
      expect(ttsEngine.getOptions().pitch).toBe(-100);

      ttsEngine.setPitch(200);
      expect(ttsEngine.getOptions().pitch).toBe(100);

      ttsEngine.setPitch(10);
      expect(ttsEngine.getOptions().pitch).toBe(10);
    });
  });

  describe('synthesize', () => {
    it('应该返回模拟的音频数据', async () => {
      const text = '测试文本';
      const result = await ttsEngine.synthesize(text);

      expect(result.buffer.toString()).toContain('mock audio for 测试文本');
      expect(result.duration).toBe(1000);
      expect(result.sampleRate).toBe(16000);
    });

    it('调用时提供的选项应该覆盖默认选项', async () => {
      const text = '测试文本';
      const result = await ttsEngine.synthesize(text, { sampleRate: 8000 });

      expect(result.sampleRate).toBe(8000);
      // 原有配置不应改变
      expect(ttsEngine.getOptions().sampleRate).toBe(16000);
    });
  });
});
