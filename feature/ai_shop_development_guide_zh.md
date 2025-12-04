# 小店 AI 报价助手 - 开发指南

> 版本：v1.0  \n适用场景：夫妻店 / 小杂货铺 / 小型便利店  \n目标：无数据自动记忆的 AI 报价系统开发实施指南

---

## 📋 开发计划总览

采用**三阶段迭代开发**方式，总计约 7–8 周：

| 阶段 | 目标 | 周期 | 优先级 |
|------|------|------|--------|
| 阶段 1 (MVP) | 语音交互 + 基础报价 | 2–3 周 | P0 |
| 阶段 2 (自动记忆) | 候选发现 + 后台复盘 | 2 周 | P1 |
| 阶段 3 (智能优化) | 向量聚类 + 规则推荐 | 2 周 | P2 |

---

## 📁 项目结构设计

```
auto-quote-system/
├── src/                          # 源代码目录
│   ├── api/                      # REST API 接口
│   │   ├── index.ts              # API 入口
│   │   ├── voice.ts              # 语音相关接口
│   │   ├── pricing.ts            # 定价接口
│   │   ├── memory.ts             # 记忆管理接口
│   │   └── admin.ts              # 后台管理接口
│   ├── services/                 # 业务逻辑层
│   │   ├── voice-service.ts      # 语音服务
│   │   ├── pricing-service.ts    # 定价服务
│   │   ├── memory-service.ts     # 记忆服务
│   │   ├── dialogue-service.ts   # 对话管理服务
│   │   └── admin-service.ts      # 后台管理服务
│   ├── nlu/                      # NLU 意图识别与实体抽取
│   │   ├── intent-classifier.ts  # 意图分类器
│   │   ├── entity-extractor.ts   # 实体抽取器
│   │   └── nlu-engine.ts         # NLU 引擎
│   ├── pricing/                  # 定价引擎
│   │   ├── rule-engine.ts        # 规则引擎
│   │   ├── historical-learner.ts # 历史学习器
│   │   └── pricing-calculator.ts # 定价计算器
│   ├── memory/                   # 记忆管理
│   │   ├── raw-transaction-log.ts    # 原始交易日志
│   │   ├── candidate-memory.ts       # 候选记忆层
│   │   ├── structured-memory.ts      # 结构化记忆层
│   │   └── memory-aggregator.ts      # 记忆聚合器
│   ├── voice/                    # 语音交互
│   │   ├── asr-engine.ts         # 语音识别引擎
│   │   ├── tts-engine.ts         # 语音合成引擎
│   │   └── wake-word-detector.ts # 唤醒词检测
│   ├── database/                 # 数据访问层
│   │   ├── models/               # 数据模型
│   │   │   ├── product.ts        # 商品模型
│   │   │   ├── partner.ts        # 顾客/供货商模型
│   │   │   ├── pricing-rule.ts   # 定价规则模型
│   │   │   ├── transaction.ts    # 交易记录模型
│   │   │   ├── candidate-product.ts # 商品候选模型
│   │   │   └── candidate-partner.ts # 顾客候选模型
│   │   ├── repositories/         # 数据访问仓库
│   │   ├── migrations/           # 数据库迁移脚本
│   │   └── seeders/              # 数据种子脚本
│   ├── admin/                    # 后台管理界面
│   │   ├── pages/                # 页面
│   │   ├── components/           # 组件
│   │   └── utils/                # 工具
│   ├── utils/                    # 通用工具
│   │   ├── logger.ts             # 日志工具
│   │   ├── config.ts             # 配置工具
│   │   ├── cache.ts              # 缓存工具
│   │   └── helpers.ts            # 辅助函数
│   ├── types/                    # 类型定义
│   ├── workers/                  # 后台任务
│   │   ├── memory-aggregation.ts # 记忆聚合任务
│   │   └── rule-recommendation.ts # 规则推荐任务
│   └── index.ts                  # 应用入口
├── scripts/                      # 脚本
│   ├── setup.sh                  # 环境搭建脚本
│   ├── deploy.sh                 # 部署脚本
│   └── backup.sh                 # 备份脚本
├── config/                       # 配置文件
│   ├── development.json          # 开发环境配置
│   ├── production.json           # 生产环境配置
│   └── default.json              # 默认配置
├── tests/                        # 测试用例
│   ├── unit/                     # 单元测试
│   ├── integration/              # 集成测试
│   └── e2e/                      # 端到端测试
├── docs/                         # 文档
│   ├── api.md                    # API 文档
│   ├── database.md               # 数据库设计文档
│   └── deployment.md             # 部署文档
├── docker/                       # Docker 相关
│   ├── Dockerfile                # Docker 构建文件
│   ├── docker-compose.yml        # Docker Compose 配置
│   └── nginx.conf                # Nginx 配置
├── package.json                  # 项目依赖
├── tsconfig.json                 # TypeScript 配置
├── .env.example                  # 环境变量示例
└── README.md                     # 项目说明
```

