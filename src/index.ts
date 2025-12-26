import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { databaseService } from './database';
import voiceApi from './api/voice';
import conversationApi from './api/conversation';
import transactionApi from './api/transaction';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 连接数据库
databaseService.connect().catch((error) => {
  console.error('数据库连接失败:', error);
  process.exit(1);
});

// 中间件
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API 路由
app.use('/api/voice', voiceApi);
app.use('/api/conversation', conversationApi);
app.use('/api/transactions', transactionApi);

// 根路径
app.get('/api', (req, res) => {
  res.json({
    message: 'Auto Quote System API',
    version: process.env.npm_package_version || '1.0.0',
    endpoints: {
      voice: '/api/voice',
      conversation: '/api/conversation',
      transactions: '/api/transactions',
      health: '/health'
    }
  });
});

// 错误处理中间件
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(error.stack);
  res.status(500).json({
    error: {
      message: 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Not Found',
      path: req.path
    }
  });
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n正在关闭服务器...');
  server.close(async () => {
    await databaseService.disconnect();
    console.log('服务器已关闭');
    process.exit(0);
  });
});