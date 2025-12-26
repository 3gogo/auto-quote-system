/**
 * 毛利分析报表服务
 * 提供商品/顾客维度的毛利分析和砍价识别
 */

import { databaseService } from '../database';

/**
 * 商品毛利分析
 */
export interface ProductProfitAnalysis {
  /** 商品名称 */
  productName: string;
  /** 商品 ID */
  productId?: number;
  /** 销售数量 */
  totalQuantity: number;
  /** 销售额 */
  totalRevenue: number;
  /** 总成本 */
  totalCost: number;
  /** 毛利 */
  grossProfit: number;
  /** 毛利率 */
  profitMargin: number;
  /** 销售次数 */
  salesCount: number;
  /** 平均单价 */
  avgUnitPrice: number;
  /** 成本价 */
  baseCost: number;
  /** 价格波动范围 */
  priceRange: {
    min: number;
    max: number;
  };
  /** 被砍价次数（低于平均价） */
  bargainCount: number;
  /** 砍价率 */
  bargainRate: number;
}

/**
 * 顾客利润贡献分析
 */
export interface PartnerProfitContribution {
  /** 顾客名称 */
  partnerName: string;
  /** 顾客 ID */
  partnerId: number;
  /** 顾客等级 */
  partnerLevel: string;
  /** 购买次数 */
  purchaseCount: number;
  /** 消费总额 */
  totalSpent: number;
  /** 贡献毛利 */
  profitContribution: number;
  /** 平均毛利率 */
  avgProfitMargin: number;
  /** 平均客单价 */
  avgOrderValue: number;
  /** 砍价倾向得分（0-1，越高越爱砍价） */
  bargainTendency: number;
  /** 最后购买时间 */
  lastPurchaseDate: Date;
}

/**
 * 砍价商品分析
 */
export interface BargainProductAnalysis {
  /** 商品名称 */
  productName: string;
  /** 商品 ID */
  productId?: number;
  /** 基准价格 */
  basePrice: number;
  /** 实际成交均价 */
  avgActualPrice: number;
  /** 平均折扣率 */
  avgDiscountRate: number;
  /** 被砍价次数 */
  bargainCount: number;
  /** 正常成交次数 */
  normalCount: number;
  /** 砍价率 */
  bargainRate: number;
  /** 损失毛利估算 */
  lostProfit: number;
  /** 常见砍价客户 */
  frequentBargainers: Array<{
    partnerName: string;
    partnerId: number;
    count: number;
  }>;
}

/**
 * 毛利分析报表
 */
export interface ProfitAnalysisReport {
  /** 分析时间范围 */
  dateRange: {
    start: Date;
    end: Date;
  };
  /** 总体统计 */
  summary: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    avgProfitMargin: number;
    transactionCount: number;
  };
  /** 商品毛利分析 */
  productAnalysis: ProductProfitAnalysis[];
  /** 顾客利润贡献 */
  partnerContribution: PartnerProfitContribution[];
  /** 砍价商品分析 */
  bargainAnalysis: BargainProductAnalysis[];
  /** 生成时间 */
  generatedAt: Date;
}

/**
 * 毛利分析配置
 */
export interface ProfitAnalysisConfig {
  /** 分析天数 */
  daysToAnalyze?: number;
  /** 砍价阈值（低于基准价格多少认为是砍价） */
  bargainThreshold?: number;
  /** 最少销售次数（低于此值不分析） */
  minSalesCount?: number;
}

/**
 * 毛利分析服务
 */
export class ProfitAnalysisService {
  private config: Required<ProfitAnalysisConfig>;
  private initialized = false;

  constructor(config: ProfitAnalysisConfig = {}) {
    this.config = {
      daysToAnalyze: config.daysToAnalyze || 30,
      bargainThreshold: config.bargainThreshold || 0.05, // 5% 以上降价认为是砍价
      minSalesCount: config.minSalesCount || 2
    };
  }