---

## 🛠️ 技术栈

### 核心技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 后端 | Node.js + Express | ^18.0.0 | 主服务框架 |
| 语言 | TypeScript | ^4.9.0 | 类型安全 |
| 数据库 | MySQL | 8.0+ | 主数据库 |
| 缓存 | Redis | 6+ | 缓存与会话 |
| ASR | Whisper.cpp | latest | 本地语音识别 |
| TTS | PaddleSpeech | latest | 本地语音合成 |
| NLU | ERNIE-Tiny | latest | 轻量级意图识别 |
| 前端 | Vue 3 + TypeScript | ^3.3.0 | 后台管理界面 |
| 构建 | Vite | ^4.0.0 | 前端构建工具 |
| 任务调度 | Bull + Redis | latest | 后台任务队列 |
| 容器 | Docker | latest | 容器化部署 |

### 开发工具

- **代码规范**：ESLint + Prettier
- **Git 规范**：Commitizen + Husky
- **测试框架**：Jest + Supertest
- **API 文档**：Swagger/OpenAPI
- **日志**：Winston
- **监控**：可选 Prometheus + Grafana

---

## 📝 阶段开发任务清单

### 阶段 1：MVP 原型（2–3 周，P0）

#### Week 1：基础框架搭建

**任务 1.1：项目初始化与环境搭建（1 天）**
- 目标：创建项目结构，配置开发环境
- 关键点：
  - 初始化 TypeScript + Express 项目
  - 配置 ESLint + Prettier
  - 设置 Git 仓库与 Husky 钩子
- 依赖：无
- 测试：项目能正常启动

**任务 1.2：数据库设计与 ORM 配置（1 天）**
- 目标：完成核心数据表设计与 ORM 映射
- 关键点：
  - 创建 products、partners、pricing_rules、transactions 表
  - 使用 TypeORM 或 Sequelize
  - 编写基础的 Repository
- 依赖：任务 1.1
- 测试：能正常连接数据库，CRUD 操作正常

**任务 1.3：语音识别 ASR 模块（2 天）**
- 目标：实现本地语音识别功能
- 关键点：
  - 集成 Whisper.cpp 或 Vosk
  - 实现音频流处理
  - 支持热词配置（商品名、顾客名）
- 依赖：任务 1.1
- 测试：能识别简单中文语音，准确率 >80%

**任务 1.4：语音合成 TTS 模块（1 天）**
- 目标：实现本地语音合成功能
- 关键点：
  - 集成 PaddleSpeech 或 Edge-TTS
  - 支持中文语音合成
  - 可配置语音参数（男女声、语速）
- 依赖：任务 1.1
- 测试：能正常播放中文语音

#### Week 2：NLU 与基础业务逻辑

**任务 1.5：NLU 意图识别（2 天）**
- 目标：实现 5 个核心意图的识别
- 关键点：
  - 使用 ERNIE-Tiny 或 MiniLM 训练意图分类模型
  - 意图：retail_quote、purchase_price_check、single_item_query、price_correction、confirm/deny
  - 实现置信度阈值判断
- 依赖：任务 1.2
- 测试：意图识别准确率 >85%

