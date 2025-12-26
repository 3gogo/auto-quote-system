/**
 * 历史学习优化服务
 * 提供价格分布统计、时间衰减加权和价格置信度计算
 */

import { databaseService } from '../database';

/**
 * 价格分布统计
 */
export interface PriceDistribution {
  /** 商品名称 */
  productName: string;
  /** 顾客 ID（可选，用于特定顾客的价格分析） */
  partnerId?: number;
  /** 最小价格 */
  min: number;
  /** 最大价格 */
  max: number;
  /** 平均价格 */
  avg: number;
  /** 中位数价格 */
  median: number;
  /** 众数（最常见价格） */
  mode: number;
  /** 标准差 */
  stdDev: number;
  /** 时间加权平均价格 */
  weightedAvg: number;
  /** 价格置信度（0-1） */
  confidence: number;
  /** 样本数量 */
  sampleCount: number;
  /** 价格列表（按时间排序） */
  priceHistory: Array<{
    price: number;
    timestamp: Date;
    weight: number;
  }>;
  /** 最后更新时间 */
  lastUpdatedAt: Date;
}

/**
 * 历史学习配置
 */
export interface HistoryLearningConfig {
  /** 时间衰减半衰期（天数） */
  halfLifeDays?: number;
  /** 最小样本数（低于此值置信度降低） */
  minSampleSize?: number;
  /** 分析的历史天数 */
  historyDays?: number;
  /** 价格波动阈值（超过此标准差认为不稳定） */
  volatilityThreshold?: number;
}

/**
 * 历史学习服务
 */
export class HistoryLearningService {
  private config: Required<HistoryLearningConfig>;
  private priceCache: Map<string, PriceDistribution> = new Map();
  private initialized = false;

  constructor(config: HistoryLearningConfig = {}) {
    this.config = {
      halfLifeDays: config.halfLifeDays || 14, // 14 天半衰期
      minSampleSize: config.minSampleSize || 3, // 至少 3 个样本
      historyDays: config.historyDays || 60,   // 分析 60 天数据
      volatilityThreshold: config.volatilityThreshold || 0.2 // 20% 波动认为不稳定
    };
  }

  /**
   * 初始化服务
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    this.initialized = true;
    console.log('✅ 历史学习服务初始化成功');
  }

  /**
   * 获取商品的价格分布
   */
  async getPriceDistribution(
    productName: string,
    partnerId?: number
  ): Promise<PriceDistribution | null> {
    if (!this.initialized) {
      await this.init();
    }

    // 检查缓存
    const cacheKey = this.getCacheKey(productName, partnerId);
    const cached = this.priceCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    // 从数据库加载价格历史
    const priceHistory = await this.loadPriceHistory(productName, partnerId);
    if (priceHistory.length === 0) {
      return null;
    }

    // 计算分布统计
    const distribution = this.calculateDistribution(productName, partnerId, priceHistory);

    // 更新缓存
    this.priceCache.set(cacheKey, distribution);

    return distribution;
  }

  /**
   * 获取时间加权平均价格（推荐用于定价）
   */
  async getWeightedAveragePrice(
    productName: string,
    partnerId?: number
  ): Promise<{ price: number; confidence: number } | null> {
    const distribution = await this.getPriceDistribution(productName, partnerId);
    if (!distribution) {
      return null;
    }

    return {
      price: distribution.weightedAvg,
      confidence: distribution.confidence
    };
  }

  /**
   * 判断价格是否合理（在历史范围内）
   */
  async isPriceReasonable(
    productName: string,
    price: number,
    partnerId?: number
  ): Promise<{
    isReasonable: boolean;
    deviation: number;
    suggestion?: string;
  }> {
    const distribution = await this.getPriceDistribution(productName, partnerId);
    
    if (!distribution || distribution.sampleCount < this.config.minSampleSize) {
      // 数据不足，无法判断
      return { isReasonable: true, deviation: 0 };
    }

    const deviation = (price - distribution.avg) / distribution.avg;
    const absDeviation = Math.abs(deviation);

    if (absDeviation <= 0.1) {
      // 偏差在 10% 以内，合理
      return { isReasonable: true, deviation };
    }

    if (absDeviation <= 0.2) {
      // 偏差在 20% 以内，警告
      return {
        isReasonable: true,
        deviation,
        suggestion: deviation > 0 
          ? `价格偏高，历史平均价 ¥${distribution.avg.toFixed(1)}`
          : `价格偏低，历史平均价 ¥${distribution.avg.toFixed(1)}`
      };
    }

    // 偏差超过 20%，不合理
    return {
      isReasonable: false,
      deviation,
      suggestion: deviation > 0
        ? `价格明显偏高！历史平均价 ¥${distribution.avg.toFixed(1)}，建议 ¥${distribution.mode.toFixed(1)}`
        : `价格明显偏低！历史平均价 ¥${distribution.avg.toFixed(1)}，可能亏本`
    };
  }

