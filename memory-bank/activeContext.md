# 当前工作上下文

## 当前任务
阶段 7 语音功能完善已全部完成 ✅
1. ✅ TTS 语音合成（Edge-TTS） [2025-12-26]
2. ✅ ASR 语音识别（Whisper.cpp） [2025-12-26]
3. ✅ 语音功能测试 100% 通过 [2025-12-26]
4. ✅ 部署文档更新（语音配置） [2025-12-26]

## 最近变更 [2025-12-26]
- 🎉 **语音功能测试 100% 通过！** [2025-12-26 13:45]
  - TTS：Edge-TTS 云端引擎（~700ms 响应）
  - ASR：Whisper.cpp 本地引擎（~6-10s 识别）
  - 完整流程：音频→识别→NLU→回复→TTS
- 🎉 **大模型 NLU 评估完成！** [2025-12-26]
  - 强制 AI 模式通过率：90%
  - 混合模式通过率：82.4%
  - 评估报告：docs/LLM_EVALUATION_REPORT.md
- 🎉 **大模型提示词优化** [2025-12-26]
  - 增加单字确认、上下文理解、数量单位规则
- 🎉 **部署文档更新** [2025-12-26]
  - 语音功能配置说明
  - Docker 支持 edge-tts + whisper.cpp

### 微信小程序 (miniprogram/)
- project.config.json：项目配置
- app.json/app.js/app.wxss：应用入口
- pages/index：语音报价首页
- pages/records：交易记录页面
- pages/settings：设置页面
- utils/：工具函数（api.js, recorder.js, audio.js, util.js）

### 跨平台客户端 (client/)
- 🚀 共享层 (shared/)：API、类型、工具函数
- 🚀 平台兼容层 (platform/)：统一接口 + H5 适配器
- 🚀 H5 Web 应用 (h5/)：Vue 3 + Vite + Pinia
- 🚀 Android APP (android/)：WebView + JSBridge

### 后端 API 扩展
- /api/voice/process：整合语音识别+NLU+报价+TTS
- 更新 ConversationInput/Output 类型
- 🎉 **阶段 3 智能优化已完成！**
- 🚀 完成向量嵌入服务（src/embedding/）
  - EmbeddingService：阿里云 text-embedding-v3 集成
  - AliasClusterService：DBSCAN 风格聚类算法
  - CandidateDiscoveryService：商品/顾客自动发现
- 🚀 完成智能定价增强（src/pricing/）
  - HistoryLearningService：价格分布+时间衰减+置信度
  - ProfitAnalysisService：毛利分析+砍价识别
  - RuleRecommendationService：自动规则推荐
- 🚀 完成性能优化（src/cache/）
  - CacheService：Redis 缓存+内存降级
- 🚀 完成后台管理界面（admin/）
  - React + Vite + Ant Design Mobile
  - 交易记录、商品管理、顾客管理、统计报表
- 🚀 完成 NLU 模块（src/nlu/）
  - 意图分类器：支持6种意图类型
  - 实体抽取器：商品、顾客、数量、价格
  - AI Provider：阿里云通义千问适配
- 🚀 完成 ASR 抽象层（src/voice/）
  - 支持 Whisper（本地）和阿里云 Paraformer（方言）
  - 热词自动加载和刷新
- 🚀 完成定价引擎（src/pricing/）
  - 4级规则优先级：全局、分类、客户等级、特殊
  - 历史价格学习
  - 语音播报文本生成

## 关键决策
- NLU：规则优先 + AI 兜底（置信度<0.6时调用 AI）
- ASR：默认使用阿里云 paraformer-realtime-v2（支持方言）
- AI Provider 优先级：OpenAI 兼容 → 阿里云 → 规则层
- 热词从数据库动态加载
- 定价引擎支持 4 级规则优先级

## 验收测试
- 模块测试：npm run test:modules
- E2E 测试：npm run test:e2e（需先启动服务）
- 脚本位置：scripts/verify-modules.ts, scripts/e2e-test.ts

## 环境配置要求

### 大模型 API（二选一）
1. OpenAI 兼容 API：
   - OPENAI_API_KEY：API 密钥
   - OPENAI_API_BASE：API 地址
   - OPENAI_MODEL：模型名称

2. 阿里云百炼：
   - DASHSCOPE_API_KEY：阿里云百炼 API Key

### 语音功能配置
1. TTS 语音合成：
   - TTS_ENGINE=edge（推荐，云端免费）
   - 需安装：pip install edge-tts

2. ASR 语音识别：
   - ASR_ENGINE=whisper
   - WHISPER_CPP_PATH：whisper.cpp 可执行文件路径
   - WHISPER_MODEL_PATH：ggml-base.bin 模型路径
   - 需编译 whisper.cpp 并下载模型

### 文档
- 部署指南：docs/DEPLOYMENT.md
- 大模型配置：docs/LLM_CONFIG.md
- 评估报告：docs/LLM_EVALUATION_REPORT.md
