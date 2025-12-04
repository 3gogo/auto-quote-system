# 语音合成模块 (TTS)

## 概述

语音合成模块负责将文本转换为语音，支持多种 TTS 引擎：

- **PaddleSpeech** (本地，推荐)
- **Edge-TTS** (云端，待实现)
- **科大讯飞** (云端，待实现)

## 快速开始

### 1. 安装 PaddleSpeech

```bash
# 使用 pip 安装
pip install paddlespeech

# 或者使用 conda
conda install -c paddle paddlespeech
```

### 2. 配置环境变量

```bash
# .env 文件
TTS_ENGINE=paddle
PADDLE_SPEECH_PATH=paddlespeech
PADDLE_MODEL_PATH=/path/to/paddlespeech_model
```

### 3. 使用示例

```typescript
import { voiceService } from '../services/voice-service';

// 初始化
await voiceService.init({}, {
  engine: 'paddle',
  language: 'zh-CN',
  speaker: 'default',
  speed: 1.0,
  volume: 80
});

// 合成语音
const result = await voiceService.synthesizeSpeech('您好，欢迎光临小店');
console.log('TTS 合成成功，音频大小:', result.buffer.length);

// 合成并保存到文件
const audioFile = await voiceService.synthesizeSpeechToFile(
  '这是保存到文件的语音',
  '/path/to/output.wav'
);
console.log('TTS 文件合成成功:', audioFile);

// 设置参数
voiceService.setTTSSpeaker('default');
voiceService.setTTSspeed(1.2);
voiceService.setTTSVolume(90);
voiceService.setTTSPitch(0);
```

### 4. API 接口

#### POST /api/voice/tts

TTS 语音合成接口

**请求体：**
```json
{
  "text": "您好，欢迎光临小店",
  "speaker": "default",
  "speed": 1.0,
  "volume": 80,
  "pitch": 0,
  "format": "wav",
  "sampleRate": 16000,
  "language": "zh-CN"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "requestId": "tts_req_1234567890_abc",
    "audio": {
      "buffer": "base64_encoded_audio",
      "format": "wav",
      "sampleRate": 16000,
      "channels": 1,
      "duration": 3000
    },
    "processingTime": 1500
  }
}
```

#### POST /api/voice/tts/file

TTS 合成并保存到文件

**请求体：**
```json
{
  "text": "这是保存到文件的语音",
  "filePath": "/path/to/output.wav",
  "speaker": "default",
  "speed": 1.0,
  "volume": 80
}
```

#### GET /api/voice/tts/status

获取 TTS 服务状态

#### POST /api/voice/tts/settings

设置 TTS 参数

**请求体：**
```json
{
  "speaker": "default",
  "speed": 1.2,
  "volume": 90,
  "pitch": 0
}
```

## 参数说明

### 发音人 (Speaker)

- **default**: 默认发音人
- **具体值**: 根据 PaddleSpeech 模型支持的发音人 ID

### 语速 (Speed)

- 范围：0.5 - 2.0
- 1.0 为正常语速
- 小于 1.0 为慢速，大于 1.0 为快速

### 音量 (Volume)

- 范围：0 - 100
- 默认值：80

### 音调 (Pitch)

- 范围：-100 - 100
- 默认值：0

### 输出格式

- **wav**: WAV 格式（推荐）
- **mp3**: MP3 格式
- **ogg**: OGG 格式

## 性能优化

1. **使用本地模型**：PaddleSpeech 本地运行延迟更低
2. **合理设置参数**：避免极端参数值影响语音质量
3. **批量处理**：对于大量文本，建议批量处理
4. **缓存机制**：对于相同文本，可以缓存结果避免重复合成

## 故障排除

### 常见问题

1. **PaddleSpeech 不可用**
   - 检查 `PADDLE_SPEECH_PATH` 环境变量
   - 确认已安装 PaddleSpeech

2. **模型文件不存在**
   - 检查 `PADDLE_MODEL_PATH` 环境变量
   - 确认模型文件已下载

3. **合成质量差**
   - 尝试调整语速、音量、音调参数
   - 使用更高质量的模型

4. **合成速度慢**
   - 使用更小的模型
   - 升级硬件配置

## 扩展

如需添加新的 TTS 引擎，继承 `TTSEngine` 抽象类并实现相应方法即可。

### 示例：添加 Edge-TTS 引擎

```typescript
import { TTSEngine, TTSAudio, TTSEngineOptions } from './tts-engine';

export class EdgeTTSEngine extends TTSEngine {
  async init(): Promise<void> {
    // 初始化 Edge-TTS
  }

  async synthesize(text: string, options?: TTSEngineOptions): Promise<TTSAudio> {
    // 实现 Edge-TTS 合成逻辑
  }

  // ... 其他方法
}
```

然后在 `VoiceService` 中注册该引擎。