**任务 1.6：NLU 实体抽取（2 天）**
- 目标：实现关键实体的抽取
- 关键点：
  - 实体类型：顾客称呼、商品名、数量单位、价格
  - 结合规则匹配（正则表达式）提升召回率
  - 实现别名映射（如"可乐"→"可口可乐"）
- 依赖：任务 1.5
- 测试：实体抽取召回率 >80%

**任务 1.7：基础定价引擎（2 天）**
- 目标：实现基于规则的定价计算
- 关键点：
  - 实现 4 级规则优先级匹配
  - 支持成本价 × 系数计算
  - 实现简单抹零逻辑（舍入到整数）
- 依赖：任务 1.2、1.6
- 测试：能根据规则正确计算价格

#### Week 3：完整流程与 API

**任务 1.8：对话管理（1 天）**
- 目标：实现多轮对话管理
- 关键点：
  - 保持对话上下文（顾客、商品）
  - 实现追问逻辑（置信度低时）
  - 状态机管理对话流程
- 依赖：任务 1.5、1.6
- 测试：能进行简单的多轮对话

**任务 1.9：交易记录与记忆（1 天）**
- 目标：记录交易并存储到原始日志
- 关键点：
  - 保存完整交易信息（语音文本、解析结果、成交价）
  - 实现候选记忆的初步存储
  - 支持无数据启动场景
- 依赖：任务 1.2、1.7
- 测试：交易能正确记录到数据库

**任务 1.10：REST API 设计（1 天）**
- 目标：提供完整的 REST API 接口
- 关键点：
  - 语音报价接口
  - 价格确认接口
  - 交易查询接口
  - 使用 Swagger 生成文档
- 依赖：任务 1.7、1.8、1.9
- 测试：API 能正常调用，返回正确数据

**任务 1.11：单元测试与集成测试（1 天）**
- 目标：为 MVP 功能编写测试
- 关键点：
  - 核心模块单元测试覆盖率 >70%
  - 关键流程集成测试
  - 语音识别准确率测试
- 依赖：所有阶段 1 任务
- 测试：测试通过率 100%

---

### 阶段 2：自动记忆（2 周，P1）

#### Week 4：候选记忆层

**任务 2.1：商品候选发现（2 天）**
- 目标：从交易日志中自动发现商品候选
- 关键点：
  - 统计高频商品词
  - 实现文本相似度聚类（可选向量检索）
  - 合并别名（如"可乐"、"可口可乐"）
- 依赖：任务 1.9
- 测试：能正确识别和聚类商品别名

**任务 2.2：顾客候选发现（1 天）**
- 目标：从交易日志中自动发现顾客候选
- 关键点：
  - 统计高频顾客称呼
  - 记录顾客消费频次与金额
  - 支持称呼合并
- 依赖：任务 1.9
- 测试：能正确识别顾客并统计信息

**任务 2.3：候选记忆存储（1 天）**
- 目标：设计并实现候选记忆表结构
- 关键点：
  - candidate_products、candidate_partners 表
  - 存储频率、价格分布、别名簇
  - 实现候选到正式的转换逻辑
- 依赖：任务 2.1、2.2
- 测试：候选数据能正确存储和查询

#### Week 5：后台管理与复盘

**任务 2.4：后台管理界面（2 天）**
- 目标：实现简单的 Vue 3 后台管理界面
- 关键点：
  - 今日复盘页面
  - 高频商品候选展示与合并
  - 顾客类型设置
  - 规则一键生成
- 依赖：任务 2.3
- 测试：界面能正常展示和操作

**任务 2.5：记忆聚合任务（1 天）**
- 目标：实现后台定时任务聚合候选记忆
- 关键点：
  - 使用 Bull + Redis 实现任务队列
  - 每日定时执行候选聚合
  - 支持手动触发
- 依赖：任务 2.1、2.2
- 测试：任务能正常执行，数据正确聚合

**任务 2.6：规则推荐（1 天）**
- 目标：基于历史数据自动生成规则建议
- 关键点：
  - 识别稳定的价格模式
  - 推荐顾客+商品专用规则
  - 推荐类别规则
- 依赖：任务 2.1、2.2、2.3
- 测试：能生成合理的规则建议

