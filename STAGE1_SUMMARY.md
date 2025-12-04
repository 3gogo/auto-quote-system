# 小店 AI 报价助手 - 阶段 1 (MVP) 开发总结

> 项目名称：小店 AI 报价助手  \n阶段：阶段 1 (MVP)  \n状态：✅ 已完成  \n完成时间：2025-01-01

---

## 📋 阶段概述

阶段 1 (MVP) 的目标是构建一个最小可行产品，实现**语音优先交互**和**基础报价功能**，为后续的自动记忆和智能优化功能奠定基础。

### 🎯 核心目标
- ✅ 项目初始化与环境搭建
- ✅ 数据库设计与 ORM 配置
- ✅ 语音识别 ASR 模块
- ✅ 语音合成 TTS 模块
- ✅ REST API 接口

---

## 📁 项目结构

```
auto-quote-system/
├── src/                          # 源代码目录
│   ├── api/                      # REST API 接口
│   │   ├── voice.ts              # 语音相关接口
│   ├── services/                 # 业务逻辑层
│   │   ├── voice-service.ts      # 语音服务
│   ├── voice/                    # 语音交互
│   │   ├── asr-engine.ts         # 语音识别引擎接口
│   │   ├── whisper-asr.ts        # Whisper.cpp 实现
│   │   ├── tts-engine.ts         # TTS 引擎接口
│   │   ├── paddle-tts.ts         # PaddleSpeech 实现
│   ├── database/                 # 数据访问层
│   │   ├── models/               # 数据模型
│   │   │   ├── product.ts        # 商品模型
│   │   │   ├── partner.ts        # 顾客/供货商模型
│   │   │   ├── pricing-rule.ts   # 定价规则模型
│   │   │   ├── transaction.ts    # 交易记录模型
│   │   │   ├── candidate-product.ts # 商品候选模型
│   │   │   └── candidate-partner.ts # 顾客候选模型
│   │   ├── repositories/         # 数据访问仓库
│   │   │   ├── base.repository.ts    # 基础仓库
│   │   │   ├── product.repository.ts # 商品仓库
│   │   │   ├── partner.repository.ts # 顾客仓库
│   │   │   └── index.ts              # 仓库管理器
│   │   └── index.ts              # 数据库服务
│   ├── types/                    # 类型定义
│   │   └── voice.ts              # 语音相关类型
│   ├── utils/                    # 通用工具
│   ├── config/                   # 配置文件
│   ├── tests/                    # 测试用例
│   └── index.ts                  # 应用入口
├── config/                       # 配置文件
│   ├── default.json              # 默认配置
├── scripts/                      # 脚本
├── docs/                         # 文档
├── package.json                  # 项目依赖
├── tsconfig.json                 # TypeScript 配置
├── .env.example                  # 环境变量示例
└── README.md                     # 项目说明
```

---

## 🛠️ 技术栈

### 核心技术
- **后端框架**：Node.js + Express + TypeScript
- **数据库**：MySQL 8.0
- **ORM**：TypeORM
- **缓存**：Redis（预留）
- **语音识别**：Whisper.cpp（本地）
- **语音合成**：PaddleSpeech（本地）
- **构建工具**：ts-node + nodemon

### 开发工具
- **代码规范**：ESLint + Prettier
- **日志**：Winston
- **安全**：Helmet + CORS + Rate Limit
- **监控**：Morgan（日志记录）

---

## 📊 已实现功能

### 1. 项目初始化与环境搭建 ✅

**完成内容**：
- ✅ 项目目录结构创建
- ✅ TypeScript 配置
- ✅ ESLint + Prettier 代码规范
- ✅ 环境变量配置
- ✅ 基础 Express 服务器
- ✅ 健康检查接口
- ✅ 优雅关闭处理

**关键文件**：
- `src/index.ts` - 应用入口
- `tsconfig.json` - TypeScript 配置
- `.env.example` - 环境变量示例
- `package.json` - 项目配置和脚本

### 2. 数据库设计与 ORM 配置 ✅

**完成内容**：
- ✅ 6 个核心数据表设计
- ✅ TypeORM 实体模型
- ✅ 数据库连接服务
- ✅ 基础数据仓库
- ✅ 数据库迁移脚本

**数据表**：
1. **products**（商品表）- 正式商品信息
2. **partners**（顾客/供货商表）- 顾客和供货商信息
3. **pricing_rules**（定价规则表）- 4 级规则优先级
4. **transactions**（交易记录表）- 原始交易日志
5. **candidate_products**（商品候选表）- 自动发现的商品候选
6. **candidate_partners**（顾客候选表）- 自动发现的顾客候选

**关键文件**：
- `src/database/models/*.ts` - 数据模型
- `src/database/repositories/*.ts` - 数据仓库
- `src/database/migrations/001-initial-schema.ts` - 数据库迁移

