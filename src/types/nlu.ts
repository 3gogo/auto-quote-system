/**
 * NLU 类型定义
 */

/**
 * 意图类型
 */
export type IntentType =
  | 'retail_quote'         // 零售报价
  | 'purchase_price_check' // 进货核价
  | 'single_item_query'    // 单品查询
  | 'price_correction'     // 纠错改价
  | 'confirm'              // 确认
  | 'deny'                 // 否定
  | 'unknown';             // 未知

/**
 * 意图识别结果
 */
export interface IntentResult {
  /** 意图类型 */
  intent: IntentType;
  /** 置信度 (0-1) */
  confidence: number;
  /** 原始文本 */
  rawText: string;
  /** 匹配的模式（用于调试） */
  matchedPattern?: string;
}

/**
 * 商品实体
 */
export interface ProductEntity {
  /** 商品名称 */
  name: string;
  /** 数量 */
  quantity: number;
  /** 单位 */
  unit: string;
  /** 置信度 */
  confidence: number;
  /** 商品 ID（如果匹配到数据库） */
  productId?: number;
  /** 别名匹配 */
  matchedAlias?: string;
}

/**
 * 顾客/供货商实体
 */
export interface PartnerEntity {
  /** 名称 */
  name: string;
  /** 类型 */
  type?: 'customer' | 'supplier';
  /** 置信度 */
  confidence: number;
  /** Partner ID（如果匹配到数据库） */
  partnerId?: number;
}

/**
 * 价格实体
 */
export interface PriceEntity {
  /** 价格值 */
  value: number;
  /** 单位（元/角/分） */
  unit: string;
  /** 上下文 */
  context: string;
}

/**
 * NLU 完整结果
 */
export interface NLUResult {
  /** 意图识别结果 */
  intent: IntentResult;
  /** 顾客/供货商 */
  partner?: PartnerEntity;
  /** 商品列表 */
  products: ProductEntity[];
  /** 价格列表 */
  prices: PriceEntity[];
  /** 原始文本 */
  rawText: string;
  /** 处理时间 */
  processedAt: Date;
  /** 是否需要确认 */
  needsConfirmation?: boolean;
  /** 追问提示 */
  clarificationPrompt?: string;
}

/**
 * NLU 引擎选项
 */
export interface NLUEngineOptions {
  /** 语言 */
  language?: string;
  /** 是否启用 AI 增强 */
  enableAI?: boolean;
  /** AI Provider 名称 */
  aiProvider?: string;
  /** 规则层置信度阈值 */
  ruleConfidenceThreshold?: number;
}

/**
 * 对话上下文
 */
export interface DialogContext {
  /** 会话 ID */
  sessionId: string;
  /** 当前顾客 */
  currentPartner?: PartnerEntity;
  /** 购物车商品 */
  cartItems: ProductEntity[];
  /** 历史消息 */
  history: Array<{
    role: 'user' | 'assistant';
    text: string;
    timestamp: Date;
  }>;
  /** 上次意图 */
  lastIntent?: IntentType;
  /** 是否等待确认 */
  awaitingConfirmation?: boolean;
}