---

### 阶段 3：智能优化（2 周，P2）

#### Week 6：向量检索优化

**任务 3.1：向量嵌入与检索（2 天）**
- 目标：使用向量检索优化别名聚类
- 关键点：
  - 集成 Sentence-BERT 生成文本向量
  - 使用 Faiss 进行相似度检索
  - 优化商品别名聚类效果
- 依赖：任务 2.1
- 测试：聚类准确率提升

**任务 3.2：历史学习优化（1 天）**
- 目标：优化基于历史成交价的学习算法
- 关键点：
  - 实现价格分布统计
  - 支持加权平均（时间衰减）
  - 提供价格置信度
- 依赖：任务 1.9
- 测试：历史学习效果更准确

#### Week 7：报表与性能优化

**任务 3.3：毛利分析报表（1 天）**
- 目标：提供商品和顾客维度的毛利分析
- 关键点：
  - 按商品统计毛利情况
  - 按顾客类型统计利润贡献
  - 识别经常被砍价的商品
- 依赖：任务 1.9
- 测试：报表数据准确

**任务 3.4：性能优化（2 天）**
- 目标：优化系统性能
- 关键点：
  - Redis 缓存热点数据（商品、顾客、规则）
  - 优化数据库查询（索引、分页）
  - 语音识别结果缓存
- 依赖：所有前期任务
- 测试：响应时间优化到 1–3 秒

**任务 3.5：完整测试与文档（1 天）**
- 目标：完善测试和文档
- 关键点：
  - 端到端测试
  - 性能压力测试
  - 完善 API 文档
  - 编写部署文档
- 依赖：所有任务
- 测试：系统稳定可用

---

## 🧪 测试策略

### 单元测试（Unit Tests）
- **覆盖范围**：所有核心模块
- **工具**：Jest
- **目标覆盖率**：>80%
- **重点模块**：
  - 定价计算器
  - 规则引擎
  - NLU 模块
  - 记忆管理

### 集成测试（Integration Tests）
- **覆盖范围**：模块间交互
- **工具**：Jest + Supertest
- **关键流程**：
  - 语音报价完整流程
  - 交易记录流程
  - 候选记忆聚合流程

### 端到端测试（E2E Tests）
- **覆盖范围**：完整用户场景
- **工具**：Cypress（可选）
- **关键场景**：
  - 零售报价场景
  - 进货核价场景
  - 无数据启动场景
  - 打烊后复盘场景

### 语音识别专项测试
- **测试用例**：
  - 普通话识别准确率
  - 方言口音适应性
  - 背景噪音影响
  - 商品名识别准确率
- **目标**：准确率 >85%

---

## 🚀 部署指南

### 1. 环境要求
- Node.js >= 18.0.0
- MySQL >= 8.0
- Redis >= 6.0
- Docker (可选)

### 2. 本地部署

```bash
# 1. 克隆项目
git clone <repository-url>
cd auto-quote-system

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等

# 4. 初始化数据库
npm run db:migrate
npm run db:seed

# 5. 启动服务
npm run dev
```

### 3. Docker 部署

```bash
# 构建镜像
docker build -t auto-quote-system .

# 启动容器
docker-compose up -d
```

### 4. 树莓派/工控机部署

```bash
# 1. 安装 Node.js
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 安装 MySQL 和 Redis
sudo apt-get install mysql-server redis-server

# 3. 部署应用
# （使用上述本地部署步骤）
```

### 5. 配置说明

**环境变量配置**：
```env
# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_NAME=auto_quote_system
DB_USER=root
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 语音
ASR_ENGINE=whisper  # whisper | vosk | xunfei
TTS_ENGINE=paddle   # paddle | edge

# NLU
NLU_MODEL=ernie-tiny

# 其他
NODE_ENV=production
LOG_LEVEL=info
```

### 6. 数据备份与恢复

```bash
# 备份
mysqldump -u root -p auto_quote_system > backup.sql

# 恢复
mysql -u root -p auto_quote_system < backup.sql
```

---

## 📊 监控与日志

