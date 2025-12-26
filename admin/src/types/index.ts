/**
 * 前端类型定义
 */

/**
 * 交易商品项
 */
export interface TransactionItem {
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
  cost?: number;
  productId?: number;
}

/**
 * 交易记录
 */
export interface TransactionRecord {
  id: number;
  partnerId?: number;
  partnerName?: string;
  timestamp: string;
  items: TransactionItem[];
  totalPrice: number;
  totalCost?: number;
  grossProfit?: number;
  profitMargin?: number;
  rawText: string;
  intent: string;
  createdAt: string;
}

/**
 * 交易统计
 */
export interface TransactionStats {
  totalCount: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  avgProfitMargin: number;
  avgOrderValue: number;
  dateRange: {
    start: string;
    end: string;
  };
}

/**
 * 商品销售统计
 */
export interface ProductSalesStats {
  productName: string;
  productId?: number;
  salesCount: number;
  totalQuantity: number;
  totalRevenue: number;
  avgUnitPrice: number;
}

/**
 * 顾客消费统计
 */
export interface PartnerPurchaseStats {
  partnerName: string;
  partnerId: number;
  purchaseCount: number;
  totalSpent: number;
  avgOrderValue: number;
  lastPurchaseDate: string;
}

/**
 * 商品
 */
export interface Product {
  id: number;
  name: string;
  category?: string;
  aliases: string[];
  unit: string;
  baseCost?: number;
  defaultPrice?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 顾客/供货商
 */
export interface Partner {
  id: number;
  name: string;
  aliases: string[];
  type: 'customer' | 'supplier' | 'both';
  level: 'normal' | 'vip' | 'wholesale' | 'special';
  phone?: string;
  note?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * API 响应结构
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * 交易查询参数
 */
export interface TransactionQueryParams extends PaginationParams {
  partnerId?: number;
  productId?: number;
  intent?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