  /**
   * 批量更新价格分布（适合定时任务）
   */
  async updateAllDistributions(): Promise<number> {
    const db = databaseService.getConnection();
    if (!db) return 0;

    try {
      // 获取所有有交易记录的商品
      const products = await db.query(`
        SELECT DISTINCT 
          JSON_UNQUOTE(JSON_EXTRACT(itemsJson, '$[*].productName')) as productNames
        FROM transactions 
        WHERE timestamp > DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [this.config.historyDays]);

      let updated = 0;
      for (const row of products) {
        try {
          const names = JSON.parse(row.productNames || '[]');
          for (const name of names) {
            if (name) {
              await this.getPriceDistribution(name);
              updated++;
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
      }

      return updated;
    } catch (error) {
      console.error('批量更新价格分布失败:', error);
      return 0;
    }
  }

  /**
   * 从数据库加载价格历史
   */
  private async loadPriceHistory(
    productName: string,
    partnerId?: number
  ): Promise<Array<{ price: number; timestamp: Date }>> {
    const db = databaseService.getConnection();
    if (!db) return [];

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - this.config.historyDays);

      // 查询包含该商品的交易记录
      let query = `
        SELECT itemsJson, timestamp 
        FROM transactions 
        WHERE timestamp >= ?
      `;
      const params: any[] = [startDate];

      if (partnerId) {
        query += ' AND partnerId = ?';
        params.push(partnerId);
      }

      query += ' ORDER BY timestamp DESC';

      const rows = await db.query(query, params);

      const priceHistory: Array<{ price: number; timestamp: Date }> = [];

      for (const row of rows) {
        try {
          const items = JSON.parse(row.itemsJson);
          for (const item of items) {
            if (
              item.productName?.toLowerCase() === productName.toLowerCase() &&
              item.unitPrice
            ) {
              priceHistory.push({
                price: parseFloat(item.unitPrice),
                timestamp: new Date(row.timestamp)
              });
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
      }

      return priceHistory;
    } catch (error) {
      console.error('加载价格历史失败:', error);
      return [];
    }
  }

  /**
   * 计算价格分布统计
   */
  private calculateDistribution(
    productName: string,
    partnerId: number | undefined,
    priceHistory: Array<{ price: number; timestamp: Date }>
  ): PriceDistribution {
    const now = new Date();
    const prices = priceHistory.map(p => p.price);
    const sortedPrices = [...prices].sort((a, b) => a - b);

    // 基础统计
    const min = sortedPrices[0];
    const max = sortedPrices[sortedPrices.length - 1];
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const median = this.calculateMedian(sortedPrices);
    const mode = this.calculateMode(prices);
    const stdDev = this.calculateStdDev(prices, avg);

    // 时间加权平均
    const weightedData = priceHistory.map(p => {
      const daysDiff = (now.getTime() - p.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      const weight = Math.pow(0.5, daysDiff / this.config.halfLifeDays);
      return { ...p, weight };
    });

    const totalWeight = weightedData.reduce((sum, p) => sum + p.weight, 0);
    const weightedAvg = totalWeight > 0
      ? weightedData.reduce((sum, p) => sum + p.price * p.weight, 0) / totalWeight
      : avg;

    // 置信度计算
    const confidence = this.calculateConfidence(
      prices.length,
      stdDev,
      avg,
      priceHistory[0]?.timestamp
    );

    return {
      productName,
      partnerId,
      min,
      max,
      avg,
      median,
      mode,
      stdDev,
      weightedAvg,
      confidence,
      sampleCount: prices.length,
      priceHistory: weightedData,
      lastUpdatedAt: now
    };
  }

  /**
   * 计算中位数
   */
  private calculateMedian(sortedPrices: number[]): number {
    const mid = Math.floor(sortedPrices.length / 2);
    if (sortedPrices.length % 2 === 0) {
      return (sortedPrices[mid - 1] + sortedPrices[mid]) / 2;
    }
    return sortedPrices[mid];
  }

  /**
   * 计算众数
   */
  private calculateMode(prices: number[]): number {
    // 四舍五入到小数点后一位
    const rounded = prices.map(p => Math.round(p * 10) / 10);
    
    const frequency = new Map<number, number>();
    for (const p of rounded) {
      frequency.set(p, (frequency.get(p) || 0) + 1);
    }

    let mode = rounded[0];
    let maxFreq = 0;
    for (const [value, freq] of frequency.entries()) {
      if (freq > maxFreq) {
        maxFreq = freq;
        mode = value;
      }
    }

    return mode;
  }

  /**
   * 计算标准差
   */
  private calculateStdDev(prices: number[], avg: number): number {
    if (prices.length <= 1) return 0;

    const squaredDiffs = prices.map(p => Math.pow(p - avg, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (prices.length - 1);
    return Math.sqrt(variance);
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    sampleCount: number,
    stdDev: number,
    avg: number,
    lastTimestamp?: Date
  ): number {
    let confidence = 1.0;

    // 1. 样本数量因素
    if (sampleCount < this.config.minSampleSize) {
      confidence *= sampleCount / this.config.minSampleSize;
    }

    // 2. 价格稳定性因素（变异系数）
    const cv = avg > 0 ? stdDev / avg : 0;
    if (cv > this.config.volatilityThreshold) {
      confidence *= Math.max(0.3, 1 - cv);
    }

    // 3. 时效性因素
    if (lastTimestamp) {
      const daysSinceLast = (Date.now() - lastTimestamp.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLast > 7) {
        // 超过 7 天，置信度开始下降
        confidence *= Math.max(0.5, 1 - (daysSinceLast - 7) / 30);
      }
    }

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * 获取缓存键
   */
  private getCacheKey(productName: string, partnerId?: number): string {
    return `${productName.toLowerCase()}_${partnerId || 'all'}`;
  }

  /**
   * 检查缓存是否有效（1 小时内）
   */
  private isCacheValid(distribution: PriceDistribution): boolean {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return distribution.lastUpdatedAt > hourAgo;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.priceCache.clear();
  }
}

// 导出单例
export const historyLearningService = new HistoryLearningService();

