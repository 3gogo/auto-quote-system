/**
 * 定价引擎类型定义
 */

import { PartnerEntity, ProductEntity } from './nlu';

/**
 * 定价规则作用域类型
 */
export type PricingScopeType = 
  | 'global'    // 全局规则
  | 'category'  // 分类规则
  | 'level'     // 客户等级规则
  | 'special';  // 特殊规则（客户+商品）

/**
 * 取整策略
 */
export type RoundingStrategy = 
  | 'none'           // 不取整
  | 'floor_to_1'     // 向下取整到1元
  | 'ceil_to_1'      // 向上取整到1元
  | 'round_to_1'     // 四舍五入到1元
  | 'round_to_0.5'   // 四舍五入到0.5元
  | 'floor_to_0.5';  // 向下取整到0.5元

/**
 * 定价规则
 */
export interface PricingRule {
  /** 规则 ID */
  id?: number;
  /** 作用域类型 */
  scopeType: PricingScopeType;
  /** 作用域值（如分类名、客户等级、"客户名+商品名"） */
  scopeValue: string;
  /** 定价公式（如 "cost * 1.2" 或 "3.0"） */
  formula: string;
  /** 取整策略 */
  rounding?: RoundingStrategy;
  /** 优先级（数字越大优先级越高） */
  priority: number;
  /** 是否启用 */
  enabled: boolean;
  /** 商品 ID（SPECIAL 规则） */
  productId?: number;
  /** 客户 ID（SPECIAL 规则） */
  partnerId?: number;
  /** 商品分类（CATEGORY 规则） */
  productCategory?: string;
  /** 客户等级（LEVEL 规则） */
  partnerLevel?: string;
}

/**
 * 报价商品项
 */
export interface QuoteItem {
  /** 商品名称 */
  productName: string;
  /** 数量 */
  quantity: number;
  /** 单位 */
  unit: string;
  /** 建议单价 */
  suggestedUnitPrice: number;
  /** 实际单价（用户确认后） */
  actualUnitPrice?: number;
  /** 进货成本 */
  baseCost?: number;
  /** 商品分类 */
  category?: string;
  /** 小计（建议） */
  suggestedSubtotal: number;
  /** 小计（实际） */
  actualSubtotal?: number;
  /** 商品 ID（如果匹配到数据库） */
  productId?: number;
  /** 匹配规则 */
  matchedRule?: PricingRule;
  /** 置信度 */
  confidence: number;
}

/**
 * 报价响应
 */
export interface QuoteResponse {
  /** 报价商品列表 */
  items: QuoteItem[];
  /** 建议总价 */
  totalSuggestedPrice: number;
  /** 实际总价（用户确认后） */
  totalActualPrice?: number;
  /** 取整建议 */
  roundingSuggestion?: string;
  /** 客户名称 */
  partnerName?: string;
  /** 客户等级 */
  partnerLevel?: string;
  /** 语音播报文本 */
  message: string;
  /** 报价置信度 */
  confidence: number;
  /** 是否需要确认 */
  needsConfirmation: boolean;
  /** 报价时间 */
  quotedAt: Date;
}

/**
 * 定价上下文
 */
export interface PricingContext {
  /** 客户信息 */
  partner?: PartnerEntity & {
    level?: string;
    id?: number;
  };
  /** 商品列表 */
  products: ProductEntity[];
  /** 历史交易参考 */
  historicalPrices?: Map<string, number>;
  /** 是否使用历史价格 */
  useHistoricalPrices?: boolean;
}

/**
 * 历史价格记录
 */
export interface HistoricalPrice {
  /** 商品名称 */
  productName: string;
  /** 商品 ID */
  productId?: number;
  /** 客户名称 */
  partnerName?: string;
  /** 客户 ID */
  partnerId?: number;
  /** 历史单价 */
  unitPrice: number;
  /** 交易次数 */
  transactionCount: number;
  /** 最近交易时间 */
  lastTransactionAt: Date;
}

/**
 * 定价引擎配置
 */
export interface PricingEngineConfig {
  /** 是否启用历史价格学习 */
  enableHistoricalLearning?: boolean;
  /** 历史价格权重 (0-1) */
  historicalWeight?: number;
  /** 默认利润率 */
  defaultMargin?: number;
  /** 默认取整策略 */
  defaultRounding?: RoundingStrategy;
}
