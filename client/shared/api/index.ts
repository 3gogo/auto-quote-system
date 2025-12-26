/**
 * 共享 API 服务
 * 跨平台的 API 调用封装
 */

import type {
  ApiResponse,
  VoiceProcessRequest,
  VoiceProcessResponse,
  ChatRequest,
  ChatResponse,
  Transaction,
  TransactionListResponse,
  TransactionStats,
  Quote
} from '../types';

// 配置
let apiBaseUrl = 'http://localhost:3001/api';

/**
 * 设置 API 基础 URL
 */
export function setApiBaseUrl(url: string): void {
  apiBaseUrl = url.replace(/\/$/, '');  // 移除尾部斜杠
}

/**
 * 获取 API 基础 URL
 */
export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

/**
 * HTTP 请求封装
 * 需要被平台适配器实现
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RequestOptions {
  url: string;
  method: HttpMethod;
  data?: any;
  headers?: Record<string, string>;
}

// 默认使用 fetch，可被平台适配器覆盖
let httpRequest: (options: RequestOptions) => Promise<ApiResponse> = async (options) => {
  const response = await fetch(apiBaseUrl + options.url, {
    method: options.method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.data ? JSON.stringify(options.data) : undefined
  });
  return response.json();
};

/**
 * 设置 HTTP 请求实现
 */
export function setHttpRequest(fn: typeof httpRequest): void {
  httpRequest = fn;
}

/**
 * 发起请求
 */
async function request<T>(options: RequestOptions): Promise<T> {
  const response = await httpRequest(options);
  if (!response.success) {
    throw new Error(response.error?.message || '请求失败');
  }
  return response.data as T;
}

// ========== 语音处理 API ==========

/**
 * 处理语音并获取报价
 */
export async function processVoice(data: VoiceProcessRequest): Promise<VoiceProcessResponse> {
  return request<VoiceProcessResponse>({
    url: '/voice/process',
    method: 'POST',
    data
  });
}

// ========== 对话 API ==========

/**
 * 发送文本消息
 */
export async function sendMessage(data: ChatRequest): Promise<ChatResponse> {
  return request<ChatResponse>({
    url: '/conversation/chat',
    method: 'POST',
    data
  });
}

/**
 * 清除会话
 */
export async function clearSession(sessionId: string): Promise<void> {
  return request<void>({
    url: `/conversation/session/${sessionId}`,
    method: 'DELETE'
  });
}

// ========== 交易 API ==========

/**
 * 确认交易
 */
export async function confirmTransaction(quote: Quote, sessionId: string): Promise<Transaction> {
  return request<Transaction>({
    url: '/transaction',
    method: 'POST',
    data: {
      ...quote,
      sessionId
    }
  });
}

/**
 * 获取交易列表
 */
export async function getTransactionList(params: {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  partnerId?: string;
}): Promise<TransactionListResponse> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
  if (params.startDate) queryParams.set('startDate', params.startDate);
  if (params.endDate) queryParams.set('endDate', params.endDate);
  if (params.partnerId) queryParams.set('partnerId', params.partnerId);

  const query = queryParams.toString();
  return request<TransactionListResponse>({
    url: `/transaction${query ? '?' + query : ''}`,
    method: 'GET'
  });
}

/**
 * 获取交易详情
 */
export async function getTransactionDetail(id: number): Promise<Transaction> {
  return request<Transaction>({
    url: `/transaction/${id}`,
    method: 'GET'
  });
}

/**
 * 获取今日统计
 */
export async function getTodayStats(): Promise<TransactionStats> {
  const today = new Date().toISOString().split('T')[0];
  return request<TransactionStats>({
    url: `/transaction/stats/summary?startDate=${today}&endDate=${today}`,
    method: 'GET'
  });
}

// ========== 健康检查 ==========

/**
 * 测试服务器连接
 */
export async function testConnection(): Promise<boolean> {
  try {
    const response = await fetch(apiBaseUrl + '/health');
    return response.ok;
  } catch {
    return false;
  }
}

