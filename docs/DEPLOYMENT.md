# 部署指南

本文档介绍如何部署 AI 小店报价助手系统。

## 📋 系统要求

### 最低配置
| 组件 | 要求 |
|------|------|
| CPU | 2 核 |
| 内存 | 4 GB |
| 磁盘 | 20 GB SSD |
| 系统 | Ubuntu 20.04+ / macOS / Windows |

### 推荐配置
| 组件 | 要求 |
|------|------|
| CPU | 4 核 |
| 内存 | 8 GB |
| 磁盘 | 50 GB SSD |
| 系统 | Ubuntu 22.04 LTS |

## 🔧 依赖服务

| 服务 | 版本 | 说明 |
|------|------|------|
| Node.js | 18+ | 运行后端服务 |
| MySQL | 8.0+ | 数据存储 |
| Redis | 7.0+ | 缓存（可选） |
| Python | 3.8+ | TTS 引擎（edge-tts） |
| Whisper.cpp | latest | ASR 语音识别（可选） |

## 🎤 语音功能配置

### 1. TTS 语音合成（Edge-TTS）

```bash
# 安装 edge-tts
pip install edge-tts

# 验证安装
edge-tts --list-voices | grep zh-CN
```

### 2. ASR 语音识别（Whisper.cpp）

```bash
# 克隆 whisper.cpp
cd ~/github
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp

# 安装 cmake（如果没有）
brew install cmake  # macOS
# sudo apt install cmake  # Ubuntu

# 编译
make

# 下载模型
mkdir -p ~/github/models
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin -o ~/github/models/ggml-base.bin

# 创建软链接
ln -sf ~/github/whisper.cpp/build/bin/whisper-cli ~/github/whisper.cpp/main
```

### 3. 环境变量配置

```env
# .env 添加以下配置

# TTS 引擎（edge = 云端，paddle = 本地）
TTS_ENGINE=edge

# ASR 引擎
ASR_ENGINE=whisper

# Whisper 配置
WHISPER_CPP_PATH=/path/to/whisper.cpp/main
WHISPER_MODEL_PATH=/path/to/models/ggml-base.bin

# OpenAI 兼容 API（大模型）
OPENAI_API_KEY=your_api_key
OPENAI_API_BASE=https://api.example.com/v1
OPENAI_MODEL=your_model_name
```

## 🚀 快速部署

### 1. 克隆项目

```bash
git clone https://github.com/your-org/auto-quote-system.git
cd auto-quote-system
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 服务配置
PORT=3001
NODE_ENV=production

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=auto_quote
DB_PASSWORD=your_secure_password
DB_NAME=auto_quote_system

# AI API（阿里云百炼）
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxx

# Redis（可选）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# CORS
CORS_ORIGIN=http://localhost:3000

# 日志
LOG_LEVEL=info
```

### 4. 初始化数据库

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS auto_quote_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 创建用户（可选）
mysql -u root -p -e "CREATE USER 'auto_quote'@'localhost' IDENTIFIED BY 'your_secure_password'; GRANT ALL PRIVILEGES ON auto_quote_system.* TO 'auto_quote'@'localhost'; FLUSH PRIVILEGES;"

# 运行迁移
npm run db:migrate

# 初始化测试数据（可选）
npx ts-node scripts/init-database.ts
```

### 5. 构建和启动

```bash
# 构建
npm run build

# 启动
npm start
```

### 6. 验证部署

```bash
curl http://localhost:3001/health
# 应返回: {"status":"ok",...}
```

## 🐳 Docker 部署

### 使用 Docker Compose（推荐）

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f api

# 停止服务
docker-compose down
```

### 单独构建镜像

```bash
# 构建镜像
docker build -t auto-quote-system .

# 运行容器
docker run -d \
  --name auto-quote-api \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e DB_HOST=host.docker.internal \
  auto-quote-system
```

## 📁 目录结构

