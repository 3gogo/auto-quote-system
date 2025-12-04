import { createConnection, Connection } from 'typeorm';
import dotenv from 'dotenv';

dotenv.config();

class DatabaseService {
  private connection: Connection | null = null;

  async connect(): Promise<Connection> {
    if (this.connection && this.connection.isConnected) {
      return this.connection;
    }

    try {
      this.connection = await createConnection({
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'your_password',
        database: process.env.DB_NAME || 'auto_quote_system',
        entities: ['src/database/models/**/*.ts'],
        migrations: ['src/database/migrations/**/*.ts'],
        logging: process.env.NODE_ENV === 'development',
        synchronize: false,
        extra: {
          charset: 'utf8mb4_unicode_ci'
        }
      });

      console.log('✅ 数据库连接成功');
      return this.connection;
    } catch (error) {
      console.error('❌ 数据库连接失败:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection && this.connection.isConnected) {
      await this.connection.close();
      console.log('✅ 数据库连接已关闭');
    }
  }

  getConnection(): Connection | null {
    return this.connection;
  }
}

export const databaseService = new DatabaseService();