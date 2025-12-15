/**
 * Voice 模块导出
 */

// 服务
export { asrService, ASRService, ASRServiceConfig } from './asr-service';
export { voiceService } from '../services/voice-service';

// ASR Provider
export { ASRProvider, BaseASRProvider, ASRProviderFactory, ASRProviderConfig } from './asr-provider';
export { WhisperProvider, WhisperProviderConfig } from './providers/whisper-provider';
export { AliyunASRProvider, AliyunASRConfig } from './providers/aliyun-asr';

// 原有引擎（兼容）
export { ASREngine, ASRResult, ASROptions } from './asr-engine';
export { WhisperASREngine } from './whisper-asr';
export { TTSEngine, TTSOptions, TTSResult } from './tts-engine';
export { PaddleTTSEngine } from './paddle-tts';

