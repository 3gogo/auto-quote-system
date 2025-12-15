# 系统模式与规范

## 代码规范
- 使用 TypeScript 严格模式
- 中文注释，英文变量名
- 模块化设计，接口清晰

## 目录结构
```
src/
├── api/          # REST API 接口
├── services/     # 业务逻辑层
├── nlu/          # 自然语言理解
├── pricing/      # 定价引擎
├── memory/       # 记忆管理
├── voice/        # 语音交互
├── database/     # 数据访问层
│   ├── models/
│   └── repositories/
└── types/        # 类型定义
```

## 设计模式
- **服务单例**: voiceService, nluService, pricingService
- **仓库模式**: BaseRepository + 具体仓库
- **引擎接口**: ASREngine, TTSEngine, NLUEngine

## 命名约定
- 服务类: XxxService
- 引擎类: XxxEngine
- 仓库类: XxxRepository
- 接口类型: XxxOptions, XxxResult
