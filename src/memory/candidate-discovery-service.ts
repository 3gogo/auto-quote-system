/**
 * 候选发现服务
 * 从交易记录中自动发现商品和顾客候选
 */

import { databaseService } from '../database';
import { aliasClusterService, ClusterResult, CandidateName } from '../embedding';

/**
 * 候选商品统计
 */
export interface ProductCandidate {
  /** 商品名称 */
  name: string;
  /** 出现频率 */
  frequency: number;
  /** 价格分布 */
  priceDistribution: {
    min: number;
    max: number;
    avg: number;
    mode: number;
    prices: number[];
  };
  /** 常见数量 */
  commonQuantities: number[];
  /** 常见单位 */
  commonUnits: string[];
  /** 最后出现时间 */
  lastSeenAt: Date;
  /** 是否已确认为正式商品 */
  isConfirmed: boolean;
  /** 关联的正式商品 ID */
  productId?: number;
}

/**
 * 候选顾客统计
 */
export interface PartnerCandidate {
  /** 顾客名称 */
  name: string;
  /** 出现频率 */
  frequency: number;
  /** 消费总额 */
  totalAmount: number;
  /** 访问次数 */
  visitCount: number;
  /** 平均客单价 */
  avgOrderValue: number;
  /** 最后出现时间 */
  lastSeenAt: Date;
  /** 是否已确认为正式顾客 */
  isConfirmed: boolean;
  /** 关联的正式顾客 ID */
  partnerId?: number;
}

/**
 * 发现结果
 */
export interface DiscoveryResult {
  /** 商品候选 */
  productCandidates: ProductCandidate[];
  /** 顾客候选 */
  partnerCandidates: PartnerCandidate[];
  /** 商品聚类结果 */
  productClusters: ClusterResult[];
  /** 顾客聚类结果 */
  partnerClusters: ClusterResult[];
  /** 发现时间 */
  discoveredAt: Date;
}

/**
 * 候选发现服务配置
 */
export interface CandidateDiscoveryConfig {
  /** 最小出现频率（低于此值不列为候选） */
  minFrequency?: number;
  /** 分析的天数 */
  daysToAnalyze?: number;
  /** 是否启用聚类 */
  enableClustering?: boolean;
}

/**
 * 候选发现服务
 */
export class CandidateDiscoveryService {
  private config: Required<CandidateDiscoveryConfig>;
  private initialized = false;

  constructor(config: CandidateDiscoveryConfig = {}) {
    this.config = {
      minFrequency: config.minFrequency || 2,
      daysToAnalyze: config.daysToAnalyze || 30,
      enableClustering: config.enableClustering ?? true
    };
  }

  /**
   * 初始化服务
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    if (this.config.enableClustering) {
      await aliasClusterService.init();
    }

    this.initialized = true;
    console.log('✅ 候选发现服务初始化成功');
  }

  /**
   * 执行候选发现
   */
  async discover(): Promise<DiscoveryResult> {
    if (!this.initialized) {
      await this.init();
    }

    console.log('🔍 开始候选发现...');

    // 1. 从交易记录中提取商品候选
    const productCandidates = await this.discoverProductCandidates();
    console.log(`  发现 ${productCandidates.length} 个商品候选`);

    // 2. 从交易记录中提取顾客候选
    const partnerCandidates = await this.discoverPartnerCandidates();
    console.log(`  发现 ${partnerCandidates.length} 个顾客候选`);

    // 3. 对商品候选进行聚类
    let productClusters: ClusterResult[] = [];
    if (this.config.enableClustering && productCandidates.length > 0) {
      const productNames: CandidateName[] = productCandidates.map(p => ({
        name: p.name,
        frequency: p.frequency,
        sourceType: 'product' as const
      }));
      productClusters = await aliasClusterService.clusterNames(productNames);
      console.log(`  商品聚类完成，生成 ${productClusters.length} 个聚类`);
    }

    // 4. 对顾客候选进行聚类
    let partnerClusters: ClusterResult[] = [];
    if (this.config.enableClustering && partnerCandidates.length > 0) {
      const partnerNames: CandidateName[] = partnerCandidates.map(p => ({
        name: p.name,
        frequency: p.frequency,
        sourceType: 'partner' as const
      }));
      partnerClusters = await aliasClusterService.clusterNames(partnerNames);
      console.log(`  顾客聚类完成，生成 ${partnerClusters.length} 个聚类`);
    }

    console.log('✅ 候选发现完成');

    return {
      productCandidates,
      partnerCandidates,
      productClusters,
      partnerClusters,
      discoveredAt: new Date()
    };
  }

