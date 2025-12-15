/**
 * 定价引擎
 * 基于规则匹配和历史学习的智能定价
 */

import {
  PricingRule,
  PricingScopeType,
  RoundingStrategy,
  QuoteItem,
  QuoteResponse,
  PricingContext,
  HistoricalPrice,
  PricingEngineConfig
} from '../types/pricing';
import { ProductEntity, PartnerEntity } from '../types/nlu';
import { databaseService } from '../database';

/**
 * 定价引擎
 */
export class PricingEngine {
  private config: PricingEngineConfig;
  private rules: PricingRule[] = [];
  private historicalPrices: Map<string, HistoricalPrice> = new Map();
  private initialized: boolean = false;

  constructor(config: PricingEngineConfig = {}) {
    this.config = {
      enableHistoricalLearning: true,
      historicalWeight: 0.3, // 历史价格权重 30%
      defaultMargin: 0.2,    // 默认 20% 利润率
      defaultRounding: 'round_to_1',
      ...config
    };
  }

  /**
   * 初始化引擎
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadRulesFromDatabase();
      await this.loadHistoricalPrices();
      this.initialized = true;
      console.log('✅ 定价引擎初始化成功');
    } catch (error) {
      console.error('❌ 定价引擎初始化失败:', error);
      // 即使数据库加载失败，也可以使用默认规则
      this.initialized = true;
    }
  }

  /**
   * 从数据库加载规则
   */
  private async loadRulesFromDatabase(): Promise<void> {
    try {
      const db = databaseService.getConnection();
      if (!db) {
        console.warn('数据库未连接，使用默认规则');
        this.rules = this.getDefaultRules();
        return;
      }

      const dbRules = await db.query(`
        SELECT * FROM pricing_rules WHERE enabled = true ORDER BY priority DESC
      `);

      this.rules = dbRules.map((r: any) => ({
        id: r.id,
        scopeType: r.scopeType as PricingScopeType,
        scopeValue: r.scopeValue,
        formula: r.formula,
        rounding: r.rounding as RoundingStrategy,
        priority: r.priority,
        enabled: r.enabled,
        productId: r.productId,
        partnerId: r.partnerId,
        productCategory: r.productCategory,
        partnerLevel: r.partnerLevel
      }));

      console.log(`加载了 ${this.rules.length} 条定价规则`);
    } catch (error) {
      console.error('加载定价规则失败:', error);
      this.rules = this.getDefaultRules();
    }
  }

  /**
   * 加载历史价格数据
   */
  private async loadHistoricalPrices(): Promise<void> {
    if (!this.config.enableHistoricalLearning) return;

    try {
      const db = databaseService.getConnection();
      if (!db) return;

      // 从交易记录中统计历史价格
      const historicalData = await db.query(`
        SELECT 
          JSON_EXTRACT(t.itemsJson, '$[*].name') as productNames,
          JSON_EXTRACT(t.itemsJson, '$[*].price') as prices,
          p.name as partnerName,
          p.id as partnerId,
          COUNT(*) as txCount,
          MAX(t.timestamp) as lastTx
        FROM transactions t
        LEFT JOIN partners p ON t.partnerId = p.id
        WHERE t.timestamp > DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY t.partnerId, JSON_EXTRACT(t.itemsJson, '$[*].name')
      `);

      // 处理历史数据（简化版）
      for (const record of historicalData) {
        // 实际实现需要更复杂的 JSON 解析
        const key = `${record.productNames}_${record.partnerId || 'any'}`;
        this.historicalPrices.set(key, {
          productName: record.productNames,
          partnerId: record.partnerId,
          unitPrice: record.prices,
          transactionCount: record.txCount,
          lastTransactionAt: new Date(record.lastTx)
        });
      }

      console.log(`加载了 ${this.historicalPrices.size} 条历史价格记录`);
    } catch (error) {
      console.error('加载历史价格失败:', error);
    }
  }

  /**
   * 默认定价规则
   */
  private getDefaultRules(): PricingRule[] {
    return [
      // 全局默认规则：成本 * 1.2
      {
        scopeType: 'global',
        scopeValue: '*',
        formula: 'cost * 1.2',
        rounding: 'round_to_1',
        priority: 0,
        enabled: true
      },
      // 饮料分类：成本 * 1.15
      {
        scopeType: 'category',
        scopeValue: '饮料',
        formula: 'cost * 1.15',
        rounding: 'round_to_0.5',
        priority: 10,
        enabled: true
      },
      // 日用品分类：成本 * 1.25
      {
        scopeType: 'category',
        scopeValue: '日用品',
        formula: 'cost * 1.25',
        rounding: 'round_to_1',
        priority: 10,
        enabled: true
      },
      // 熟客等级：9.5 折
      {
        scopeType: 'level',
        scopeValue: 'regular_customer',
        formula: 'price * 0.95',
        rounding: 'floor_to_0.5',
        priority: 20,
        enabled: true
      },
      // 大客户等级：9 折
      {
        scopeType: 'level',
        scopeValue: 'big_customer',
        formula: 'price * 0.9',
        rounding: 'floor_to_1',
        priority: 20,
        enabled: true
      }
    ];
  }