```
auto-quote-system/
├── src/                # 后端源码
├── dist/               # 编译输出（npm run build 后生成）
├── admin/              # 后台管理前端
├── miniprogram/        # 微信小程序
├── client/             # 跨平台客户端
│   ├── h5/            # H5 Web
│   └── android/       # Android APP
├── scripts/            # 构建脚本
├── docs/               # 文档
└── docker/             # Docker 配置
```

## 🌐 前端部署

### 后台管理界面

```bash
cd admin

# 安装依赖
npm install

# 构建
npm run build

# 输出目录: admin/dist/
```

将 `admin/dist/` 目录部署到 Web 服务器（如 Nginx）。

### H5 Web 应用

```bash
cd client/h5

# 安装依赖
npm install

# 构建
npm run build

# 输出目录: client/h5/dist/
```

### 微信小程序

```bash
cd miniprogram

# 使用微信开发者工具打开项目
# 上传代码并提交审核
```

### Android APP

```bash
cd client/android

# 使用 Android Studio 打开项目
# Build → Generate Signed APK
```

## ⚙️ Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 后台管理界面
    location /admin {
        alias /var/www/auto-quote/admin/dist;
        try_files $uri $uri/ /admin/index.html;
    }

    # H5 应用
    location /h5 {
        alias /var/www/auto-quote/h5/dist;
        try_files $uri $uri/ /h5/index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:3001/health;
    }
}
```

## 🔐 安全建议

### 1. 使用 HTTPS

```bash
# 使用 Let's Encrypt 获取免费证书
sudo certbot --nginx -d your-domain.com
```

### 2. 数据库安全

- 使用强密码
- 限制数据库访问 IP
- 定期备份

```bash
# 备份脚本示例
mysqldump -u auto_quote -p auto_quote_system > backup_$(date +%Y%m%d).sql
```

### 3. API 安全

- 配置 CORS 白名单
- 启用 Rate Limiting
- 定期更新依赖

### 4. 环境变量

- 不要将 `.env` 文件提交到版本控制
- 使用环境变量管理敏感信息

## 📊 监控与日志

### 日志查看

```bash
# 查看后端日志
tail -f /var/log/auto-quote/app.log

# Docker 日志
docker logs -f auto-quote-api
```

### 健康检查

```bash
# 定时检查服务状态
curl -s http://localhost:3001/health | jq .
```

### 建议的监控工具

- PM2（进程管理）
- Prometheus + Grafana（指标监控）
- ELK Stack（日志分析）

## 🔄 更新部署

```bash
# 拉取最新代码
git pull origin main

# 安装依赖
npm install

# 数据库迁移
npm run db:migrate

# 重新构建
npm run build

# 重启服务
pm2 restart auto-quote-api
# 或
docker-compose restart api
```

## 🐛 故障排查

### 常见问题

#### 1. 端口被占用

```bash
lsof -i :3001
kill -9 <PID>
```

#### 2. 数据库连接失败

```bash
# 检查 MySQL 服务
systemctl status mysql

# 测试连接
mysql -u auto_quote -p -h localhost auto_quote_system
```

#### 3. Redis 连接失败

```bash
# 检查 Redis 服务
systemctl status redis

# 测试连接
redis-cli ping
```

#### 4. AI API 调用失败

- 检查 `DASHSCOPE_API_KEY` 是否正确
- 检查网络连接
- 查看 API 调用额度

### 获取帮助

1. 查看日志文件
2. 运行测试：`npm run test:modules`
3. 检查健康状态：`curl http://localhost:3001/health`

## 📋 部署检查清单

- [ ] Node.js 18+ 已安装
- [ ] MySQL 8.0+ 已安装并运行
- [ ] Redis 已安装（可选）
- [ ] 数据库已创建和初始化
- [ ] 环境变量已配置
- [ ] 后端服务已启动
- [ ] 健康检查通过
- [ ] 前端已构建并部署
- [ ] HTTPS 已配置（生产环境）
- [ ] 备份策略已设置

