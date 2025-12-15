/**
 * 定价服务
 * 整合 NLU 和定价引擎，提供完整的报价流程
 */

import { pricingEngine, PricingEngine } from './pricing-engine';
import { nluService } from '../nlu/nlu-service';
import { QuoteResponse, PricingContext } from '../types/pricing';
import { NLUResult } from '../types/nlu';
import { databaseService } from '../database';

/**
 * 定价服务配置
 */
export interface PricingServiceConfig {
  /** 是否自动保存交易 */
  autoSaveTransaction?: boolean;
  /** 是否启用价格学习 */
  enablePriceLearning?: boolean;
}

/**
 * 完整报价请求
 */
export interface QuoteRequest {
  /** 语音识别文本 */
  text: string;
  /** 会话 ID */
  sessionId?: string;
  /** 上下文 */
  context?: Record<string, any>;
}

/**
 * 完整报价结果
 */
export interface QuoteResult {
  /** NLU 解析结果 */
  nlu: NLUResult;
  /** 报价结果 */
  quote?: QuoteResponse;
  /** 是否需要追问 */
  needsClarification: boolean;
  /** 追问提示 */
  clarificationPrompt?: string;
  /** 语音播报文本 */
  speechText: string;
  /** 处理耗时 */
  processingTime: number;
}

/**
 * 定价服务
 */
export class PricingService {
  private config: PricingServiceConfig;
  private initialized: boolean = false;

  constructor(config: PricingServiceConfig = {}) {
    this.config = {
      autoSaveTransaction: true,
      enablePriceLearning: true,
      ...config
    };
  }