  /**
   * 初始化服务
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    this.initialized = true;
    console.log('✅ 毛利分析服务初始化成功');
  }

  /**
   * 生成完整的毛利分析报表
   */
  async generateReport(customDateRange?: { start: Date; end: Date }): Promise<ProfitAnalysisReport> {
    if (!this.initialized) {
      await this.init();
    }

    const endDate = customDateRange?.end || new Date();
    const startDate = customDateRange?.start || new Date(
      endDate.getTime() - this.config.daysToAnalyze * 24 * 60 * 60 * 1000
    );

    console.log(`📊 生成毛利分析报表: ${startDate.toISOString()} - ${endDate.toISOString()}`);

    // 并行获取各项分析
    const [productAnalysis, partnerContribution, bargainAnalysis, summary] = await Promise.all([
      this.analyzeProductProfit(startDate, endDate),
      this.analyzePartnerContribution(startDate, endDate),
      this.analyzeBargainProducts(startDate, endDate),
      this.getSummary(startDate, endDate)
    ]);

    return {
      dateRange: { start: startDate, end: endDate },
      summary,
      productAnalysis,
      partnerContribution,
      bargainAnalysis,
      generatedAt: new Date()
    };
  }

  /**
   * 分析商品毛利
   */
  async analyzeProductProfit(startDate: Date, endDate: Date): Promise<ProductProfitAnalysis[]> {
    const db = databaseService.getConnection();
    if (!db) return [];

    try {
      // 查询交易记录
      const rows = await db.query(
        `SELECT itemsJson, totalPrice, totalCost FROM transactions 
         WHERE timestamp BETWEEN ? AND ?`,
        [startDate, endDate]
      );

      // 统计每个商品的销售数据
      const productStats = new Map<string, {
        productId?: number;
        totalQuantity: number;
        totalRevenue: number;
        totalCost: number;
        salesCount: number;
        prices: number[];
        baseCost: number;
      }>();

      for (const row of rows) {
        const items = JSON.parse(row.itemsJson);
        for (const item of items) {
          const name = item.productName?.toLowerCase().trim();
          if (!name) continue;

          const existing = productStats.get(name) || {
            productId: item.productId,
            totalQuantity: 0,
            totalRevenue: 0,
            totalCost: 0,
            salesCount: 0,
            prices: [],
            baseCost: item.cost || 0
          };

          existing.totalQuantity += item.quantity || 1;
          existing.totalRevenue += item.subtotal || 0;
          existing.totalCost += (item.cost || 0) * (item.quantity || 1);
          existing.salesCount++;
          existing.prices.push(item.unitPrice || 0);
          if (item.cost && item.cost > 0) {
            existing.baseCost = item.cost; // 使用最新的成本价
          }

          productStats.set(name, existing);
        }
      }

      // 生成分析结果
      const results: ProductProfitAnalysis[] = [];
      for (const [productName, stats] of productStats.entries()) {
        if (stats.salesCount < this.config.minSalesCount) continue;

        const grossProfit = stats.totalRevenue - stats.totalCost;
        const profitMargin = stats.totalRevenue > 0 
          ? (grossProfit / stats.totalRevenue) * 100 
          : 0;
        const avgUnitPrice = stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length;
        
        // 计算砍价次数（低于平均价格的交易）
        const bargainCount = stats.prices.filter(p => p < avgUnitPrice * (1 - this.config.bargainThreshold)).length;

        results.push({
          productName,
          productId: stats.productId,
          totalQuantity: stats.totalQuantity,
          totalRevenue: stats.totalRevenue,
          totalCost: stats.totalCost,
          grossProfit,
          profitMargin,
          salesCount: stats.salesCount,
          avgUnitPrice,
          baseCost: stats.baseCost,
          priceRange: {
            min: Math.min(...stats.prices),
            max: Math.max(...stats.prices)
          },
          bargainCount,
          bargainRate: stats.salesCount > 0 ? (bargainCount / stats.salesCount) * 100 : 0
        });
      }

      // 按毛利排序
      return results.sort((a, b) => b.grossProfit - a.grossProfit);
    } catch (error) {
      console.error('分析商品毛利失败:', error);
      return [];
    }
  }

