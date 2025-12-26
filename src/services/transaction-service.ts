/**
 * 交易记录服务
 * 负责交易的创建、查询和统计分析
 */

import { databaseService } from '../database';
import {
  CreateTransactionRequest,
  TransactionRecord,
  TransactionQuery,
  TransactionStats,
  ProductSalesStats,
  PartnerPurchaseStats,
  TransactionItem
} from '../types/transaction';
import { QuoteResponse } from '../types/pricing';

/**
 * 交易记录服务配置
 */
export interface TransactionServiceConfig {
  /** 是否启用价格学习 */
  enablePriceLearning?: boolean;
  /** 默认每页数量 */
  defaultPageSize?: number;
}

/**
 * 交易记录服务
 */
export class TransactionService {
  private config: Required<TransactionServiceConfig>;
  private initialized: boolean = false;

  constructor(config: TransactionServiceConfig = {}) {
    this.config = {
      enablePriceLearning: true,
      defaultPageSize: 20,
      ...config
    };
  }

  /**
   * 初始化
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      this.initialized = true;
      console.log('✅ 交易记录服务初始化成功');
    } catch (error) {
      console.error('❌ 交易记录服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 从报价创建交易
   */
  async createFromQuote(
    quote: QuoteResponse,
    rawText: string,
    intent: string = 'retail_quote',
    sessionId?: string
  ): Promise<number | null> {
    const items: TransactionItem[] = quote.items.map(item => ({
      productName: item.productName,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.actualUnitPrice || item.suggestedUnitPrice,
      subtotal: item.actualSubtotal || item.suggestedSubtotal,
      cost: item.baseCost,
      productId: item.productId
    }));

    const request: CreateTransactionRequest = {
      items,
      totalPrice: quote.totalActualPrice || quote.totalSuggestedPrice,
      totalCost: items.reduce((sum, item) => sum + (item.cost || 0) * item.quantity, 0),
      rawText,
      intent,
      sessionId
    };

    return this.createTransaction(request);
  }

  /**
   * 创建交易记录
   */
  async createTransaction(request: CreateTransactionRequest): Promise<number | null> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const db = databaseService.getConnection();
      if (!db) {
        console.error('数据库连接不可用');
        return null;
      }

      const result = await db.query(
        `INSERT INTO transactions 
         (partnerId, timestamp, itemsJson, totalPrice, totalCost, rawText, intent)
         VALUES (?, NOW(), ?, ?, ?, ?, ?)`,
        [
          request.partner?.id || null,
          JSON.stringify(request.items),
          request.totalPrice,
          request.totalCost || null,
          request.rawText,
          request.intent
        ]
      );

      const transactionId = result.insertId;

      console.log(`✅ 交易记录已保存: ID=${transactionId}, 总价=${request.totalPrice}`);