  /**
   * 生成报价
   */
  async quote(context: PricingContext): Promise<QuoteResponse> {
    if (!this.initialized) {
      await this.init();
    }

    const items: QuoteItem[] = [];
    let totalSuggestedPrice = 0;

    for (const product of context.products) {
      const quoteItem = await this.quoteProduct(product, context);
      items.push(quoteItem);
      totalSuggestedPrice += quoteItem.suggestedSubtotal;
    }

    // 计算总价取整建议
    const roundingSuggestion = this.generateRoundingSuggestion(totalSuggestedPrice);

    // 生成语音播报文本
    const message = this.generateQuoteMessage(items, totalSuggestedPrice, context);

    // 计算整体置信度
    const avgConfidence = items.reduce((sum, item) => sum + item.confidence, 0) / items.length || 0;

    return {
      items,
      totalSuggestedPrice,
      roundingSuggestion,
      partnerName: context.partner?.name,
      partnerLevel: context.partner?.level,
      message,
      confidence: avgConfidence,
      needsConfirmation: avgConfidence < 0.7,
      quotedAt: new Date()
    };
  }

  /**
   * 为单个商品生成报价
   */
  private async quoteProduct(
    product: ProductEntity,
    context: PricingContext
  ): Promise<QuoteItem> {
    // 1. 查找商品信息（成本、分类）
    const productInfo = await this.findProductInfo(product.name);
    const baseCost = productInfo?.baseCost || 0;
    const category = productInfo?.category || '';

    // 2. 匹配定价规则
    const matchedRule = this.matchRule(product, context, category);

    // 3. 计算建议单价
    let suggestedUnitPrice = this.calculatePrice(baseCost, matchedRule, context);

    // 4. 历史价格学习
    if (this.config.enableHistoricalLearning) {
      const historicalPrice = this.getHistoricalPrice(product.name, context.partner?.id);
      if (historicalPrice) {
        // 加权平均：规则价格 * (1 - weight) + 历史价格 * weight
        const weight = this.config.historicalWeight!;
        suggestedUnitPrice = suggestedUnitPrice * (1 - weight) + historicalPrice * weight;
      }
    }

    // 5. 应用取整策略
    const rounding = matchedRule?.rounding || this.config.defaultRounding!;
    suggestedUnitPrice = this.applyRounding(suggestedUnitPrice, rounding);

    // 6. 计算小计
    const suggestedSubtotal = suggestedUnitPrice * product.quantity;

    return {
      productName: product.name,
      quantity: product.quantity,
      unit: product.unit,
      suggestedUnitPrice,
      baseCost,
      category,
      suggestedSubtotal,
      productId: productInfo?.id,
      matchedRule,
      confidence: product.confidence * (productInfo ? 1 : 0.7)
    };
  }

  /**
   * 查找商品信息
   */
  private async findProductInfo(
    productName: string
  ): Promise<{ id: number; baseCost: number; category: string } | null> {
    try {
      const db = databaseService.getConnection();
      if (!db) return null;

      // 精确匹配
      let result = await db.query(
        `SELECT id, baseCost, category FROM products WHERE name = ? AND isActive = true`,
        [productName]
      );

      if (result.length > 0) {
        return result[0];
      }

      // 别名匹配
      result = await db.query(
        `SELECT id, baseCost, category FROM products WHERE JSON_CONTAINS(aliases, ?) AND isActive = true`,
        [JSON.stringify(productName)]
      );

      if (result.length > 0) {
        return result[0];
      }

      // 模糊匹配（候选商品表）
      result = await db.query(
        `SELECT cp.id, cp.estimatedCost as baseCost, '' as category 
         FROM candidate_products cp 
         WHERE cp.name = ? OR JSON_CONTAINS(cp.aliasesCluster, ?)`,
        [productName, JSON.stringify(productName)]
      );

      if (result.length > 0) {
        return {
          id: -result[0].id, // 负数表示候选商品
          baseCost: result[0].baseCost || 0,
          category: ''
        };
      }

      return null;
    } catch (error) {
      console.error('查找商品信息失败:', error);
      return null;
    }
  }

  /**
   * 匹配定价规则
   */
  private matchRule(
    product: ProductEntity,
    context: PricingContext,
    category: string
  ): PricingRule | undefined {
    // 按优先级排序的规则列表
    const sortedRules = [...this.rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (!rule.enabled) continue;

      switch (rule.scopeType) {
        case 'special':
          // 特殊规则：匹配客户+商品
          if (
            rule.productId === product.productId &&
            rule.partnerId === context.partner?.id
          ) {
            return rule;
          }
          break;

        case 'level':
          // 客户等级规则
          if (rule.scopeValue === context.partner?.level) {
            return rule;
          }
          break;

        case 'category':
          // 分类规则
          if (rule.scopeValue === category) {
            return rule;
          }
          break;

        case 'global':
          // 全局规则（作为兜底）
          return rule;
      }
    }

    return undefined;
  }

