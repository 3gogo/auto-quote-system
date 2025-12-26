/**
 * 自动规则推荐服务
 * 基于历史数据识别价格模式并生成规则建议
 */

import { databaseService } from '../database';
import { PricingRule, PricingScopeType, RoundingStrategy } from '../types/pricing';
import { historyLearningService } from './history-learning-service';

/**
 * 规则推荐类型
 */
export type RecommendationType = 
  | 'special'     // 顾客+商品专用规则
  | 'partner'     // 顾客专属规则
  | 'category'    // 商品类别规则
  | 'product';    // 单品规则

/**
 * 规则推荐
 */
export interface RuleRecommendation {
  /** 推荐 ID */
  id: string;
  /** 推荐类型 */
  type: RecommendationType;
  /** 推荐的规则 */
  rule: Omit<PricingRule, 'id'>;
  /** 推荐理由 */
  reason: string;
  /** 置信度（0-1） */
  confidence: number;
  /** 影响范围（预计影响的交易数） */
  impactCount: number;
  /** 预计毛利变化 */
  estimatedProfitChange: number;
  /** 基于的数据样本数 */
  sampleCount: number;
  /** 发现的价格模式 */
  pattern: {
    avgPrice: number;
    mode: number;
    stdDev: number;
    stability: number; // 价格稳定性（0-1）
  };
}

/**
 * 规则推荐配置
 */
export interface RuleRecommendationConfig {
  /** 分析天数 */
  daysToAnalyze?: number;
  /** 最小样本数 */
  minSampleSize?: number;
  /** 最小置信度阈值 */
  minConfidence?: number;
  /** 价格稳定性阈值（低于此值不推荐固定价格规则） */
  stabilityThreshold?: number;
}

/**
 * 自动规则推荐服务
 */
export class RuleRecommendationService {
  private config: Required<RuleRecommendationConfig>;
  private initialized = false;

  constructor(config: RuleRecommendationConfig = {}) {
    this.config = {
      daysToAnalyze: config.daysToAnalyze || 30,
      minSampleSize: config.minSampleSize || 5,
      minConfidence: config.minConfidence || 0.6,
      stabilityThreshold: config.stabilityThreshold || 0.8
    };
  }

  /**
   * 初始化服务
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    await historyLearningService.init();
    this.initialized = true;
    console.log('✅ 规则推荐服务初始化成功');
  }

  /**
   * 生成所有规则推荐
   */
  async generateRecommendations(): Promise<RuleRecommendation[]> {
    if (!this.initialized) {
      await this.init();
    }

    console.log('🔍 开始生成规则推荐...');

    const recommendations: RuleRecommendation[] = [];

    // 1. 发现顾客+商品专用规则
    const specialRules = await this.discoverSpecialRules();
    recommendations.push(...specialRules);

    // 2. 发现商品固定价格规则
    const productRules = await this.discoverProductRules();
    recommendations.push(...productRules);

    // 3. 发现顾客折扣规则
    const partnerRules = await this.discoverPartnerRules();
    recommendations.push(...partnerRules);

    // 4. 发现类别规则
    const categoryRules = await this.discoverCategoryRules();
    recommendations.push(...categoryRules);

    // 过滤低置信度的推荐
    const filtered = recommendations.filter(r => r.confidence >= this.config.minConfidence);

    // 按置信度排序
    filtered.sort((a, b) => b.confidence - a.confidence);

    console.log(`✅ 生成了 ${filtered.length} 条规则推荐`);

    return filtered;
  }

  /**
   * 发现顾客+商品专用规则
   * 场景：某顾客经常以固定价格购买某商品
   */
  private async discoverSpecialRules(): Promise<RuleRecommendation[]> {
    const db = databaseService.getConnection();
    if (!db) return [];

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - this.config.daysToAnalyze);

      // 查询顾客-商品价格组合
      const rows = await db.query(
        `SELECT partnerId, itemsJson FROM transactions 
         WHERE timestamp >= ? AND partnerId IS NOT NULL`,
        [startDate]
      );

      // 统计每个顾客-商品组合的价格
      const comboPrices = new Map<string, {
        partnerId: number;
        partnerName: string;
        productName: string;
        prices: number[];
      }>();

