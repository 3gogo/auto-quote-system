# 小店 AI 报价助手

> 无数据自动记忆的 AI 报价系统

## 📋 项目介绍

这是一个为夫妻店、小杂货铺设计的 AI 报价助手系统，核心特性：

- **零初始化启动**：无需预先录入商品和顾客信息
- **语音优先交互**：通过自然语言完成询价、报价
- **智能定价引擎**：基于规则与历史学习的混合推荐
- **自动记忆**：从交易中自动学习和积累知识

## 🛠️ 技术栈

- **后端**：Node.js + Express + TypeScript
- **数据库**：MySQL 8.0
- **缓存**：Redis
- **语音**：Whisper.cpp (ASR) + PaddleSpeech (TTS)
- **NLU**：ERNIE-Tiny 轻量模型

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- MySQL >= 8.0
- Redis >= 6.0

### 安装

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

### 开发

```bash
# 开发模式（自动重启）
npm run dev

# 构建
npm run build

# 启动生产环境
npm start

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 📁 项目结构

```
src/
├── api/              # REST API 接口
├── services/         # 业务逻辑层
├── nlu/              # NLU 意图识别与实体抽取
├── pricing/          # 定价引擎
├── memory/           # 记忆管理
├── voice/            # 语音交互
├── database/         # 数据访问层
├── admin/            # 后台管理界面
├── utils/            # 通用工具
└── types/            # 类型定义
```

## 📖 API 文档

详见 [docs/api.md](docs/api.md)

## 🗄️ 数据库设计

详见 [docs/database.md](docs/database.md)

## 🚢 部署

详见 [docs/deployment.md](docs/deployment.md)

## 🤝 贡献

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 ISC 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📚 相关文档

- [需求文档](feature/ai_shop_requirements_zh.md)
- [技术架构](feature/ai_shop_architecture_zh.md)
- [开发指南](feature/ai_shop_development_guide_zh.md)