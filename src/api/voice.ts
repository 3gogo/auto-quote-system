import express from 'express';
import { voiceService } from '../services/voice-service';
import { hotwordService } from '../services/hotword-service';
import { conversationManager } from '../services/conversation-manager';
import { VoiceRecognitionRequest, VoiceRecognitionResponse, TTSSynthesisRequest, TTSSynthesisResponse } from '../types/voice';
import * as fs from 'fs';
import * as path from 'path';
import { Request, Response } from 'express';

const router = express.Router();

/**
 * 语音处理端点（小程序专用）
 * 集成语音识别、NLU 处理、报价生成和 TTS 合成
 */
router.post('/process', async (req: Request, res: Response) => {
  try {
    const { 
      sessionId, 
      audioData, 
      audioFormat = 'mp3',
      sampleRate = 16000,
      partnerId 
    } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: { message: '缺少会话 ID', code: 'MISSING_SESSION_ID' }
      });
    }

    if (!audioData) {
      return res.status(400).json({
        success: false,
        error: { message: '缺少音频数据', code: 'MISSING_AUDIO_DATA' }
      });
    }

    // 1. 解码音频数据
    let audioBuffer: Buffer;
    try {
      audioBuffer = Buffer.from(audioData, 'base64');
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: { message: '音频数据格式错误', code: 'INVALID_AUDIO_FORMAT' }
      });
    }

    // 2. 获取热词并执行语音识别
    await hotwordService.refreshIfNeeded();
    const hotwordsList = hotwordService.getAllHotwords();
    voiceService.setHotwords(hotwordsList);

    const asrResult = await voiceService.recognizeSpeech(audioBuffer, {
      language: 'zh-CN',
      hotwords: hotwordsList
    });

    const recognizedText = asrResult.text;
    console.log(`[语音处理] 识别结果: ${recognizedText}`);

    if (!recognizedText || recognizedText.trim().length === 0) {
      return res.json({
        success: true,
        data: {
          recognizedText: '',
          response: {
            text: '抱歉，没有识别到语音内容，请再说一次',
            audioData: null
          },
          quote: null
        }
      });
    }

    // 3. 使用会话管理器处理文本
    const conversationResult = await conversationManager.processInput({
      sessionId,
      text: recognizedText,
      partnerId
    });

    // 4. 生成 TTS 回复
    let audioResponseData: string | null = null;
    if (conversationResult.text) {
      try {
        const ttsResult = await voiceService.synthesizeSpeech(conversationResult.text, {
          speaker: 'default',
          speed: 1.0,
          volume: 80,
          format: 'mp3',
          sampleRate: 16000,
          language: 'zh-CN'
        });
        
        if (ttsResult.buffer) {
          audioResponseData = ttsResult.buffer.toString('base64');
        }
      } catch (ttsError) {
        console.error('[语音处理] TTS 合成失败:', ttsError);
        // TTS 失败不影响主流程
      }
    }

    // 5. 构建报价数据
    let quoteData = null;
    if (conversationResult.quote && conversationResult.quote.items.length > 0) {
      quoteData = {
        items: conversationResult.quote.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit || '份',
          unitPrice: item.suggestedUnitPrice,
          totalPrice: item.suggestedSubtotal
        })),
        totalAmount: conversationResult.quote.totalSuggestedPrice,
        customerName: conversationResult.context?.currentPartner?.name || null,
        partnerId: conversationResult.context?.currentPartner?.id || partnerId
      };
    }

    return res.json({
      success: true,
      data: {
        recognizedText,
        response: {
          text: conversationResult.text,
          audioData: audioResponseData
        },
        quote: quoteData,
        intent: conversationResult.intent,
        state: conversationResult.state
      }
    });

  } catch (error) {
    console.error('[语音处理] 错误:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : '语音处理失败',
        code: 'VOICE_PROCESS_ERROR'
      }
    });
  }
});

/**
 * 语音识别接口
 * 接收 base64 编码的音频数据，返回识别文本
 */