  /**
   * 发现商品候选
   */
  private async discoverProductCandidates(): Promise<ProductCandidate[]> {
    const db = databaseService.getConnection();
    if (!db) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - this.config.daysToAnalyze);

    try {
      // 查询交易记录
      const rows = await db.query(
        `SELECT itemsJson, timestamp FROM transactions 
         WHERE timestamp >= ? 
         ORDER BY timestamp DESC`,
        [startDate]
      );

      // 统计商品出现情况
      const productStats = new Map<string, {
        frequency: number;
        prices: number[];
        quantities: number[];
        units: string[];
        lastSeenAt: Date;
      }>();

      for (const row of rows) {
        const items = JSON.parse(row.itemsJson);
        const timestamp = new Date(row.timestamp);

        for (const item of items) {
          const name = item.productName?.toLowerCase().trim();
          if (!name) continue;

          const existing = productStats.get(name) || {
            frequency: 0,
            prices: [],
            quantities: [],
            units: [],
            lastSeenAt: timestamp
          };

          existing.frequency++;
          if (item.unitPrice) existing.prices.push(item.unitPrice);
          if (item.quantity) existing.quantities.push(item.quantity);
          if (item.unit && !existing.units.includes(item.unit)) {
            existing.units.push(item.unit);
          }
          if (timestamp > existing.lastSeenAt) {
            existing.lastSeenAt = timestamp;
          }

          productStats.set(name, existing);
        }
      }

      // 查询已确认的商品
      const confirmedProducts = await db.query(
        `SELECT id, name, aliases FROM products WHERE isActive = 1`
      );
      const confirmedNames = new Set<string>();
      const nameToProductId = new Map<string, number>();
      
      for (const product of confirmedProducts) {
        confirmedNames.add(product.name.toLowerCase());
        nameToProductId.set(product.name.toLowerCase(), product.id);
        
        const aliases = JSON.parse(product.aliases || '[]');
        for (const alias of aliases) {
          confirmedNames.add(alias.toLowerCase());
          nameToProductId.set(alias.toLowerCase(), product.id);
        }
      }

      // 生成候选列表
      const candidates: ProductCandidate[] = [];
      for (const [name, stats] of productStats.entries()) {
        if (stats.frequency < this.config.minFrequency) continue;

        const prices = stats.prices;
        const priceDistribution = {
          min: prices.length > 0 ? Math.min(...prices) : 0,
          max: prices.length > 0 ? Math.max(...prices) : 0,
          avg: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
          mode: this.calculateMode(prices),
          prices: prices.slice(-20) // 保留最近 20 条价格记录
        };

        candidates.push({
          name,
          frequency: stats.frequency,
          priceDistribution,
          commonQuantities: [...new Set(stats.quantities)].slice(0, 5),
          commonUnits: stats.units,
          lastSeenAt: stats.lastSeenAt,
          isConfirmed: confirmedNames.has(name),
          productId: nameToProductId.get(name)
        });
      }

      // 按频率排序
      return candidates.sort((a, b) => b.frequency - a.frequency);
    } catch (error) {
      console.error('发现商品候选失败:', error);
      return [];
    }
  }

  /**
   * 发现顾客候选
   */
  private async discoverPartnerCandidates(): Promise<PartnerCandidate[]> {
    const db = databaseService.getConnection();
    if (!db) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - this.config.daysToAnalyze);

    try {
      // 查询交易记录中的顾客统计
      const rows = await db.query(
        `SELECT 
           p.id as partnerId,
           p.name as partnerName,
           COUNT(t.id) as visitCount,
           SUM(t.totalPrice) as totalAmount,
           MAX(t.timestamp) as lastSeenAt
         FROM transactions t
         LEFT JOIN partners p ON t.partnerId = p.id
         WHERE t.timestamp >= ?
         GROUP BY t.partnerId, p.name`,
        [startDate]
      );

      // 查询已确认的顾客
      const confirmedPartners = await db.query(
        `SELECT id, name, aliases FROM partners WHERE isActive = 1`
      );
      const confirmedNames = new Set<string>();
      const nameToPartnerId = new Map<string, number>();
      
      for (const partner of confirmedPartners) {
        confirmedNames.add(partner.name.toLowerCase());
        nameToPartnerId.set(partner.name.toLowerCase(), partner.id);
        
        const aliases = JSON.parse(partner.aliases || '[]');
        for (const alias of aliases) {
          confirmedNames.add(alias.toLowerCase());
          nameToPartnerId.set(alias.toLowerCase(), partner.id);
        }
      }

      // 生成候选列表
      const candidates: PartnerCandidate[] = [];
      for (const row of rows) {
        const name = row.partnerName?.toLowerCase().trim() || '未知顾客';
        const visitCount = parseInt(row.visitCount) || 0;
        const totalAmount = parseFloat(row.totalAmount) || 0;

        if (visitCount < this.config.minFrequency) continue;

        candidates.push({
          name,
          frequency: visitCount,
          totalAmount,
          visitCount,
          avgOrderValue: visitCount > 0 ? totalAmount / visitCount : 0,
          lastSeenAt: new Date(row.lastSeenAt),
          isConfirmed: confirmedNames.has(name) || row.partnerId !== null,
          partnerId: row.partnerId || nameToPartnerId.get(name)
        });
      }

      // 按消费总额排序
      return candidates.sort((a, b) => b.totalAmount - a.totalAmount);
    } catch (error) {
      console.error('发现顾客候选失败:', error);
      return [];
    }
  }

  /**
   * 计算众数（最常见的价格）
   */
  private calculateMode(values: number[]): number {
    if (values.length === 0) return 0;

    // 四舍五入到小数点后一位
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
   * 将聚类结果应用到商品（合并别名）
   */
  async applyProductClusters(clusters: ClusterResult[]): Promise<number> {
    const db = databaseService.getConnection();
    if (!db) return 0;

    let updated = 0;

    for (const cluster of clusters) {
      if (cluster.aliases.length === 0) continue;

      // 查找是否有对应的正式商品
      const products = await db.query(
        `SELECT id, name, aliases FROM products WHERE LOWER(name) = ? LIMIT 1`,
        [cluster.primaryName.toLowerCase()]
      );

      if (products.length > 0) {
        // 更新现有商品的别名
        const product = products[0];
        const existingAliases = JSON.parse(product.aliases || '[]');
        const newAliases = [...new Set([...existingAliases, ...cluster.aliases])];

        await db.query(
          `UPDATE products SET aliases = ?, updatedAt = NOW() WHERE id = ?`,
          [JSON.stringify(newAliases), product.id]
        );
        updated++;
      }
    }

    return updated;
  }

  /**
   * 将聚类结果应用到顾客（合并别名）
   */
  async applyPartnerClusters(clusters: ClusterResult[]): Promise<number> {
    const db = databaseService.getConnection();
    if (!db) return 0;

    let updated = 0;

    for (const cluster of clusters) {
      if (cluster.aliases.length === 0) continue;

      // 查找是否有对应的正式顾客
      const partners = await db.query(
        `SELECT id, name, aliases FROM partners WHERE LOWER(name) = ? LIMIT 1`,
        [cluster.primaryName.toLowerCase()]
      );

      if (partners.length > 0) {
        // 更新现有顾客的别名
        const partner = partners[0];
        const existingAliases = JSON.parse(partner.aliases || '[]');
        const newAliases = [...new Set([...existingAliases, ...cluster.aliases])];

        await db.query(
          `UPDATE partners SET aliases = ?, updatedAt = NOW() WHERE id = ?`,
          [JSON.stringify(newAliases), partner.id]
        );
        updated++;
      }
    }

    return updated;
  }
}

// 导出单例
export const candidateDiscoveryService = new CandidateDiscoveryService();