### 3. 语音识别 ASR 模块 ✅

**完成内容**：
- ✅ ASR 引擎抽象接口设计
- ✅ Whisper.cpp 本地实现
- ✅ 语音服务封装
- ✅ 热词配置支持
- ✅ 临时文件管理
- ✅ 错误处理

**核心特性**：
- 支持 base64 音频数据识别
- 支持从文件识别（开发测试用）
- 热词增强识别准确率
- 本地运行，低延迟
- 可扩展支持其他引擎（Vosk、科大讯飞）

**关键文件**：
- `src/voice/asr-engine.ts` - ASR 引擎接口
- `src/voice/whisper-asr.ts` - Whisper.cpp 实现
- `src/services/voice-service.ts` - 语音服务
- `src/api/voice.ts` - 语音 API 接口

### 4. 语音合成 TTS 模块 ✅

**完成内容**：
- ✅ TTS 引擎抽象接口设计
- ✅ PaddleSpeech 本地实现
- ✅ 语音合成服务
- ✅ 参数配置（发音人、语速、音量、音调）
- ✅ 文件保存功能
- ✅ 错误处理

**核心特性**：
- 支持文本到语音合成
- 支持多种参数调节
- 支持保存到文件
- 本地运行，低延迟
- 可扩展支持其他引擎

**关键文件**：
- `src/voice/tts-engine.ts` - TTS 引擎接口
- `src/voice/paddle-tts.ts` - PaddleSpeech 实现
- `src/services/voice-service.ts` - 语音服务（包含 TTS）
- `src/api/voice.ts` - 语音 API 接口（包含 TTS）

### 5. REST API 接口 ✅

**完成内容**：
- ✅ 语音识别 API
- ✅ 语音合成 API
- ✅ 状态查询 API
- ✅ 参数配置 API
- ✅ 错误处理中间件
- ✅ CORS 和安全配置

**API 端点**：

#### 语音识别
- `POST /api/voice/recognize` - 语音识别
- `POST /api/voice/recognize/file` - 从文件识别（开发用）
- `GET /api/voice/status` - 获取 ASR 状态
- `POST /api/voice/hotwords` - 设置热词

#### 语音合成
- `POST /api/voice/tts` - TTS 合成
- `POST /api/voice/tts/file` - TTS 合成到文件
- `GET /api/voice/tts/status` - 获取 TTS 状态
- `POST /api/voice/tts/settings` - 设置 TTS 参数

**关键文件**：
- `src/api/voice.ts` - 语音 API 实现

---

## 📝 项目配置

### 环境变量

```env
# 服务器配置
NODE_ENV=development
PORT=3001
LOG_LEVEL=info

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=auto_quote_system
DB_USER=root
DB_PASSWORD=your_password

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 语音配置
ASR_ENGINE=whisper  # whisper | vosk | xunfei
TTS_ENGINE=paddle   # paddle | edge

# NLU 配置
NLU_MODEL=ernie-tiny

# CORS 配置
CORS_ORIGIN=http://localhost:3000

# 安全配置
BCRYPT_ROUNDS=12

# ASR 引擎配置
WHISPER_CPP_PATH=/path/to/whisper.cpp/main
WHISPER_MODEL_PATH=/path/to/ggml-base.bin

# TTS 引擎配置
PADDLE_SPEECH_PATH=paddlespeech
PADDLE_MODEL_PATH=/path/to/paddlespeech_model
```

### 项目依赖

```json
{
  "dependencies": {
    "express": "^5.2.1",
    "typeorm": "^0.3.28",
    "mysql2": "^3.15.3",
    "redis": "^5.10.0",
    "winston": "^3.18.3",
    "cors": "^2.8.5",
    "helmet": "^8.1.0",
    "morgan": "^1.10.1",
    "dotenv": "^17.2.3"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "ts-node": "^10.9.2",
    "nodemon": "^3.1.11",
    "@types/node": "^24.10.1",
    "@types/express": "^5.0.6",
    "@types/cors": "^2.8.19",
    "@types/morgan": "^1.9.10",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0"
  }
}
```

---

## 🚀 快速开始

### 1. 环境准备

```bash
# 安装 Node.js (>= 18.0.0)
# 安装 MySQL (>= 8.0)
# 安装 Redis (>= 6.0)
```

### 2. 项目安装

```bash
# 克隆项目
git clone <repository-url>
cd auto-quote-system

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等
```

### 3. 数据库初始化

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE auto_quote_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 运行迁移（可选，也可以手动执行 SQL）
# 当前阶段使用手动执行 SQL 文件
mysql -u root -p auto_quote_system < src/database/migrations/001-initial-schema.ts
```

### 4. 语音引擎配置

#### Whisper.cpp (ASR)
```bash
# 安装 whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
make

