/**
 * Redis 缓存服务
 * 提供热点数据缓存，优化系统性能
 */

import { createClient, RedisClientType } from 'redis';

/**
 * 缓存服务配置
 */
export interface CacheServiceConfig {
  /** Redis 连接 URL */
  redisUrl?: string;
  /** 默认过期时间（秒） */
  defaultTTL?: number;
  /** 是否启用缓存 */
  enabled?: boolean;
  /** 键前缀 */
  keyPrefix?: string;
}

/**
 * 缓存键类型
 */
export type CacheKeyType = 
  | 'product'      // 商品信息
  | 'partner'      // 顾客信息
  | 'rule'         // 定价规则
  | 'hotword'      // 热词
  | 'price'        // 历史价格
  | 'session';     // 会话

/**
 * 缓存统计
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
}

/**
 * Redis 缓存服务
 */
export class CacheService {
  private config: Required<CacheServiceConfig>;
  private client: RedisClientType | null = null;
  private initialized = false;
  private stats = { hits: 0, misses: 0 };

  // 本地内存缓存（Redis 不可用时的降级方案）
  private memoryCache: Map<string, { value: string; expireAt: number }> = new Map();

  constructor(config: CacheServiceConfig = {}) {
    this.config = {
      redisUrl: config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      defaultTTL: config.defaultTTL || 300, // 5 分钟
      enabled: config.enabled ?? true,
      keyPrefix: config.keyPrefix || 'aqs:'
    };
  }

  /**
   * 初始化服务
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    if (!this.config.enabled) {
      console.log('⚠️ 缓存服务已禁用');
      this.initialized = true;
      return;
    }

    try {
      this.client = createClient({ url: this.config.redisUrl });
      
      this.client.on('error', (err) => {
        console.error('Redis 连接错误:', err);
      });

      await this.client.connect();
      
      console.log('✅ Redis 缓存服务初始化成功');
      this.initialized = true;
    } catch (error) {
      console.warn('⚠️ Redis 连接失败，使用内存缓存降级:', error);
      this.client = null;
      this.initialized = true;
    }
  }

  /**
   * 获取完整缓存键
   */
  private getKey(type: CacheKeyType, id: string): string {
    return `${this.config.keyPrefix}${type}:${id}`;
  }