  /**
   * 初始化服务
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await nluService.init();
      await pricingEngine.init();
      this.initialized = true;
      console.log('✅ 定价服务初始化成功');
    } catch (error) {
      console.error('❌ 定价服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 处理报价请求
   */
  async processQuote(request: QuoteRequest): Promise<QuoteResult> {
    if (!this.initialized) {
      await this.init();
    }

    const startTime = Date.now();

    // 1. NLU 解析
    const nlu = await nluService.parse(request.text, request.context);

    // 2. 判断是否需要追问
    if (nluService.needsClarification(nlu)) {
      return {
        nlu,
        needsClarification: true,
        clarificationPrompt: nluService.getClarificationPrompt(nlu),
        speechText: nluService.getClarificationPrompt(nlu),
        processingTime: Date.now() - startTime
      };
    }

    // 3. 根据意图处理
    let quote: QuoteResponse | undefined;
    let speechText = '';

    switch (nlu.intent.intent) {
      case 'retail_quote':
        // 零售报价
        quote = await this.handleRetailQuote(nlu);
        speechText = quote.message;
        break;

      case 'single_item_query':
        // 单品查询
        quote = await this.handleSingleItemQuery(nlu);
        speechText = quote.message;
        break;

      case 'purchase_price_check':
        // 进货核价
        speechText = await this.handlePurchasePriceCheck(nlu);
        break;

      case 'price_correction':
        // 纠错改价（需要上下文）
        speechText = '好的，按你说的价格算。';
        break;

      case 'confirm':
        speechText = '好嘞，成交！';
        break;

      case 'deny':
        speechText = '好的，重新说一遍吧。';
        break;

      default:
        speechText = '抱歉，我没太听懂。你是想问商品价格，还是要结账报价？';
    }

    return {
      nlu,
      quote,
      needsClarification: false,
      speechText,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * 处理零售报价
   */
  private async handleRetailQuote(nlu: NLUResult): Promise<QuoteResponse> {
    // 查找客户信息
    const partner = nlu.partner
      ? await this.findPartner(nlu.partner.name)
      : undefined;

    // 构建定价上下文
    const context: PricingContext = {
      partner: partner
        ? { ...nlu.partner!, ...partner }
        : nlu.partner,
      products: nlu.products
    };

    // 生成报价
    return pricingEngine.quote(context);
  }

  /**
   * 处理单品查询
   */
  private async handleSingleItemQuery(nlu: NLUResult): Promise<QuoteResponse> {
    if (nlu.products.length === 0) {
      return {
        items: [],
        totalSuggestedPrice: 0,
        message: '你想问哪个商品的价格？',
        confidence: 0,
        needsConfirmation: true,
        quotedAt: new Date()
      };
    }

    // 查询单品价格
    const context: PricingContext = {
      products: nlu.products.map(p => ({ ...p, quantity: 1 }))
    };

    const quote = await pricingEngine.quote(context);

    // 修改消息格式
    if (quote.items.length === 1) {
      const item = quote.items[0];
      quote.message = `${item.productName}，${item.suggestedUnitPrice}块一${item.unit}`;
    }

    return quote;
  }

  /**
   * 处理进货核价
   */
  private async handlePurchasePriceCheck(nlu: NLUResult): Promise<string> {
    if (nlu.products.length === 0) {
      return '你想查哪个商品的进价？';
    }

    const product = nlu.products[0];
    const productInfo = await this.findProduct(product.name);

    if (productInfo?.baseCost) {
      return `${product.name}进价${productInfo.baseCost}块`;
    }

    return `抱歉，没找到${product.name}的进价信息`;
  }

  /**
   * 查找客户信息
   */
  private async findPartner(
    name: string
  ): Promise<{ id: number; level: string } | undefined> {
    try {
      const db = databaseService.getConnection();
      if (!db) return undefined;

      const result = await db.query(
        `SELECT id, level FROM partners WHERE name = ?`,
        [name]
      );

      if (result.length > 0) {
        return {
          id: result[0].id,
          level: result[0].level || 'normal'
        };
      }

      return undefined;
    } catch (error) {
      console.error('查找客户失败:', error);
      return undefined;
    }
  }

  /**
   * 查找商品信息
   */
  private async findProduct(
    name: string
  ): Promise<{ id: number; baseCost: number } | undefined> {
    try {
      const db = databaseService.getConnection();
      if (!db) return undefined;

      const result = await db.query(
        `SELECT id, baseCost FROM products WHERE name = ? AND isActive = true`,
        [name]
      );

      if (result.length > 0) {
        return {
          id: result[0].id,
          baseCost: result[0].baseCost
        };
      }

      return undefined;
    } catch (error) {
      console.error('查找商品失败:', error);
      return undefined;
    }
  }

  /**
   * 确认交易并保存
   */
  async confirmTransaction(
    quote: QuoteResponse,
    actualPrices?: Map<string, number>
  ): Promise<number | null> {
    try {
      const db = databaseService.getConnection();
      if (!db) return null;

      // 更新实际价格
      const items = quote.items.map(item => ({
        name: item.productName,
        quantity: item.quantity,
        unit: item.unit,
        price: actualPrices?.get(item.productName) || item.suggestedUnitPrice,
        cost: item.baseCost
      }));

      const totalPrice = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const totalCost = items.reduce(
        (sum, item) => sum + (item.cost || 0) * item.quantity,
        0
      );

      // 插入交易记录
      const result = await db.query(
        `INSERT INTO transactions 
         (partnerId, timestamp, itemsJson, totalPrice, totalCost, intent)
         VALUES (?, NOW(), ?, ?, ?, 'retail_quote')`,
        [
          null, // TODO: 从 quote 获取 partnerId
          JSON.stringify(items),
          totalPrice,
          totalCost
        ]
      );

      // 记录价格用于学习
      if (this.config.enablePriceLearning) {
        for (const item of items) {
          pricingEngine.recordTransaction(item.name, item.price);
        }
      }

      return result.insertId;
    } catch (error) {
      console.error('保存交易失败:', error);
      return null;
    }
  }
}

// 导出单例
export const pricingService = new PricingService();

