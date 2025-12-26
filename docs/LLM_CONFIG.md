# 大模型配置指南

本系统支持多种大语言模型 (LLM) 作为 NLU 后端，包括：

- OpenAI / OpenAI 兼容 API
- DeepSeek
- Gemini (通过兼容接口)
- Qwen (通义千问)
- GLM (智谱)
- 本地模型 (Ollama, vLLM)

## 🔧 环境变量配置

### OpenAI 兼容 API（推荐）

适用于所有遵循 OpenAI API 规范的服务。

```env
# API 密钥
OPENAI_API_KEY=sk-xxxxxxxxxxxx

# API 基础 URL
OPENAI_API_BASE=https://your-api-endpoint.com/v1

# 模型名称
OPENAI_MODEL=deepseek-ai/DeepSeek-V3

# 可选参数
OPENAI_TEMPERATURE=0.3
OPENAI_MAX_TOKENS=1024
OPENAI_TIMEOUT=30000
```

### 常见服务配置示例

#### DeepSeek

```env
OPENAI_API_KEY=your_deepseek_api_key
OPENAI_API_BASE=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
```

#### Gemini (通过兼容接口)

```env
OPENAI_API_KEY=your_gemini_api_key
OPENAI_API_BASE=https://your-gemini-compatible-endpoint/v1
OPENAI_MODEL=gemini-2.5-flash
```

#### Qwen (通义千问)

```env
OPENAI_API_KEY=your_qwen_api_key
OPENAI_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL=qwen-turbo
```

或使用阿里云原生 API：

```env
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxx
```

#### GLM (智谱)

```env
OPENAI_API_KEY=your_glm_api_key
OPENAI_API_BASE=https://open.bigmodel.cn/api/paas/v4
OPENAI_MODEL=glm-4
```

#### 本地模型 (Ollama)

```env
OPENAI_API_KEY=ollama  # Ollama 不需要真实 key，但需要有值
OPENAI_API_BASE=http://localhost:11434/v1
OPENAI_MODEL=llama3
```

## 📊 支持的模型列表

基于您提供的 API，以下模型可用：

### DeepSeek 系列
| 模型 | 说明 | 推荐场景 |
|------|------|----------|
| `deepseek-ai/DeepSeek-V3` | 最新版本 | 通用任务 |
| `deepseek-ai/DeepSeek-V3.1` | 增强版 | 复杂推理 |
| `deepseek-ai/DeepSeek-R1` | 推理模型 | 需要思考过程 |

### Gemini 系列
| 模型 | 说明 | 推荐场景 |
|------|------|----------|
| `gemini-2.5-flash` | 快速版 | 实时对话 ⭐ |
| `gemini-2.5-pro` | 专业版 | 复杂任务 |
| `gemini-3-flash-preview` | 预览版 | 测试新功能 |

### Qwen 系列
| 模型 | 说明 | 推荐场景 |
|------|------|----------|
| `Qwen/Qwen3-30B-A3B-Instruct-2507` | 轻量版 | 日常使用 |
| `Qwen/Qwen3-235B-A22B-Instruct-2507` | 完整版 | 高精度 |

### GLM 系列
| 模型 | 说明 | 推荐场景 |
|------|------|----------|
| `zai-org/GLM-4.5` | 标准版 | 通用任务 |
| `zai-org/GLM-4.5-Air` | 轻量版 | 快速响应 |
| `zai-org/GLM-4.6` | 最新版 | 最佳效果 |

## 🚀 快速开始

### 1. 配置环境变量

创建或编辑 `.env` 文件：

```env
# 使用您的 OpenAI 兼容 API
OPENAI_API_KEY=your_api_key_here
OPENAI_API_BASE=https://your-api-endpoint/v1
OPENAI_MODEL=deepseek-ai/DeepSeek-V3
```

### 2. 重启服务

```bash
npm run dev
```

### 3. 验证配置

查看日志，应该显示：

```
✅ 使用 OpenAI 兼容 Provider
✅ OpenAI 兼容 Provider 初始化成功: deepseek-ai/DeepSeek-V3 @ https://your-api-endpoint/v1
```

### 4. 测试 NLU

```bash
curl -X POST http://localhost:3001/api/conversation/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test", "text": "张三两瓶可乐多少钱"}'
```

## ⚙️ Provider 优先级

系统按以下顺序尝试初始化 AI Provider：

1. **OpenAI 兼容 Provider** - 如果设置了 `OPENAI_API_KEY`
2. **阿里云 Provider** - 如果设置了 `DASHSCOPE_API_KEY`
3. **规则层 Fallback** - 如果以上都不可用

## 🔄 动态切换模型

您可以通过修改环境变量来切换模型，无需修改代码：

```bash
# 切换到 Gemini
export OPENAI_MODEL=gemini-2.5-flash

# 重启服务
npm run dev
```

## 📝 自定义 Prompt

NLU 使用的 Prompt 定义在 `src/nlu/ai-provider.ts` 的 `buildNLUPrompt` 方法中。
您可以根据需要修改提示词以优化识别效果。

## 🐛 故障排查

### 1. API 连接失败

```
Error: 无法连接到 API 服务
```

检查：
- API Key 是否正确
- API Base URL 是否正确
- 网络是否可访问

### 2. 模型不支持

```
Error: Model not found
```

检查：
- 模型名称是否正确
- 该模型是否在您的 API 权限范围内

### 3. 响应超时

```
Error: 请求超时
```

解决：
- 增加超时时间：`OPENAI_TIMEOUT=60000`
- 使用更快的模型（如 flash 版本）

## 📊 性能对比

| 模型 | 响应时间 | 准确率 | 成本 | 推荐指数 |
|------|----------|--------|------|----------|
| gemini-2.5-flash | ~500ms | 高 | 低 | ⭐⭐⭐⭐⭐ |
| deepseek-v3 | ~800ms | 高 | 中 | ⭐⭐⭐⭐ |
| qwen-turbo | ~600ms | 中 | 低 | ⭐⭐⭐⭐ |
| gpt-4 | ~1500ms | 很高 | 高 | ⭐⭐⭐ |

对于小店报价场景，推荐使用 `gemini-2.5-flash` 或 `deepseek-v3`，
它们在速度和准确率之间取得了良好的平衡。