  /**
   * 设置缓存
   */
  async set<T>(
    type: CacheKeyType,
    id: string,
    value: T,
    ttlSeconds?: number
  ): Promise<boolean> {
    if (!this.initialized) {
      await this.init();
    }

    const key = this.getKey(type, id);
    const ttl = ttlSeconds || this.config.defaultTTL;
    const serialized = JSON.stringify(value);

    try {
      if (this.client) {
        await this.client.setEx(key, ttl, serialized);
      } else {
        // 内存缓存降级
        this.memoryCache.set(key, {
          value: serialized,
          expireAt: Date.now() + ttl * 1000
        });
      }
      return true;
    } catch (error) {
      console.error('缓存写入失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存
   */
  async get<T>(type: CacheKeyType, id: string): Promise<T | null> {
    if (!this.initialized) {
      await this.init();
    }

    const key = this.getKey(type, id);

    try {
      let cached: string | null = null;

      if (this.client) {
        cached = await this.client.get(key);
      } else {
        // 内存缓存降级
        const entry = this.memoryCache.get(key);
        if (entry && entry.expireAt > Date.now()) {
          cached = entry.value;
        } else if (entry) {
          this.memoryCache.delete(key);
        }
      }

      if (cached) {
        this.stats.hits++;
        return JSON.parse(cached) as T;
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      console.error('缓存读取失败:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * 删除缓存
   */
  async delete(type: CacheKeyType, id: string): Promise<boolean> {
    if (!this.initialized) {
      await this.init();
    }

    const key = this.getKey(type, id);

    try {
      if (this.client) {
        await this.client.del(key);
      } else {
        this.memoryCache.delete(key);
      }
      return true;
    } catch (error) {
      console.error('缓存删除失败:', error);
      return false;
    }
  }

  /**
   * 批量删除（按类型）
   */
  async deleteByType(type: CacheKeyType): Promise<number> {
    if (!this.initialized) {
      await this.init();
    }

    const pattern = `${this.config.keyPrefix}${type}:*`;
    let deleted = 0;

    try {
      if (this.client) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          deleted = await this.client.del(keys);
        }
      } else {
        for (const key of this.memoryCache.keys()) {
          if (key.startsWith(`${this.config.keyPrefix}${type}:`)) {
            this.memoryCache.delete(key);
            deleted++;
          }
        }
      }
      return deleted;
    } catch (error) {
      console.error('批量删除缓存失败:', error);
      return 0;
    }
  }

  /**
   * 获取或设置缓存（常用模式）
   */
  async getOrSet<T>(
    type: CacheKeyType,
    id: string,
    factory: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    // 先尝试从缓存获取
    const cached = await this.get<T>(type, id);
    if (cached !== null) {
      return cached;
    }

    // 缓存未命中，调用工厂函数获取数据
    const value = await factory();

    // 存入缓存
    await this.set(type, id, value, ttlSeconds);

    return value;
  }

  /**
   * 缓存商品信息
   */
  async cacheProduct(product: {
    id: number;
    name: string;
    aliases: string[];
    category: string;
    baseCost: number;
    defaultPrice: number;
  }): Promise<void> {
    // 缓存主键
    await this.set('product', String(product.id), product, 600);
    
    // 缓存名称索引
    await this.set('product', `name:${product.name.toLowerCase()}`, product.id, 600);
    
    // 缓存别名索引
    for (const alias of product.aliases) {
      await this.set('product', `alias:${alias.toLowerCase()}`, product.id, 600);
    }
  }

  /**
   * 通过名称查找商品（使用缓存）
   */
  async findProductByName(name: string): Promise<{ id: number } | null> {
    // 先查名称索引
    const productId = await this.get<number>('product', `name:${name.toLowerCase()}`);
    if (productId) {
      return { id: productId };
    }

    // 再查别名索引
    const aliasProductId = await this.get<number>('product', `alias:${name.toLowerCase()}`);
    if (aliasProductId) {
      return { id: aliasProductId };
    }

    return null;
  }

  /**
   * 缓存顾客信息
   */
  async cachePartner(partner: {
    id: number;
    name: string;
    aliases: string[];
    level: string;
  }): Promise<void> {
    // 缓存主键
    await this.set('partner', String(partner.id), partner, 600);
    
    // 缓存名称索引
    await this.set('partner', `name:${partner.name.toLowerCase()}`, partner.id, 600);
    
    // 缓存别名索引
    for (const alias of partner.aliases) {
      await this.set('partner', `alias:${alias.toLowerCase()}`, partner.id, 600);
    }
  }

  /**
   * 缓存定价规则
   */
  async cacheRules(rules: any[]): Promise<void> {
    await this.set('rule', 'all', rules, 300);
  }

  /**
   * 获取缓存的定价规则
   */
  async getCachedRules(): Promise<any[] | null> {
    return this.get<any[]>('rule', 'all');
  }

  /**
   * 缓存热词列表
   */
  async cacheHotwords(hotwords: string[]): Promise<void> {
    await this.set('hotword', 'list', hotwords, 600);
  }

  /**
   * 获取缓存的热词列表
   */
  async getCachedHotwords(): Promise<string[] | null> {
    return this.get<string[]>('hotword', 'list');
  }

  /**
   * 缓存会话
   */
  async cacheSession(sessionId: string, session: any): Promise<void> {
    await this.set('session', sessionId, session, 1800); // 30 分钟
  }

  /**
   * 获取缓存的会话
   */
  async getCachedSession(sessionId: string): Promise<any | null> {
    return this.get('session', sessionId);
  }

  /**
   * 使缓存失效（用于数据更新后）
   */
  async invalidate(type: CacheKeyType, id?: string): Promise<void> {
    if (id) {
      await this.delete(type, id);
    } else {
      await this.deleteByType(type);
    }
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: this.memoryCache.size
    };
  }

  /**
   * 清空所有缓存
   */
  async flush(): Promise<void> {
    try {
      if (this.client) {
        const keys = await this.client.keys(`${this.config.keyPrefix}*`);
        if (keys.length > 0) {
          await this.client.del(keys);
        }
      }
      this.memoryCache.clear();
      this.stats = { hits: 0, misses: 0 };
    } catch (error) {
      console.error('清空缓存失败:', error);
    }
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
    this.initialized = false;
  }
}

// 导出单例
export const cacheService = new CacheService();