# 下载模型
./models/download-ggml-model.sh base

# 配置环境变量
echo "WHISPER_CPP_PATH=/path/to/whisper.cpp/main" >> .env
echo "WHISPER_MODEL_PATH=/path/to/whisper.cpp/models/ggml-base.bin" >> .env
```

#### PaddleSpeech (TTS)
```bash
# 安装 PaddleSpeech
pip install paddlespeech

# 配置环境变量
echo "PADDLE_SPEECH_PATH=paddlespeech" >> .env
```

### 5. 启动服务

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 生产模式
npm start
```

### 6. 测试接口

```bash
# 健康检查
curl http://localhost:3001/health

# 获取 API 信息
curl http://localhost:3001/api

# 语音识别（示例）
curl -X POST http://localhost:3001/api/voice/recognize \
  -H "Content-Type: application/json" \
  -d '{"audio": "base64_encoded_audio", "language": "zh-CN"}'

# TTS 合成（示例）
curl -X POST http://localhost:3001/api/voice/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "您好，欢迎光临小店", "language": "zh-CN"}'
```

---

## 📚 文档

### 项目文档
- [需求文档](feature/ai_shop_requirements_zh.md)
- [技术架构](feature/ai_shop_architecture_zh.md)
- [开发指南](feature/ai_shop_development_guide_zh.md)

### 模块文档
- [语音识别模块](src/voice/README.md)
- [语音合成模块](src/voice/TTS_README.md)

### API 文档
API 文档将在阶段 2 完善，当前可通过以下方式查看：
- 健康检查接口：`GET /health`
- API 根路径：`GET /api`

---

## 🧪 测试计划（阶段 2 实现）

阶段 1 主要完成基础架构，测试将在阶段 2 实现：

### 单元测试
- [ ] ASR 引擎测试
- [ ] TTS 引擎测试
- [ ] 数据库模型测试
- [ ] 服务层测试

### 集成测试
- [ ] 语音识别完整流程测试
- [ ] 语音合成完整流程测试
- [ ] API 接口测试

### 性能测试
- [ ] 语音识别准确率测试
- [ ] 语音合成响应时间测试
- [ ] 并发处理能力测试

---

## 🎯 下一阶段计划（阶段 2：自动记忆）

### 核心任务
1. **NLU 意图识别** - 实现 5 个核心意图
2. **NLU 实体抽取** - 抽取顾客、商品、数量、价格
3. **基础定价引擎** - 4 级规则优先级匹配
4. **对话管理** - 多轮对话和上下文保持
5. **交易记录** - 完整的交易流程
6. **候选记忆层** - 商品和顾客自动发现
7. **后台管理界面** - Vue 3 实现

### 预期成果
- ✅ 完整的语音报价流程
- ✅ 基础的定价规则系统
- ✅ 自动记忆候选层
- ✅ 简单的后台管理界面

---

## ⚠️ 注意事项

### 语音引擎依赖
- **Whisper.cpp** 需要 C++ 编译环境（make、gcc）
- **PaddleSpeech** 需要 Python 环境和 pip
- 建议在 Linux/macOS 环境开发，Windows 可能需要额外配置

### 性能考虑
- 语音识别和合成是 CPU 密集型操作
- 建议使用性能较好的服务器
- 可考虑使用 GPU 加速（需要额外配置）

### 数据安全
- 当前阶段未实现用户认证
- 生产环境需要添加 JWT 认证
- 敏感数据需要加密存储

### 扩展性
- 模块化设计，易于扩展
- 支持多种 ASR/TTS 引擎切换
- 数据库设计支持后续功能扩展

---

## 📈 项目指标

### 代码质量
- TypeScript 严格模式
- ESLint + Prettier 规范
- 模块化设计
- 清晰的代码结构

### 性能目标
- 语音识别响应时间：< 3 秒
- TTS 合成响应时间：< 2 秒
- API 响应时间：< 100ms

### 可维护性
- 完善的文档
- 清晰的模块划分
- 统一的代码风格
- 良好的错误处理

---

## 🤝 团队协作

### Git 分支策略
- `main` - 生产环境
- `develop` - 开发环境
- `feature/*` - 功能分支
- `hotfix/*` - 紧急修复分支

### 代码审查
- 所有 PR 必须经过代码审查
- 使用 GitHub Pull Requests
- 审查要点：代码质量、测试覆盖、文档完整性

### 任务管理
- 使用 GitHub Issues 管理任务
- 按阶段和优先级分类
- 定期同步进度

---

## 📞 联系方式

如有问题或建议，请联系项目负责人。

---

## 📄 许可证

本项目采用 ISC 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

**文档版本**：v1.0  \n**最后更新**：2025-01-01  \n**下一更新**：阶段 2 完成后