router.post('/recognize', async (req: Request, res: Response) => {
  try {
    const { audio, language, hotwords, context }: VoiceRecognitionRequest = req.body;

    if (!audio) {
      return res.status(400).json({
        error: {
          message: '缺少音频数据',
          code: 'MISSING_AUDIO'
        }
      });
    }

    // 解码 base64 音频数据
    let audioBuffer: Buffer;
    try {
      audioBuffer = Buffer.from(audio, 'base64');
    } catch (error) {
      return res.status(400).json({
        error: {
          message: '音频数据格式错误',
          code: 'INVALID_AUDIO_FORMAT'
        }
      });
    }

    // 从热词服务获取热词（条件刷新）
    await hotwordService.refreshIfNeeded();
    const hotwordsList = [
      ...hotwordService.getAllHotwords(),
      ...(hotwords || [])
    ];

    voiceService.setHotwords(hotwordsList);

    // 执行语音识别
    const startTime = Date.now();
    const result = await voiceService.recognizeSpeech(audioBuffer, {
      language: language || 'zh-CN',
      hotwords: hotwordsList
    });
    const processingTime = Date.now() - startTime;

    const response: VoiceRecognitionResponse = {
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      result,
      processingTime
    };

    // 记录日志
    console.log(`语音识别成功: ${result.text} (置信度: ${result.confidence}, 耗时: ${processingTime}ms)`);

    return res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('语音识别失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : '语音识别失败',
        code: 'ASR_ERROR'
      }
    });
  }
});

/**
 * 语音识别测试接口（从文件）
 * 用于开发和测试
 */
router.post('/recognize/file', async (req: Request, res: Response) => {
  try {
    const { filePath, language, hotwords }: { filePath: string; language?: string; hotwords?: string[] } = req.body;

    if (!filePath) {
      return res.status(400).json({
        error: {
          message: '缺少文件路径',
          code: 'MISSING_FILE_PATH'
        }
      });
    }

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: {
          message: '音频文件不存在',
          code: 'FILE_NOT_FOUND'
        }
      });
    }

    // 从热词服务获取热词
    await hotwordService.refreshIfNeeded();
    const hotwordsList = [
      ...hotwordService.getAllHotwords(),
      ...(hotwords || [])
    ];

    voiceService.setHotwords(hotwordsList);

    // 执行语音识别
    const startTime = Date.now();
    const result = await voiceService.recognizeSpeechFromFile(filePath, {
      language: language || 'zh-CN',
      hotwords: hotwordsList
    });
    const processingTime = Date.now() - startTime;

    const response: VoiceRecognitionResponse = {
      requestId: `file_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      result,
      processingTime
    };

    console.log(`文件语音识别成功: ${result.text} (置信度: ${result.confidence}, 耗时: ${processingTime}ms)`);

    return res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('文件语音识别失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : '文件语音识别失败',
        code: 'ASR_FILE_ERROR'
      }
    });
  }
});

/**
 * 获取语音服务状态
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const options = voiceService.getOptions();

    return res.json({
      success: true,
      data: {
        status: 'initialized',
        engine: process.env.ASR_ENGINE || 'whisper',
        options
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        message: '获取状态失败',
        code: 'STATUS_ERROR'
      }
    });
  }
});

/**
 * 设置热词
 */
router.post('/hotwords', async (req: Request, res: Response) => {
  try {
    const { hotwords }: { hotwords: string[] } = req.body;

    if (!Array.isArray(hotwords)) {
      return res.status(400).json({
        error: {
          message: '热词必须是数组格式',
          code: 'INVALID_HOTWORDS'
        }
      });
    }

    voiceService.setHotwords(hotwords);

    return res.json({
      success: true,
      data: {
        hotwords,
        message: '热词设置成功'
      }
    });

  } catch (error) {
    console.error('设置热词失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : '设置热词失败',
        code: 'HOTWORDS_ERROR'
      }
    });
  }
});

/**
 * TTS 语音合成接口
 */
router.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, speaker, speed, volume, pitch, format, sampleRate, language }: TTSSynthesisRequest = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        error: {
          message: '文本不能为空',
          code: 'MISSING_TEXT'
        }
      });
    }

    // 执行 TTS 合成
    const startTime = Date.now();
    const result = await voiceService.synthesizeSpeech(text, {
      speaker: speaker || 'default',
      speed: speed || 1.0,
      volume: volume || 80,
      pitch: pitch || 0,
      format: format || 'wav',
      sampleRate: sampleRate || 16000,
      language: language || 'zh-CN'
    });
    const processingTime = Date.now() - startTime;

    const response: TTSSynthesisResponse = {
      requestId: `tts_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      audio: result,
      processingTime
    };

    // 记录日志
    console.log(`TTS 合成成功: ${text.substring(0, 50)} (耗时: ${processingTime}ms)`);

    return res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('TTS 合成失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'TTS 合成失败',
        code: 'TTS_ERROR'
      }
    });
  }
});

