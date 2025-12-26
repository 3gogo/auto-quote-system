/**
 * API 服务层
 * 封装所有后端 API 调用
 */

import type {
  ApiResponse,
  TransactionRecord,
  TransactionStats,
  ProductSalesStats,
  PartnerPurchaseStats,
  TransactionQueryParams,
  Product,
  Partner
} from '../types';

const API_BASE = '/api';

/**
 * 通用请求方法
 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || '请求失败');
  }

  return data.data;
}

/**
 * 构建查询字符串
 */
function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

// ============= 交易相关 API =============

/**
 * 获取交易列表
 */
export async function getTransactions(
  params: TransactionQueryParams = {}
): Promise<{ transactions: TransactionRecord[]; page: number; pageSize: number }> {
  return request(`/transactions${buildQueryString(params)}`);
}

/**
 * 获取单个交易详情
 */
export async function getTransactionById(id: number): Promise<TransactionRecord> {
  return request(`/transactions/${id}`);
}

/**
 * 获取交易统计
 */
export async function getTransactionStats(params: {
  startDate?: string;
  endDate?: string;
  partnerId?: number;
  intent?: string;
} = {}): Promise<TransactionStats> {
  return request(`/transactions/stats/summary${buildQueryString(params)}`);
}

/**
 * 获取商品销售统计
 */
export async function getProductSalesStats(params: {
  startDate?: string;
  endDate?: string;
} = {}): Promise<ProductSalesStats[]> {
  return request(`/transactions/stats/products${buildQueryString(params)}`);
}

/**
 * 获取顾客消费统计
 */
export async function getPartnerPurchaseStats(params: {
  startDate?: string;
  endDate?: string;
} = {}): Promise<PartnerPurchaseStats[]> {
  return request(`/transactions/stats/partners${buildQueryString(params)}`);
}

// ============= 商品相关 API =============

/**
 * 获取商品列表
 */
export async function getProducts(params: {
  keyword?: string;
  category?: string;
  isActive?: boolean;
} = {}): Promise<Product[]> {
  return request(`/products${buildQueryString(params)}`);
}

/**
 * 获取单个商品
 */
export async function getProductById(id: number): Promise<Product> {
  return request(`/products/${id}`);
}

/**
 * 创建商品
 */
export async function createProduct(data: Partial<Product>): Promise<Product> {
  return request('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 更新商品
 */
export async function updateProduct(id: number, data: Partial<Product>): Promise<Product> {
  return request(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ============= 顾客相关 API =============

/**
 * 获取顾客列表
 */
export async function getPartners(params: {
  keyword?: string;
  type?: string;
  level?: string;
  isActive?: boolean;
} = {}): Promise<Partner[]> {
  return request(`/partners${buildQueryString(params)}`);
}

/**
 * 获取单个顾客
 */
export async function getPartnerById(id: number): Promise<Partner> {
  return request(`/partners/${id}`);
}

/**
 * 创建顾客
 */
export async function createPartner(data: Partial<Partner>): Promise<Partner> {
  return request('/partners', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 更新顾客
 */
export async function updatePartner(id: number, data: Partial<Partner>): Promise<Partner> {
  return request(`/partners/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

