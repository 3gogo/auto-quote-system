# ============================================
# AI 小店报价助手 - 后端服务 Dockerfile
# ============================================

# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源码
COPY tsconfig.json ./
COPY src/ ./src/
COPY config/ ./config/

# 安装开发依赖并构建
RUN npm ci && npm run build

# 运行阶段
FROM node:18-alpine AS runner

WORKDIR /app

# 安装 Python 和 edge-tts（用于 TTS 语音合成）
RUN apk add --no-cache python3 py3-pip curl && \
    pip3 install --no-cache-dir edge-tts && \
    rm -rf /root/.cache

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/config ./config

# 创建模型目录
RUN mkdir -p /opt/models /opt/whisper && \
    chown -R appuser:nodejs /opt/models /opt/whisper

# 设置权限
RUN chown -R appuser:nodejs /app

# 切换到非 root 用户
USER appuser

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# 启动命令
CMD ["node", "dist/index.js"]