      for (const row of rows) {
        const partnerId = row.partnerId;
        const items = JSON.parse(row.itemsJson);

        for (const item of items) {
          const productName = item.productName?.toLowerCase().trim();
          if (!productName || !item.unitPrice) continue;

          const key = `${partnerId}_${productName}`;
          const existing = comboPrices.get(key) || {
            partnerId,
            partnerName: '',
            productName,
            prices: []
          };

          existing.prices.push(item.unitPrice);
          comboPrices.set(key, existing);
        }
      }

      // 查询顾客名称
      const partnerIds = [...new Set([...comboPrices.values()].map(c => c.partnerId))];
      if (partnerIds.length > 0) {
        const partners = await db.query(
          `SELECT id, name FROM partners WHERE id IN (${partnerIds.join(',')})`
        );
        const partnerMap = new Map(partners.map((p: any) => [p.id, p.name]));
        
        for (const combo of comboPrices.values()) {
          combo.partnerName = partnerMap.get(combo.partnerId) || '未知';
        }
      }

      // 生成推荐
      const recommendations: RuleRecommendation[] = [];
      
      for (const [key, combo] of comboPrices.entries()) {
        if (combo.prices.length < this.config.minSampleSize) continue;

        const avgPrice = combo.prices.reduce((a, b) => a + b, 0) / combo.prices.length;
        const mode = this.calculateMode(combo.prices);
        const stdDev = this.calculateStdDev(combo.prices, avgPrice);
        const stability = avgPrice > 0 ? 1 - (stdDev / avgPrice) : 0;

        // 只推荐价格稳定的组合
        if (stability < this.config.stabilityThreshold) continue;

        const confidence = Math.min(1, stability * (combo.prices.length / 10));

        recommendations.push({
          id: `special_${key}`,
          type: 'special',
          rule: {
            scopeType: 'special',
            scopeValue: `${combo.partnerName}_${combo.productName}`,
            formula: String(mode),
            rounding: 'none',
            priority: 100,
            enabled: false,
            partnerId: combo.partnerId,
            productCategory: combo.productName
          },
          reason: `${combo.partnerName} 经常以 ¥${mode.toFixed(1)} 购买 ${combo.productName}，价格稳定`,
          confidence,
          impactCount: combo.prices.length,
          estimatedProfitChange: 0,
          sampleCount: combo.prices.length,
          pattern: {
            avgPrice,
            mode,
            stdDev,
            stability
          }
        });
      }

