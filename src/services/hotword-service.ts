/**
 * 热词服务
 * 管理 ASR 识别热词，从数据库动态加载商品和顾客名称
 */

import { databaseService } from '../database';

/**
 * 热词分类
 */
export interface HotwordCategory {
  products: string[];      // 商品名称
  partners: string[];      // 顾客/供货商名称
  units: string[];         // 单位
  common: string[];        // 常用词
}

/**
 * 热词服务
 */
export class HotwordService {
  private hotwords: HotwordCategory = {
    products: [],
    partners: [],
    units: [],
    common: []
  };

  private initialized: boolean = false;
  private lastRefreshTime: Date | null = null;

  // 默认单位词
  private static readonly DEFAULT_UNITS = [
    '瓶', '包', '袋', '箱', '盒', '个', '只', '条', '根', '块', '斤', '克', '公斤'
  ];

  // 默认常用词
  private static readonly DEFAULT_COMMON_WORDS = [
    '多少钱', '卖', '买', '要', '给', '来', '拿', '找', '算', '报价',
    '进货', '进价', '成本', '零售', '批发',
    '熟客', '老顾客', '普通', '散客'
  ];

  constructor() {}

  /**
   * 初始化热词服务
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 加载默认词汇
      this.hotwords.units = [...HotwordService.DEFAULT_UNITS];
      this.hotwords.common = [...HotwordService.DEFAULT_COMMON_WORDS];

      // 从数据库加载商品和顾客
      await this.refreshFromDatabase();

      this.initialized = true;
      console.log('✅ 热词服务初始化成功');
    } catch (error) {
      console.error('❌ 热词服务初始化失败:', error);
      // 即使数据库加载失败，也使用默认词汇
      this.initialized = true;
    }
  }

  /**
   * 从数据库刷新热词
   */
  async refreshFromDatabase(): Promise<void> {
    try {
      const db = databaseService.getConnection();
      if (!db) {
        console.warn('数据库未连接，跳过热词刷新');
        return;
      }

      // 加载商品名称和别名
      const products = await db.query(`
        SELECT name, aliases FROM products WHERE isActive = true
      `);

      this.hotwords.products = [];
      for (const product of products) {
        this.hotwords.products.push(product.name);
        if (product.aliases && Array.isArray(product.aliases)) {
          this.hotwords.products.push(...product.aliases);
        }
      }

      // 加载商品候选名称
      const candidateProducts = await db.query(`
        SELECT name, aliasesCluster FROM candidate_products WHERE confirmed = false
      `);

      for (const candidate of candidateProducts) {
        this.hotwords.products.push(candidate.name);
        if (candidate.aliasesCluster && Array.isArray(candidate.aliasesCluster)) {
          this.hotwords.products.push(...candidate.aliasesCluster);
        }
      }

      // 加载顾客名称
      const partners = await db.query(`
        SELECT name FROM partners
      `);

      this.hotwords.partners = partners.map((p: any) => p.name);

      // 加载顾客候选名称
      const candidatePartners = await db.query(`
        SELECT name FROM candidate_partners WHERE confirmed = false
      `);

      this.hotwords.partners.push(...candidatePartners.map((p: any) => p.name));

      // 去重
      this.hotwords.products = [...new Set(this.hotwords.products)];
      this.hotwords.partners = [...new Set(this.hotwords.partners)];

      this.lastRefreshTime = new Date();
      console.log(`热词刷新完成: ${this.hotwords.products.length} 商品, ${this.hotwords.partners.length} 顾客`);

    } catch (error) {
      console.error('从数据库刷新热词失败:', error);
    }
  }

  /**
   * 获取所有热词（合并后的数组）
   */
  getAllHotwords(): string[] {
    return [
      ...this.hotwords.products,
      ...this.hotwords.partners,
      ...this.hotwords.units,
      ...this.hotwords.common
    ];
  }

  /**
   * 获取分类热词
   */
  getHotwordsByCategory(): HotwordCategory {
    return { ...this.hotwords };
  }

  /**
   * 获取商品热词
   */
  getProductHotwords(): string[] {
    return [...this.hotwords.products];
  }

  /**
   * 获取顾客热词
   */
  getPartnerHotwords(): string[] {
    return [...this.hotwords.partners];
  }

  /**
   * 添加临时热词（不持久化）
   */
  addTemporaryHotwords(category: keyof HotwordCategory, words: string[]): void {
    this.hotwords[category].push(...words);
    this.hotwords[category] = [...new Set(this.hotwords[category])];
  }

  /**
   * 获取上次刷新时间
   */
  getLastRefreshTime(): Date | null {
    return this.lastRefreshTime;
  }

  /**
   * 判断是否需要刷新（超过10分钟）
   */
  needsRefresh(): boolean {
    if (!this.lastRefreshTime) return true;
    const tenMinutes = 10 * 60 * 1000;
    return Date.now() - this.lastRefreshTime.getTime() > tenMinutes;
  }

  /**
   * 条件刷新（如果需要）
   */
  async refreshIfNeeded(): Promise<void> {
    if (this.needsRefresh()) {
      await this.refreshFromDatabase();
    }
  }
}

// 导出单例
export const hotwordService = new HotwordService();

