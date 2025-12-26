# Decision Log

This file records architectural and implementation decisions using a list format.

## 2025-12-25: 大模型集成策略

### Decision
采用 OpenAI 兼容 API 作为主要大模型接入方式，支持多种模型（DeepSeek/Gemini/Qwen/GLM）。

### Rationale
1. **统一接口**：OpenAI API 格式已成为事实标准，大多数模型提供商都支持
2. **灵活切换**：通过环境变量即可切换模型，无需改代码
3. **成本优化**：可根据场景选择性价比最高的模型
4. **容错机制**：API 失败时自动回退到规则层

### Implementation Details
- Provider 文件：`src/nlu/providers/openai-compatible-provider.ts`
- 配置变量：`OPENAI_API_KEY`, `OPENAI_API_BASE`, `OPENAI_MODEL`
- 优先级：OpenAI 兼容 → 阿里云 → 规则层
- 超时设置：15 秒，超时后回退到规则层

---

## 2025-12-25: NLU 规则层优先策略

### Decision
规则层优先处理，仅当置信度低于阈值（0.6）时才调用大模型。

### Rationale
1. **性能优先**：规则层响应 ~6ms，大模型响应 15-30 秒
2. **成本控制**：减少不必要的 API 调用
3. **可靠性**：规则层稳定，不依赖外部服务
4. **语义覆盖**：规则层已能处理 80%+ 的常见场景

### Implementation Details
- 阈值配置：`ruleConfidenceThreshold: 0.6`
- 触发条件：意图为 unknown 或 置信度 < 0.6 或 没有识别到商品
- 合并策略：选择置信度更高的结果

---

## 2025-12-15: 项目技术栈选择

### Decision
- 后端：Node.js + Express + TypeScript + MySQL + Redis
- 前端管理：React + Vite + Ant Design Mobile
- C 端：微信小程序 + H5(Vue 3) + Android(WebView)

### Rationale
1. **TypeScript**：类型安全，减少运行时错误
2. **MySQL**：成熟稳定，适合结构化数据
3. **Redis**：高性能缓存，支持热点数据
4. **React/Vue**：生态成熟，开发效率高
5. **小程序优先**：用户习惯，无需下载安装

### Implementation Details
- 共享代码层：`client/shared/`
- 平台兼容层：`client/platform/`
- 代码同步脚本：`scripts/sync-shared-code.js`