### 日志配置
- 使用 Winston 记录日志
- 分级：error、warn、info、debug
- 输出：文件 + 控制台
- 日志轮转：按日轮转，保留 30 天

### 监控指标
- 语音识别响应时间
- API 请求响应时间
- 定价引擎计算时间
- 交易成功率
- 错误率

### 告警机制
- 服务不可用告警
- 响应时间超时告警
- 数据库连接失败告警

---

## 📚 参考文档

1. [小店 AI 报价助手需求文档](ai_shop_requirements_zh.md)
2. [小店 AI 报价助手技术架构](ai_shop_architecture_zh.md)
3. [API 接口文档](docs/api.md)
4. [数据库设计文档](docs/database.md)
5. [部署文档](docs/deployment.md)

---

## 🤝 团队协作

### Git 分支策略
- `main`：生产环境
- `develop`：开发环境
- `feature/*`：功能分支
- `hotfix/*`：紧急修复分支

### 代码审查
- 所有 PR 必须经过代码审查
- 使用 GitHub Pull Requests
- 审查要点：代码质量、测试覆盖、文档完整性

### 任务管理
- 使用 GitHub Issues 管理任务
- 按阶段和优先级分类
- 定期同步进度

---

## ⚠️ 注意事项

1. **数据安全**
   - 顾客和价格数据敏感，本地存储优先
   - 定期备份，防止数据丢失
   - 实现权限控制

2. **性能考虑**
   - 语音识别是性能瓶颈，优先本地处理
   - 合理使用缓存，减少数据库查询
   - 定期清理旧数据

3. **用户体验**
   - 语音交互要简洁明了
   - 出错时要有友好的提示
   - 支持离线模式

4. **可扩展性**
   - 模块化设计，便于后续扩展
   - 预留接口，支持未来功能
   - 配置化，便于调整规则

---

## 📝 附录：关键接口设计

### 语音报价接口
```http
POST /api/voice/quote
Content-Type: application/json

{
  "audio": "base64_encoded_audio",
  "context": {
    "customerId": "optional",
    "items": [
      {
        "name": "可乐",
        "quantity": 2,
        "unit": "瓶"
      }
    ]
  }
}

Response:
{
  "quoteId": "uuid",
  "items": [
    {
      "name": "可口可乐",
      "quantity": 2,
      "unit": "瓶",
      "unitPrice": 3.0,
      "totalPrice": 6.0
    }
  ],
  "totalPrice": 6.0,
  "rounding": 6.0,
  "confidence": 0.95,
  "rulesApplied": ["customer_type", "category"],
  "context": {
    "customerId": "customer_001",
    "customerType": "regular"
  }
}
```

### 确认交易接口
```http
POST /api/transactions/confirm
Content-Type: application/json

{
  "quoteId": "uuid",
  "finalPrice": 6.0,
  "items": [
    {
      "name": "可口可乐",
      "quantity": 2,
      "unit": "瓶",
      "unitPrice": 3.0
    }
  ]
}
```

### 候选记忆查询接口
```http
GET /api/memory/candidates/products?limit=10&threshold=5
Response:
[
  {
    "name": "可乐",
    "frequency": 15,
    "aliases": ["可口可乐", "可乐一瓶"],
    "priceDistribution": {
      "min": 2.5,
      "max": 3.5,
      "avg": 3.0
    }
  }
]
```

---

## 🎯 成功标准

### MVP 阶段（阶段 1）
- [ ] 语音识别准确率 >80%
- [ ] 意图识别准确率 >85%
- [ ] 报价响应时间 <3秒
- [ ] 交易记录完整
- [ ] 核心功能测试通过率 100%

### 自动记忆阶段（阶段 2）
- [ ] 候选商品识别准确率 >80%
- [ ] 后台复盘界面可用
- [ ] 规则推荐准确率 >70%
- [ ] 用户操作时间 <10分钟/天

### 智能优化阶段（阶段 3）
- [ ] 向量聚类提升准确率 >10%
- [ ] 毛利分析报表准确
- [ ] 系统响应时间 <2秒
- [ ] 端到端测试通过率 100%

---

**文档版本**：v1.0  \n**最后更新**：2025-01-01