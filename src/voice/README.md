# 语音识别模块 (ASR)

## 概述

语音识别模块负责将用户的语音输入转换为文本，支持多种 ASR 引擎：

- **Whisper.cpp** (本地，推荐)
- **Vosk** (本地)
- **科大讯飞** (云端，待实现)

## 快速开始

### 1. 安装依赖

```bash
# 安装 whisper.cpp (需要 C++ 编译环境)
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
make

# 下载模型文件
./models/download-ggml-model.sh base
```

### 2. 配置环境变量

```bash
# .env 文件
ASR_ENGINE=whisper
WHISPER_CPP_PATH=/path/to/whisper.cpp/main
WHISPER_MODEL_PATH=/path/to/ggml-base.bin
```

### 3. 使用示例

```typescript
import { voiceService } from '../services/voice-service';

// 初始化
await voiceService.init({
  engine: 'whisper',
  language: 'zh-CN',
  hotwords: ['可乐', '纸巾', '洗衣液']
});

// 识别语音
const result = await voiceService.recognizeSpeech(audioBuffer);
console.log('识别结果:', result.text);

// 设置热词
voiceService.setHotwords(['可口可乐', '心相印', '蓝月亮']);
```

### 4. API 接口

#### POST /api/voice/recognize

语音识别接口

**请求体：**
```json
{
  "audio": "base64_encoded_audio",
  "language": "zh-CN",
  "hotwords": ["可乐", "纸巾"],
  "context": {
    "customerId": "customer_001",
    "items": [
      {
        "name": "可乐",
        "quantity": 2,
        "unit": "瓶"
      }
    ]
  }
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "requestId": "req_1234567890_abc",
    "result": {
      "text": "张三两瓶可乐一包纸巾",
      "confidence": 0.95,
      "language": "zh-CN",
      "duration": 3000
    },
    "processingTime": 1500
  }
}
```

#### POST /api/voice/recognize/file

从文件识别语音（开发测试用）

**请求体：**
```json
{
  "filePath": "/path/to/audio.wav",
  "language": "zh-CN",
  "hotwords": ["可乐", "纸巾"]
}
```

#### GET /api/voice/status

获取语音服务状态

#### POST /api/voice/hotwords

设置热词

**请求体：**
```json
{
  "hotwords": ["可乐", "雪碧", "芬达"]
}
```

## 热词配置

热词可以显著提升特定词汇的识别准确率。建议配置以下热词：

### 商品类
- 饮料：可乐、雪碧、芬达、农夫山泉、娃哈哈
- 纸品：纸巾、抽纸、心相印、清风、维达
- 日化：洗衣液、蓝月亮、奥妙、汰渍

### 数量单位
- 瓶、包、袋、箱、盒、个、只

### 顾客称呼
- 张三、李四、王五、老李、小王

## 性能优化

1. **使用本地模型**：Whisper.cpp 本地运行延迟更低
2. **合理设置热词**：只添加高频词汇，避免过多热词影响性能
3. **音频格式**：推荐使用 16kHz 采样率的 WAV 格式
4. **批量处理**：对于大量音频文件，建议批量处理

## 故障排除

### 常见问题

1. **模型文件不存在**
   - 检查 `WHISPER_MODEL_PATH` 环境变量
   - 确认模型文件已下载

2. **whisper.cpp 可执行文件不存在**
   - 检查 `WHISPER_CPP_PATH` 环境变量
   - 确认已编译 whisper.cpp

3. **识别准确率低**
   - 添加相关热词
   - 检查音频质量
   - 尝试不同的语言设置

4. **识别速度慢**
   - 使用更小的模型（如 base 而非 large）
   - 升级硬件配置

## 扩展

如需添加新的 ASR 引擎，继承 `ASREngine` 抽象类并实现相应方法即可。