      return recommendations;
    } catch (error) {
      console.error('发现专用规则失败:', error);
      return [];
    }
  }

  /**
   * 发现商品固定价格规则
   * 场景：某商品总是以固定价格销售
   */
  private async discoverProductRules(): Promise<RuleRecommendation[]> {
    const db = databaseService.getConnection();
    if (!db) return [];

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - this.config.daysToAnalyze);

      // 查询商品价格统计
      const rows = await db.query(
        `SELECT itemsJson FROM transactions WHERE timestamp >= ?`,
        [startDate]
      );

      // 统计每个商品的价格
      const productPrices = new Map<string, {
        productId?: number;
        prices: number[];
        costs: number[];
      }>();

      for (const row of rows) {
        const items = JSON.parse(row.itemsJson);

        for (const item of items) {
          const productName = item.productName?.toLowerCase().trim();
          if (!productName || !item.unitPrice) continue;

          const existing = productPrices.get(productName) || {
            productId: item.productId,
            prices: [],
            costs: []
          };

          existing.prices.push(item.unitPrice);
          if (item.cost) existing.costs.push(item.cost);
          productPrices.set(productName, existing);
        }
      }

      // 生成推荐
      const recommendations: RuleRecommendation[] = [];
      
      for (const [productName, stats] of productPrices.entries()) {
        if (stats.prices.length < this.config.minSampleSize) continue;

        const avgPrice = stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length;
        const mode = this.calculateMode(stats.prices);
        const stdDev = this.calculateStdDev(stats.prices, avgPrice);
        const stability = avgPrice > 0 ? 1 - (stdDev / avgPrice) : 0;

        // 只推荐价格稳定的商品
        if (stability < this.config.stabilityThreshold) continue;

        // 计算成本和毛利率
        const avgCost = stats.costs.length > 0 
          ? stats.costs.reduce((a, b) => a + b, 0) / stats.costs.length 
          : 0;
        
        const marginRate = avgCost > 0 ? ((mode - avgCost) / mode) : 0;

        const confidence = Math.min(1, stability * (stats.prices.length / 20));

        recommendations.push({
          id: `product_${productName}`,
          type: 'product',
          rule: {
            scopeType: 'category', // 用 category 作为单品规则
            scopeValue: productName,
            formula: String(mode),
            rounding: 'none',
            priority: 50,
            enabled: false
          },
          reason: `${productName} 售价稳定在 ¥${mode.toFixed(1)}（毛利率 ${(marginRate * 100).toFixed(1)}%）`,
          confidence,
          impactCount: stats.prices.length,
          estimatedProfitChange: 0,
          sampleCount: stats.prices.length,
          pattern: {
            avgPrice,
            mode,
            stdDev,
            stability
          }
        });
      }

      return recommendations;
    } catch (error) {
      console.error('发现商品规则失败:', error);
      return [];
    }
  }

  /**
   * 发现顾客折扣规则
   * 场景：某顾客通常享受特定折扣
   */
  private async discoverPartnerRules(): Promise<RuleRecommendation[]> {
    const db = databaseService.getConnection();
    if (!db) return [];

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - this.config.daysToAnalyze);

      // 查询顾客交易和对应的基准价格
      const rows = await db.query(`
        SELECT 
          t.partnerId,
          p.name as partnerName,
          p.level as partnerLevel,
          t.itemsJson
        FROM transactions t
        LEFT JOIN partners p ON t.partnerId = p.id
        WHERE t.timestamp >= ? AND t.partnerId IS NOT NULL
      `, [startDate]);

      // 获取商品基准价格
      const productPrices = await this.getProductBasePrices();

      // 统计每个顾客的折扣率
      const partnerDiscounts = new Map<number, {
        partnerName: string;
        partnerLevel: string;
        discountRates: number[];
        transactionCount: number;
      }>();

      for (const row of rows) {
        const partnerId = row.partnerId;
        const items = JSON.parse(row.itemsJson);

        const existing = partnerDiscounts.get(partnerId) || {
          partnerName: row.partnerName || '未知',
          partnerLevel: row.partnerLevel || 'normal',
          discountRates: [],
          transactionCount: 0
        };

        existing.transactionCount++;

        for (const item of items) {
          const productName = item.productName?.toLowerCase().trim();
          const basePrice = productPrices.get(productName);
          const actualPrice = item.unitPrice;

          if (basePrice && actualPrice && basePrice > 0) {
            const discountRate = actualPrice / basePrice;
            existing.discountRates.push(discountRate);
          }
        }

        partnerDiscounts.set(partnerId, existing);
      }

      // 生成推荐
      const recommendations: RuleRecommendation[] = [];
      
      for (const [partnerId, stats] of partnerDiscounts.entries()) {
        if (stats.discountRates.length < this.config.minSampleSize) continue;

        const avgDiscount = stats.discountRates.reduce((a, b) => a + b, 0) / stats.discountRates.length;
        const stdDev = this.calculateStdDev(stats.discountRates, avgDiscount);
        const stability = avgDiscount > 0 ? 1 - (stdDev / avgDiscount) : 0;

        // 只推荐有明显折扣且稳定的顾客
        if (stability < this.config.stabilityThreshold * 0.8) continue;
        if (avgDiscount >= 0.98) continue; // 接近原价的不推荐

        const discountPercent = Math.round(avgDiscount * 100);
        const confidence = Math.min(1, stability * (stats.transactionCount / 10));

        recommendations.push({
          id: `partner_${partnerId}`,
          type: 'partner',
          rule: {
            scopeType: 'level',
            scopeValue: `partner_${partnerId}`,
            formula: `price * ${avgDiscount.toFixed(2)}`,
            rounding: 'round_to_0.5',
            priority: 30,
            enabled: false,
            partnerId
          },
          reason: `${stats.partnerName} 通常享受 ${100 - discountPercent}% 折扣`,
          confidence,
          impactCount: stats.transactionCount,
          estimatedProfitChange: 0,
          sampleCount: stats.discountRates.length,
          pattern: {
            avgPrice: avgDiscount,
            mode: avgDiscount,
            stdDev,
            stability
          }
        });
      }

      return recommendations;
    } catch (error) {
      console.error('发现顾客规则失败:', error);
      return [];
    }
  }

  /**
   * 发现类别规则
   * 场景：某类商品有统一的加价率
   */
  private async discoverCategoryRules(): Promise<RuleRecommendation[]> {
    const db = databaseService.getConnection();
    if (!db) return [];

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - this.config.daysToAnalyze);

      // 查询商品分类和价格信息
      const rows = await db.query(`
        SELECT p.category, t.itemsJson
        FROM transactions t
        CROSS JOIN products p
        WHERE t.timestamp >= ?
          AND JSON_SEARCH(t.itemsJson, 'one', p.name) IS NOT NULL
      `, [startDate]);

      // 统计每个分类的加价率
      const categoryMargins = new Map<string, {
        marginRates: number[];
        productCount: number;
      }>();

      // 简化实现：基于 products 表的分类统计
      const products = await db.query(
        `SELECT name, category, baseCost, defaultPrice FROM products WHERE isActive = 1`
      );

      for (const product of products) {
        if (!product.category || !product.baseCost || !product.defaultPrice) continue;

        const marginRate = (product.defaultPrice - product.baseCost) / product.baseCost;

        const existing = categoryMargins.get(product.category) || {
          marginRates: [],
          productCount: 0
        };

        existing.marginRates.push(marginRate);
        existing.productCount++;
        categoryMargins.set(product.category, existing);
      }

      // 生成推荐
      const recommendations: RuleRecommendation[] = [];
      
      for (const [category, stats] of categoryMargins.entries()) {
        if (stats.marginRates.length < 3) continue;

        const avgMargin = stats.marginRates.reduce((a, b) => a + b, 0) / stats.marginRates.length;
        const stdDev = this.calculateStdDev(stats.marginRates, avgMargin);
        const stability = avgMargin > 0 ? 1 - (stdDev / avgMargin) : 0;

        if (stability < this.config.stabilityThreshold * 0.7) continue;

        const multiplier = 1 + avgMargin;
        const confidence = Math.min(1, stability * (stats.productCount / 5));

        recommendations.push({
          id: `category_${category}`,
          type: 'category',
          rule: {
            scopeType: 'category',
            scopeValue: category,
            formula: `cost * ${multiplier.toFixed(2)}`,
            rounding: 'round_to_0.5',
            priority: 20,
            enabled: false,
            productCategory: category
          },
          reason: `${category} 类商品平均加价 ${(avgMargin * 100).toFixed(0)}%`,
          confidence,
          impactCount: stats.productCount,
          estimatedProfitChange: 0,
          sampleCount: stats.marginRates.length,
          pattern: {
            avgPrice: avgMargin,
            mode: avgMargin,
            stdDev,
            stability
          }
        });
      }

      return recommendations;
    } catch (error) {
      console.error('发现类别规则失败:', error);
      return [];
    }
  }

  /**
   * 将推荐应用为正式规则
   */
  async applyRecommendation(recommendationId: string): Promise<boolean> {
    const recommendations = await this.generateRecommendations();
    const recommendation = recommendations.find(r => r.id === recommendationId);

    if (!recommendation) {
      console.error('未找到推荐:', recommendationId);
      return false;
    }

    const db = databaseService.getConnection();
    if (!db) return false;

    try {
      const rule = recommendation.rule;
      
      await db.query(`
        INSERT INTO pricing_rules 
        (scopeType, scopeValue, formula, rounding, priority, enabled, partnerId, productCategory)
        VALUES (?, ?, ?, ?, ?, true, ?, ?)
      `, [
        rule.scopeType,
        rule.scopeValue,
        rule.formula,
        rule.rounding,
        rule.priority,
        rule.partnerId || null,
        rule.productCategory || null
      ]);

      console.log(`✅ 规则已应用: ${recommendationId}`);
      return true;
    } catch (error) {
      console.error('应用规则失败:', error);
      return false;
    }
  }

  /**
   * 获取商品基准价格
   */
  private async getProductBasePrices(): Promise<Map<string, number>> {
    const db = databaseService.getConnection();
    if (!db) return new Map();

    try {
      const rows = await db.query(
        'SELECT name, defaultPrice FROM products WHERE isActive = 1'
      );

      const prices = new Map<string, number>();
      for (const row of rows) {
        prices.set(row.name.toLowerCase(), row.defaultPrice || 0);
      }

      return prices;
    } catch (error) {
      return new Map();
    }
  }

  /**
   * 计算众数
   */
  private calculateMode(values: number[]): number {
    const rounded = values.map(v => Math.round(v * 10) / 10);
    
    const frequency = new Map<number, number>();
    for (const v of rounded) {
      frequency.set(v, (frequency.get(v) || 0) + 1);
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
  private calculateStdDev(values: number[], avg: number): number {
    if (values.length <= 1) return 0;

    const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
    return Math.sqrt(variance);
  }
}

// 导出单例
export const ruleRecommendationService = new RuleRecommendationService();

