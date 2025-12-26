/**
 * 对话管理类型定义
 */

import { IntentType, NLUResult, ProductEntity, PartnerEntity } from './nlu';
import { QuoteResponse } from './pricing';

/**
 * 对话状态
 */
export type ConversationState =
  | 'idle'              // 空闲
  | 'listening'         // 监听中
  | 'processing'        // 处理中
  | 'awaiting_input'    // 等待用户输入
  | 'awaiting_confirm'  // 等待确认
  | 'completed'         // 已完成
  | 'error';            // 错误

/**
 * 对话轮次
 */
export interface ConversationTurn {
  /** 轮次 ID */
  id: string;
  /** 角色 */
  role: 'user' | 'assistant';
  /** 文本内容 */
  text: string;
  /** NLU 结果（用户消息） */
  nlu?: NLUResult;
  /** 报价结果（助手消息） */
  quote?: QuoteResponse;
  /** 时间戳 */
  timestamp: Date;
}

/**
 * 会话上下文
 */
export interface SessionContext {
  /** 会话 ID */
  sessionId: string;
  /** 当前状态 */
  state: ConversationState;
  /** 当前顾客 */
  currentPartner?: PartnerEntity & {
    id?: number;
    level?: string;
  };
  /** 购物车商品 */
  cartItems: ProductEntity[];
  /** 当前报价 */
  currentQuote?: QuoteResponse;
  /** 对话历史 */
  history: ConversationTurn[];
  /** 上次意图 */
  lastIntent?: IntentType;
  /** 是否等待确认 */
  awaitingConfirmation: boolean;
  /** 等待确认的类型 */
  confirmationType?: 'quote' | 'price_correction' | 'transaction';
  /** 创建时间 */
  createdAt: Date;
  /** 最后活跃时间 */
  lastActiveAt: Date;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 对话输入
 */
export interface ConversationInput {
  /** 会话 ID */
  sessionId: string;
  /** 用户输入文本 */
  text: string;
  /** 合作伙伴 ID */
  partnerId?: string;
  /** 额外上下文 */
  context?: Record<string, any>;
}

/**
 * 对话输出
 */
export interface ConversationOutput {
  /** 会话 ID */
  sessionId: string;
  /** 助手回复文本 */
  text: string;
  /** 语音播报文本（可能与 text 不同） */
  speechText?: string;
  /** NLU 解析结果 */
  nlu?: NLUResult;
  /** 报价结果 */
  quote?: QuoteResponse;
  /** 当前状态 */
  state: ConversationState;
  /** 识别的意图 */
  intent?: IntentType;
  /** 会话上下文 */
  context?: SessionContext;
  /** 是否需要用户输入 */
  needsInput: boolean;
  /** 是否需要确认 */
  needsConfirmation: boolean;
  /** 建议的下一步操作 */
  suggestedActions?: string[];
  /** 处理耗时 */
  processingTime: number;
}

/**
 * 会话管理器配置
 */
export interface ConversationManagerConfig {
  /** 会话超时时间（毫秒） */
  sessionTimeout?: number;
  /** 最大历史记录数 */
  maxHistorySize?: number;
  /** 是否自动保存会话 */
  autoSaveSession?: boolean;
  /** 是否启用上下文记忆 */
  enableContextMemory?: boolean;
}