  /**
   * 计算价格
   */
  private calculatePrice(
    baseCost: number,
    rule: PricingRule | undefined,
    context: PricingContext
  ): number {
    if (!rule) {
      // 默认：成本 * (1 + 默认利润率)
      return baseCost * (1 + this.config.defaultMargin!);
    }

    const formula = rule.formula.toLowerCase();
    
    // 解析公式
    // 支持：cost * 1.2, price * 0.9, 3.0, cost + 1
    try {
      if (formula.includes('cost')) {
        // 基于成本的公式
        const expression = formula.replace('cost', String(baseCost));
        return this.evalExpression(expression);
      } else if (formula.includes('price')) {
        // 基于已有价格的公式（用于折扣）
        // 先计算基础价格
        const basePrice = baseCost * (1 + this.config.defaultMargin!);
        const expression = formula.replace('price', String(basePrice));
        return this.evalExpression(expression);
      } else {
        // 固定价格
        return parseFloat(formula);
      }
    } catch (error) {
      console.error('计算价格失败:', error);
      return baseCost * (1 + this.config.defaultMargin!);
    }
  }

  /**
   * 安全地计算表达式
   */
  private evalExpression(expression: string): number {
    // 只允许数字和基本运算符
    const sanitized = expression.replace(/[^0-9.+\-*\/\s()]/g, '');
    
    // 使用 Function 构造器（比 eval 更安全）
    try {
      return new Function(`return ${sanitized}`)();
    } catch {
      return 0;
    }
  }

  /**
   * 应用取整策略
   */
  private applyRounding(price: number, strategy: RoundingStrategy): number {
    switch (strategy) {
      case 'floor_to_1':
        return Math.floor(price);
      case 'ceil_to_1':
        return Math.ceil(price);
      case 'round_to_1':
        return Math.round(price);
      case 'round_to_0.5':
        return Math.round(price * 2) / 2;
      case 'floor_to_0.5':
        return Math.floor(price * 2) / 2;
      case 'none':
      default:
        return Math.round(price * 100) / 100;
    }
  }

  /**
   * 获取历史价格
   */
  private getHistoricalPrice(productName: string, partnerId?: number): number | null {
    // 优先匹配特定客户的历史价格
    if (partnerId) {
      const key = `${productName}_${partnerId}`;
      const historical = this.historicalPrices.get(key);
      if (historical) {
        return historical.unitPrice;
      }
    }

    // 匹配通用历史价格
    const key = `${productName}_any`;
    const historical = this.historicalPrices.get(key);
    return historical?.unitPrice || null;
  }

  /**
   * 生成取整建议
   */
  private generateRoundingSuggestion(total: number): string {
    const rounded = Math.round(total);
    const diff = rounded - total;

    if (Math.abs(diff) < 0.1) {
      return '';
    }

    if (diff > 0 && diff <= 0.5) {
      return `取整到 ${rounded} 元（多收 ${diff.toFixed(1)} 元）`;
    } else if (diff < 0 && diff >= -0.5) {
      return `取整到 ${rounded} 元（少收 ${Math.abs(diff).toFixed(1)} 元）`;
    }

    return '';
  }

  /**
   * 生成语音播报文本
   */
  private generateQuoteMessage(
    items: QuoteItem[],
    total: number,
    context: PricingContext
  ): string {
    const parts: string[] = [];

    // 客户称呼
    if (context.partner?.name) {
      parts.push(`${context.partner.name}，`);
    }

    // 商品明细
    for (const item of items) {
      if (item.quantity === 1) {
        parts.push(`${item.productName}${item.suggestedUnitPrice}块`);
      } else {
        parts.push(
          `${item.quantity}${item.unit}${item.productName}${item.suggestedSubtotal}块`
        );
      }
    }

    // 总价
    if (items.length > 1) {
      parts.push(`，一共${total}块`);
    }

    return parts.join('');
  }

  /**
   * 刷新规则和历史价格
   */
  async refresh(): Promise<void> {
    await this.loadRulesFromDatabase();
    await this.loadHistoricalPrices();
  }

  /**
   * 添加规则（不持久化）
   */
  addRule(rule: PricingRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 记录交易价格（用于历史学习）
   */
  recordTransaction(
    productName: string,
    unitPrice: number,
    partnerId?: number
  ): void {
    const key = `${productName}_${partnerId || 'any'}`;
    const existing = this.historicalPrices.get(key);

    if (existing) {
      // 更新：加权平均
      const newCount = existing.transactionCount + 1;
      const newPrice =
        (existing.unitPrice * existing.transactionCount + unitPrice) / newCount;
      
      this.historicalPrices.set(key, {
        ...existing,
        unitPrice: newPrice,
        transactionCount: newCount,
        lastTransactionAt: new Date()
      });
    } else {
      this.historicalPrices.set(key, {
        productName,
        partnerId,
        unitPrice,
        transactionCount: 1,
        lastTransactionAt: new Date()
      });
    }
  }
}

// 导出单例
export const pricingEngine = new PricingEngine();