      return transactionId;
    } catch (error) {
      console.error('创建交易记录失败:', error);
      return null;
    }
  }

  /**
   * 查询交易记录
   */
  async queryTransactions(query: TransactionQuery = {}): Promise<TransactionRecord[]> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const db = databaseService.getConnection();
      if (!db) return [];

      const conditions: string[] = [];
      const params: any[] = [];

      if (query.partnerId) {
        conditions.push('t.partnerId = ?');
        params.push(query.partnerId);
      }

      if (query.intent) {
        conditions.push('t.intent = ?');
        params.push(query.intent);
      }

      if (query.startDate) {
        conditions.push('t.timestamp >= ?');
        params.push(query.startDate);
      }

      if (query.endDate) {
        conditions.push('t.timestamp <= ?');
        params.push(query.endDate);
      }

      if (query.minAmount) {
        conditions.push('t.totalPrice >= ?');
        params.push(query.minAmount);
      }

      if (query.maxAmount) {
        conditions.push('t.totalPrice <= ?');
        params.push(query.maxAmount);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const page = query.page || 1;
      const pageSize = query.pageSize || this.config.defaultPageSize;
      const offset = (page - 1) * pageSize;

      const sql = `
        SELECT 
          t.id,
          t.partnerId,
          p.name as partnerName,
          t.timestamp,
          t.itemsJson,
          t.totalPrice,
          t.totalCost,
          t.rawText,
          t.intent,
          t.createdAt
        FROM transactions t
        LEFT JOIN partners p ON t.partnerId = p.id
        ${whereClause}
        ORDER BY t.timestamp DESC
        LIMIT ? OFFSET ?
      `;

      params.push(pageSize, offset);

      const rows = await db.query(sql, params);

      return rows.map((row: any) => this.mapRowToRecord(row));
    } catch (error) {
      console.error('查询交易记录失败:', error);
      return [];
    }
  }

  /**
   * 根据 ID 获取交易记录
   */
  async getTransactionById(id: number): Promise<TransactionRecord | null> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const db = databaseService.getConnection();
      if (!db) return null;

      const rows = await db.query(
        `SELECT 
          t.id,
          t.partnerId,
          p.name as partnerName,
          t.timestamp,
          t.itemsJson,
          t.totalPrice,
          t.totalCost,
          t.rawText,
          t.intent,
          t.createdAt
        FROM transactions t
        LEFT JOIN partners p ON t.partnerId = p.id
        WHERE t.id = ?`,
        [id]
      );

      if (rows.length === 0) return null;

      return this.mapRowToRecord(rows[0]);
    } catch (error) {
      console.error('获取交易记录失败:', error);
      return null;
    }
  }

  /**
   * 获取交易统计
   */
  async getStats(query: TransactionQuery = {}): Promise<TransactionStats | null> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const db = databaseService.getConnection();
      if (!db) return null;

      const conditions: string[] = [];
      const params: any[] = [];

      if (query.partnerId) {
        conditions.push('partnerId = ?');
        params.push(query.partnerId);
      }

      if (query.intent) {
        conditions.push('intent = ?');
        params.push(query.intent);
      }

      if (query.startDate) {
        conditions.push('timestamp >= ?');
        params.push(query.startDate);
      }

      if (query.endDate) {
        conditions.push('timestamp <= ?');
        params.push(query.endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const sql = `
        SELECT 
          COUNT(*) as totalCount,
          SUM(totalPrice) as totalRevenue,
          SUM(totalCost) as totalCost,
          AVG(totalPrice) as avgOrderValue,
          MIN(timestamp) as minDate,
          MAX(timestamp) as maxDate
        FROM transactions
        ${whereClause}
      `;

      const rows = await db.query(sql, params);
      const row = rows[0];

      const totalRevenue = parseFloat(row.totalRevenue || 0);
      const totalCost = parseFloat(row.totalCost || 0);
      const totalProfit = totalRevenue - totalCost;
      const avgProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      return {
        totalCount: parseInt(row.totalCount || 0),
        totalRevenue,
        totalCost,
        totalProfit,
        avgProfitMargin,
        avgOrderValue: parseFloat(row.avgOrderValue || 0),
        dateRange: {
          start: row.minDate || new Date(),
          end: row.maxDate || new Date()
        }
      };
    } catch (error) {
      console.error('获取交易统计失败:', error);
      return null;
    }
  }

  /**
   * 获取商品销售统计
   */
  async getProductSalesStats(query: TransactionQuery = {}): Promise<ProductSalesStats[]> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const db = databaseService.getConnection();
      if (!db) return [];

      const conditions: string[] = [];
      const params: any[] = [];

      if (query.startDate) {
        conditions.push('timestamp >= ?');
        params.push(query.startDate);
      }

      if (query.endDate) {
        conditions.push('timestamp <= ?');
        params.push(query.endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const sql = `
        SELECT 
          t.id,
          t.itemsJson
        FROM transactions t
        ${whereClause}
      `;

      const rows = await db.query(sql, params);

      const productMap = new Map<string, {
        productId?: number;
        salesCount: number;
        totalQuantity: number;
        totalRevenue: number;
        prices: number[];
      }>();

      for (const row of rows) {
        const items = JSON.parse(row.itemsJson);
        for (const item of items) {
          const key = item.productName;
          const existing = productMap.get(key);

          if (existing) {
            existing.salesCount++;
            existing.totalQuantity += item.quantity;
            existing.totalRevenue += item.subtotal;
            existing.prices.push(item.unitPrice);
          } else {
            productMap.set(key, {
              productId: item.productId,
              salesCount: 1,
              totalQuantity: item.quantity,
              totalRevenue: item.subtotal,
              prices: [item.unitPrice]
            });
          }
        }
      }

      const stats: ProductSalesStats[] = [];
      for (const [productName, data] of productMap.entries()) {
        stats.push({
          productName,
          productId: data.productId,
          salesCount: data.salesCount,
          totalQuantity: data.totalQuantity,
          totalRevenue: data.totalRevenue,
          avgUnitPrice: data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length
        });
      }

      return stats.sort((a, b) => b.totalRevenue - a.totalRevenue);
    } catch (error) {
      console.error('获取商品销售统计失败:', error);
      return [];
    }
  }

  /**
   * 获取顾客消费统计
   */
  async getPartnerPurchaseStats(query: TransactionQuery = {}): Promise<PartnerPurchaseStats[]> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const db = databaseService.getConnection();
      if (!db) return [];

      const conditions: string[] = ['t.partnerId IS NOT NULL'];
      const params: any[] = [];

      if (query.startDate) {
        conditions.push('t.timestamp >= ?');
        params.push(query.startDate);
      }

      if (query.endDate) {
        conditions.push('t.timestamp <= ?');
        params.push(query.endDate);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const sql = `
        SELECT 
          t.partnerId,
          p.name as partnerName,
          COUNT(*) as purchaseCount,
          SUM(t.totalPrice) as totalSpent,
          AVG(t.totalPrice) as avgOrderValue,
          MAX(t.timestamp) as lastPurchaseDate
        FROM transactions t
        LEFT JOIN partners p ON t.partnerId = p.id
        ${whereClause}
        GROUP BY t.partnerId, p.name
        ORDER BY totalSpent DESC
      `;

      const rows = await db.query(sql, params);

      return rows.map((row: any) => ({
        partnerId: row.partnerId,
        partnerName: row.partnerName || '未知顾客',
        purchaseCount: parseInt(row.purchaseCount),
        totalSpent: parseFloat(row.totalSpent),
        avgOrderValue: parseFloat(row.avgOrderValue),
        lastPurchaseDate: new Date(row.lastPurchaseDate)
      }));
    } catch (error) {
      console.error('获取顾客消费统计失败:', error);
      return [];
    }
  }

  /**
   * 映射数据库行到交易记录
   */
  private mapRowToRecord(row: any): TransactionRecord {
    const items = JSON.parse(row.itemsJson);
    const totalCost = parseFloat(row.totalCost || 0);
    const totalPrice = parseFloat(row.totalPrice);
    const grossProfit = totalCost > 0 ? totalPrice - totalCost : undefined;
    const profitMargin = grossProfit && totalPrice > 0 ? (grossProfit / totalPrice) * 100 : undefined;

    return {
      id: row.id,
      partnerId: row.partnerId,
      partnerName: row.partnerName,
      timestamp: new Date(row.timestamp),
      items,
      totalPrice,
      totalCost: totalCost > 0 ? totalCost : undefined,
      grossProfit,
      profitMargin,
      rawText: row.rawText,
      intent: row.intent,
      createdAt: new Date(row.createdAt)
    };
  }
}

export const transactionService = new TransactionService();
