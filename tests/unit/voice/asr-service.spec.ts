import { ASRService } from '../../../src/voice/asr-service';
import { ASRProvider, ASRProviderFactory } from '../../../src/voice/asr-provider';
import { hotwordService } from '../../../src/services/hotword-service';
import { ASRResult, ASROptions } from '../../../src/voice/asr-engine';

// 模拟依赖
jest.mock('../../../src/voice/asr-provider');
jest.mock('../../../src/services/hotword-service');

describe('ASRService', () => {
  let asrService: ASRService;
  let mockProvider: jest.Mocked<ASRProvider>;

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();

    // 创建模拟 Provider
    mockProvider = {
      name: 'mock-provider',
      type: 'whisper', // 或者其他合法的 type
      init: jest.fn().mockResolvedValue(undefined),
      recognize: jest.fn(),
      recognizeFromFile: jest.fn(),
      setHotwords: jest.fn(),
      isAvailable: jest.fn().mockResolvedValue(true),
      getOptions: jest.fn().mockReturnValue({}),
      destroy: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ASRProvider>;

    // 模拟 Factory 返回模拟 Provider
    (ASRProviderFactory.getDefault as jest.Mock).mockReturnValue(mockProvider);
    (ASRProviderFactory.getFirstAvailable as jest.Mock).mockResolvedValue(mockProvider);
    (ASRProviderFactory.get as jest.Mock).mockReturnValue(mockProvider);
    (ASRProviderFactory.getAll as jest.Mock).mockReturnValue([mockProvider]);

    // 实例化 Service
    asrService = new ASRService({
      defaultProvider: 'whisper' as any, // 强制转换以避免类型检查（如果是私有类型）
      autoFallback: true,
      autoLoadHotwords: true
    });
  });

  describe('init', () => {
    it('应该正确初始化并设置默认 Provider', async () => {
      await asrService.init();

      expect(hotwordService.init).toHaveBeenCalled();
      expect(ASRProviderFactory.register).toHaveBeenCalled(); // 检查是否注册了 Provider
      expect(ASRProviderFactory.setDefault).toHaveBeenCalled();
      expect(mockProvider.init).toHaveBeenCalled();
      // 验证是否加载了热词
      expect(mockProvider.setHotwords).toHaveBeenCalled();
    });

    it('如果已经初始化，不应再次初始化', async () => {
      await asrService.init();
      await asrService.init();

      expect(hotwordService.init).toHaveBeenCalledTimes(1);
    });
  });

  describe('recognize', () => {
    const mockAudioBuffer = Buffer.from('mock audio');
    const mockResult: ASRResult = { text: '你好', confidence: 0.9, duration: 1000 };

    it('应该使用当前 Provider 进行识别', async () => {
      mockProvider.recognize.mockResolvedValue(mockResult);
      await asrService.init();

      const result = await asrService.recognize(mockAudioBuffer);

      expect(result).toEqual(mockResult);
      expect(mockProvider.recognize).toHaveBeenCalledWith(mockAudioBuffer, undefined);
    });

    it('如果在 init 前调用，应该自动 init', async () => {
      mockProvider.recognize.mockResolvedValue(mockResult);

      const result = await asrService.recognize(mockAudioBuffer);

      expect(result).toEqual(mockResult);
      expect(mockProvider.init).toHaveBeenCalled();
    });

    it('识别失败时应该尝试降级 (autoFallback=true)', async () => {
      const error = new Error('Recognize failed');
      mockProvider.recognize.mockRejectedValueOnce(error); // 第一次失败
      mockProvider.recognize.mockResolvedValueOnce(mockResult); // 第二次成功 (降级后的 Provider)

      // 模拟降级逻辑：Factory.getFirstAvailable 返回同一个 mockProvider
      (ASRProviderFactory.getFirstAvailable as jest.Mock).mockResolvedValue(mockProvider);

      await asrService.init();
      const result = await asrService.recognize(mockAudioBuffer);

      expect(result).toEqual(mockResult);
      expect(ASRProviderFactory.getFirstAvailable).toHaveBeenCalled();
      // 第一次调用失败，尝试降级后再次调用
      expect(mockProvider.recognize).toHaveBeenCalledTimes(2);
    });
  });

  describe('switchProvider', () => {
    it('应该能切换到存在的 Provider', async () => {
      await asrService.init();
      await asrService.switchProvider('mock-provider');

      expect(ASRProviderFactory.get).toHaveBeenCalledWith('mock-provider');
      expect(asrService.getCurrentProviderName()).toBe('mock-provider');
    });

    it('切换到不存在的 Provider 应该抛出错误', async () => {
      (ASRProviderFactory.get as jest.Mock).mockReturnValue(undefined);

      await expect(asrService.switchProvider('non-existent')).rejects.toThrow('未找到 ASR Provider: non-existent');
    });
  });
});