  /**
   * 分析顾客利润贡献
   */
  async analyzePartnerContribution(startDate: Date, endDate: Date): Promise<PartnerProfitContribution[]> {
    const db = databaseService.getConnection();
    if (!db) return [];

    try {
      const rows = await db.query(`
        SELECT 
          t.partnerId,
          p.name as partnerName,
          p.level as partnerLevel,
          COUNT(t.id) as purchaseCount,
          SUM(t.totalPrice) as totalSpent,
          SUM(t.totalCost) as totalCost,
          MAX(t.timestamp) as lastPurchaseDate,
          t.itemsJson
        FROM transactions t
        LEFT JOIN partners p ON t.partnerId = p.id
        WHERE t.timestamp BETWEEN ? AND ?
        GROUP BY t.partnerId, p.name, p.level
      `, [startDate, endDate]);

      // 计算每个顾客的砍价倾向
      const partnerBargainStats = await this.calculatePartnerBargainStats(startDate, endDate);

      const results: PartnerProfitContribution[] = [];
      for (const row of rows) {
        const totalSpent = parseFloat(row.totalSpent) || 0;
        const totalCost = parseFloat(row.totalCost) || 0;
        const profitContribution = totalSpent - totalCost;
        const purchaseCount = parseInt(row.purchaseCount) || 0;

        if (purchaseCount < this.config.minSalesCount) continue;

        results.push({
          partnerName: row.partnerName || '未知顾客',
          partnerId: row.partnerId || 0,
          partnerLevel: row.partnerLevel || 'normal',
          purchaseCount,
          totalSpent,
          profitContribution,
          avgProfitMargin: totalSpent > 0 ? (profitContribution / totalSpent) * 100 : 0,
          avgOrderValue: purchaseCount > 0 ? totalSpent / purchaseCount : 0,
          bargainTendency: partnerBargainStats.get(row.partnerId) || 0,
          lastPurchaseDate: new Date(row.lastPurchaseDate)
        });
      }

      // 按利润贡献排序
      return results.sort((a, b) => b.profitContribution - a.profitContribution);
    } catch (error) {
      console.error('分析顾客利润贡献失败:', error);
      return [];
    }
  }