/**
 * TTS 语音合成并保存到文件
 */
router.post('/tts/file', async (req: Request, res: Response) => {
  try {
    const { text, filePath, speaker, speed, volume, pitch, format, sampleRate, language }:
      { text: string; filePath: string; speaker?: string; speed?: number; volume?: number; pitch?: number; format?: string; sampleRate?: number; language?: string } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        error: {
          message: '文本不能为空',
          code: 'MISSING_TEXT'
        }
      });
    }

    if (!filePath) {
      return res.status(400).json({
        error: {
          message: '缺少文件路径',
          code: 'MISSING_FILE_PATH'
        }
      });
    }

    // 执行 TTS 合成
    const startTime = Date.now();
    const result = await voiceService.synthesizeSpeechToFile(text, filePath, {
      speaker: speaker || 'default',
      speed: speed || 1.0,
      volume: volume || 80,
      pitch: pitch || 0,
      format: (format || 'wav') as 'wav' | 'mp3' | 'ogg',
      sampleRate: sampleRate || 16000,
      language: language || 'zh-CN'
    });
    const processingTime = Date.now() - startTime;

    const response: TTSSynthesisResponse = {
      requestId: `tts_file_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      audio: result,
      processingTime
    };

    console.log(`TTS 合成文件成功: ${filePath} (耗时: ${processingTime}ms)`);

    return res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('TTS 合成文件失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'TTS 合成文件失败',
        code: 'TTS_FILE_ERROR'
      }
    });
  }
});

/**
 * 获取 TTS 服务状态
 */
router.get('/tts/status', async (req: Request, res: Response) => {
  try {
    const options = voiceService.getTTSOptions();

    return res.json({
      success: true,
      data: {
        status: 'initialized',
        engine: process.env.TTS_ENGINE || 'paddle',
        options
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        message: '获取 TTS 状态失败',
        code: 'TTS_STATUS_ERROR'
      }
    });
  }
});

/**
 * 设置 TTS 参数
 */
router.post('/tts/settings', async (req: Request, res: Response) => {
  try {
    const { speaker, speed, volume, pitch }:
      { speaker?: string; speed?: number; volume?: number; pitch?: number } = req.body;

    if (speaker) voiceService.setTTSSpeaker(speaker);
    if (speed !== undefined) voiceService.setTTSspeed(speed);
    if (volume !== undefined) voiceService.setTTSVolume(volume);
    if (pitch !== undefined) voiceService.setTTSPitch(pitch);

    return res.json({
      success: true,
      data: {
        message: 'TTS 设置更新成功',
        settings: {
          speaker: voiceService.getTTSOptions().speaker,
          speed: voiceService.getTTSOptions().speed,
          volume: voiceService.getTTSOptions().volume,
          pitch: voiceService.getTTSOptions().pitch
        }
      }
    });

  } catch (error) {
    console.error('设置 TTS 参数失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : '设置 TTS 参数失败',
        code: 'TTS_SETTINGS_ERROR'
      }
    });
  }
});

export default router;