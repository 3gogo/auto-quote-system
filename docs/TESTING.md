# 测试指南

本文档介绍如何运行各种测试来验证系统功能。

## 📋 测试类型

| 测试类型 | 命令 | 说明 |
|---------|------|------|
| 模块测试 | `npm run test:modules` | 验证 NLU、定价等模块 |
| 端到端测试 | `npm run test:e2e` | 验证 API 完整流程 |
| 单元测试 | `npm test` | Jest 单元测试 |

## 🧪 模块测试

验证核心模块功能，无需启动服务。

```bash
npm run test:modules
```

**测试内容：**
- ✅ 意图分类器 - 识别用户意图
- ✅ 实体抽取器 - 提取商品、顾客、价格
- ✅ NLU 服务 - 完整语义理解
- ✅ 定价引擎 - 生成报价
- ✅ 定价服务 - 完整报价流程

**注意：**
- 未配置 AI API 时，使用规则层
- 未连接数据库时，使用默认规则

## 🔗 端到端测试

验证 API 完整流程，需要先启动后端服务。

```bash
# 终端 1: 启动后端服务
npm run dev

# 终端 2: 运行 E2E 测试
npm run test:e2e
```

**测试内容：**
1. 健康检查 (`GET /health`)
2. API 根路径 (`GET /api`)
3. 创建会话
4. 发送报价请求
5. 单品查询
6. 价格修正
7. 确认交易
8. 获取交易列表
9. 获取统计数据
10. 清除会话

## ⚙️ 环境配置

### 必需配置

创建 `.env` 文件：

```env
# 服务器
PORT=3001
NODE_ENV=development

# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=auto_quote_system

# AI API（阿里云百炼）
DASHSCOPE_API_KEY=your_api_key

# Redis（可选）
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 数据库初始化

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS auto_quote_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 运行迁移
npm run db:migrate

# 初始化测试数据
npx ts-node scripts/init-database.ts
```

## 📊 测试数据

### 推荐测试用例

**报价请求：**
```
"张三两瓶可乐三包纸巾"
"老王要5斤猪肉"
"给我三箱矿泉水"
```

**单品查询：**
```
"可乐怎么卖"
"猪肉多少钱一斤"
```

**价格修正：**
```
"按10块算"
"便宜2块"
```

**确认/取消：**
```
"好的"
"确认"
"不要了"
"取消"
```

## 🐛 常见问题

### 1. 数据库连接失败

```
Error: ER_ACCESS_DENIED_ERROR
```

**解决：** 检查 `.env` 中的数据库配置

### 2. AI API 未配置

```
AI Provider 初始化失败: Error: 阿里云 API Key 未配置
```

**解决：** 设置 `DASHSCOPE_API_KEY` 环境变量，或使用规则层测试

### 3. 端口被占用

```
Error: listen EADDRINUSE: address already in use :::3001
```

**解决：** 
```bash
# 查找占用端口的进程
lsof -i :3001
# 或修改 PORT 环境变量
PORT=3002 npm run dev
```

### 4. Redis 连接失败

```
Redis connection failed
```

**解决：** Redis 是可选的，系统会使用内存缓存降级

## 📈 测试覆盖率

```bash
# 运行 Jest 测试并生成覆盖率报告
npm test -- --coverage
```

## 🔧 调试模式

```bash
# 启用详细日志
DEBUG=* npm run dev

# 只启用特定模块日志
DEBUG=nlu:* npm run dev
DEBUG=pricing:* npm run dev
```