  /**
   * 分析经常被砍价的商品
   */
  async analyzeBargainProducts(startDate: Date, endDate: Date): Promise<BargainProductAnalysis[]> {
    const db = databaseService.getConnection();
    if (!db) return [];

    try {
      // 获取商品的基准价格（从 products 表或历史平均）
      const productPrices = await this.getProductBasePrices();

      // 查询交易记录
      const rows = await db.query(
        `SELECT itemsJson, partnerId FROM transactions 
         WHERE timestamp BETWEEN ? AND ?`,
        [startDate, endDate]
      );

      // 统计砍价情况
      const bargainStats = new Map<string, {
        productId?: number;
        basePrice: number;
        prices: number[];
        bargainCount: number;
        normalCount: number;
        bargainers: Map<number, number>;
      }>();

      for (const row of rows) {
        const items = JSON.parse(row.itemsJson);
        const partnerId = row.partnerId;

        for (const item of items) {
          const name = item.productName?.toLowerCase().trim();
          if (!name) continue;

          const basePrice = productPrices.get(name) || item.unitPrice;
          const actualPrice = item.unitPrice || 0;

          const existing = bargainStats.get(name) || {
            productId: item.productId,
            basePrice,
            prices: [],
            bargainCount: 0,
            normalCount: 0,
            bargainers: new Map()
          };

          existing.prices.push(actualPrice);

          // 判断是否砍价
          if (actualPrice < basePrice * (1 - this.config.bargainThreshold)) {
            existing.bargainCount++;
            if (partnerId) {
              existing.bargainers.set(
                partnerId,
                (existing.bargainers.get(partnerId) || 0) + 1
              );
            }
          } else {
            existing.normalCount++;
          }

          bargainStats.set(name, existing);
        }
      }

      // 生成砍价分析结果
      const results: BargainProductAnalysis[] = [];
      for (const [productName, stats] of bargainStats.entries()) {
        const totalCount = stats.bargainCount + stats.normalCount;
        if (totalCount < this.config.minSalesCount) continue;
        if (stats.bargainCount === 0) continue; // 没有被砍价的商品不显示

        const avgActualPrice = stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length;
        const avgDiscountRate = stats.basePrice > 0 
          ? (1 - avgActualPrice / stats.basePrice) * 100 
          : 0;
        const lostProfit = (stats.basePrice - avgActualPrice) * totalCount;

        // 获取常见砍价客户
        const frequentBargainers: Array<{ partnerName: string; partnerId: number; count: number }> = [];
        const sortedBargainers = [...stats.bargainers.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        for (const [partnerId, count] of sortedBargainers) {
          const partner = await db.query(
            'SELECT name FROM partners WHERE id = ?',
            [partnerId]
          );
          frequentBargainers.push({
            partnerName: partner[0]?.name || '未知',
            partnerId,
            count
          });
        }

        results.push({
          productName,
          productId: stats.productId,
          basePrice: stats.basePrice,
          avgActualPrice,
          avgDiscountRate,
          bargainCount: stats.bargainCount,
          normalCount: stats.normalCount,
          bargainRate: (stats.bargainCount / totalCount) * 100,
          lostProfit,
          frequentBargainers
        });
      }

      // 按砍价率排序
      return results.sort((a, b) => b.bargainRate - a.bargainRate);
    } catch (error) {
      console.error('分析砍价商品失败:', error);
      return [];
    }
  }

  /**
   * 获取总体统计
   */
  private async getSummary(startDate: Date, endDate: Date): Promise<{
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    avgProfitMargin: number;
    transactionCount: number;
  }> {
    const db = databaseService.getConnection();
    if (!db) {
      return {
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        avgProfitMargin: 0,
        transactionCount: 0
      };
    }

    try {
      const rows = await db.query(`
        SELECT 
          COUNT(*) as transactionCount,
          SUM(totalPrice) as totalRevenue,
          SUM(totalCost) as totalCost
        FROM transactions
        WHERE timestamp BETWEEN ? AND ?
      `, [startDate, endDate]);

      const row = rows[0];
      const totalRevenue = parseFloat(row.totalRevenue) || 0;
      const totalCost = parseFloat(row.totalCost) || 0;
      const totalProfit = totalRevenue - totalCost;

      return {
        totalRevenue,
        totalCost,
        totalProfit,
        avgProfitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        transactionCount: parseInt(row.transactionCount) || 0
      };
    } catch (error) {
      console.error('获取总体统计失败:', error);
      return {
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        avgProfitMargin: 0,
        transactionCount: 0
      };
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
   * 计算顾客砍价倾向
   */
  private async calculatePartnerBargainStats(
    startDate: Date,
    endDate: Date
  ): Promise<Map<number, number>> {
    const db = databaseService.getConnection();
    if (!db) return new Map();

    try {
      const productPrices = await this.getProductBasePrices();
      const rows = await db.query(
        `SELECT partnerId, itemsJson FROM transactions 
         WHERE timestamp BETWEEN ? AND ? AND partnerId IS NOT NULL`,
        [startDate, endDate]
      );

      const partnerStats = new Map<number, { bargainCount: number; totalCount: number }>();

      for (const row of rows) {
        const partnerId = row.partnerId;
        const items = JSON.parse(row.itemsJson);

        for (const item of items) {
          const name = item.productName?.toLowerCase().trim();
          const basePrice = productPrices.get(name) || item.unitPrice;
          const actualPrice = item.unitPrice || 0;

          const existing = partnerStats.get(partnerId) || { bargainCount: 0, totalCount: 0 };
          existing.totalCount++;

          if (actualPrice < basePrice * (1 - this.config.bargainThreshold)) {
            existing.bargainCount++;
          }

          partnerStats.set(partnerId, existing);
        }
      }

      // 计算砍价倾向得分
      const result = new Map<number, number>();
      for (const [partnerId, stats] of partnerStats.entries()) {
        result.set(
          partnerId,
          stats.totalCount > 0 ? stats.bargainCount / stats.totalCount : 0
        );
      }

      return result;
    } catch (error) {
      return new Map();
    }
  }
}

// 导出单例
export const profitAnalysisService = new ProfitAnalysisService();

