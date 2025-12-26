/**
 * 交易记录类型定义
 */

import { QuoteResponse } from './pricing';
import { PartnerEntity } from './nlu';

/**
 * 交易商品项
 */
export interface TransactionItem {
  /** 商品名称 */
  productName: string;
  /** 数量 */
  quantity: number;
  /** 单位 */
  unit: string;
  /** 单价 */
  unitPrice: number;
  /** 小计 */
  subtotal: number;
  /** 成本价 */
  cost?: number;
  /** 商品 ID */
  productId?: number;
}

/**
 * 创建交易请求
 */
export interface CreateTransactionRequest {
  /** 顾客信息 */
  partner?: PartnerEntity & {
    id?: number;
    level?: string;
  };
  /** 商品列表 */
  items: TransactionItem[];
  /** 总价 */
  totalPrice: number;
  /** 总成本 */
  totalCost?: number;
  /** 原始文本 */
  rawText: string;
  /** 意图 */
  intent: string;
  /** 会话 ID */
  sessionId?: string;
}

/**
 * 交易记录
 */
export interface TransactionRecord {
  /** 交易 ID */
  id: number;
  /** 顾客 ID */
  partnerId?: number;
  /** 顾客名称 */
  partnerName?: string;
  /** 交易时间 */
  timestamp: Date;
  /** 商品列表 */
  items: TransactionItem[];
  /** 总价 */
  totalPrice: number;
  /** 总成本 */
  totalCost?: number;
  /** 毛利 */
  grossProfit?: number;
  /** 毛利率 */
  profitMargin?: number;
  /** 原始文本 */
  rawText: string;
  /** 意图 */
  intent: string;
  /** 创建时间 */
  createdAt: Date;
}

/**
 * 交易查询条件
 */
export interface TransactionQuery {
  /** 顾客 ID */
  partnerId?: number;
  /** 商品 ID */
  productId?: number;
  /** 开始时间 */
  startDate?: Date;
  /** 结束时间 */
  endDate?: Date;
  /** 意图类型 */
  intent?: string;
  /** 最小金额 */
  minAmount?: number;
  /** 最大金额 */
  maxAmount?: number;
  /** 页码 */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
}

/**
 * 交易统计
 */
export interface TransactionStats {
  /** 总交易数 */
  totalCount: number;
  /** 总销售额 */
  totalRevenue: number;
  /** 总成本 */
  totalCost: number;
  /** 总毛利 */
  totalProfit: number;
  /** 平均毛利率 */
  avgProfitMargin: number;
  /** 平均客单价 */
  avgOrderValue: number;
  /** 时间范围 */
  dateRange: {
    start: Date;
    end: Date;
  };
}

/**
 * 商品销售统计
 */
export interface ProductSalesStats {
  /** 商品名称 */
  productName: string;
  /** 商品 ID */
  productId?: number;
  /** 销售次数 */
  salesCount: number;
  /** 销售总量 */
  totalQuantity: number;
  /** 销售总额 */
  totalRevenue: number;
  /** 平均单价 */
  avgUnitPrice: number;
}

/**
 * 顾客消费统计
 */
export interface PartnerPurchaseStats {
  /** 顾客名称 */
  partnerName: string;
  /** 顾客 ID */
  partnerId: number;
  /** 购买次数 */
  purchaseCount: number;
  /** 消费总额 */
  totalSpent: number;
  /** 平均客单价 */
  avgOrderValue: number;
  /** 最后购买时间 */
  lastPurchaseDate: Date;
}
