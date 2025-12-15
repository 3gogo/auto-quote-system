/**
 * AI Provider 抽象层
 * 支持多种 AI 后端切换：阿里云通义、Deepseek、智谱等
 */

import { NLUResult, NLUEngineOptions } from '../types/nlu';

/**
 * AI Provider 接口
 */
export interface AIProvider {
  /** Provider 名称 */
  readonly name: string;
  
  /** Provider 类型 */
  readonly type: 'aliyun' | 'deepseek' | 'zhipu' | 'ollama' | 'openai';

  /**
   * 初始化 Provider
   */
  init(): Promise<void>;

  /**
   * 解析文本，返回意图和实体
   * @param text 输入文本
   * @param context 上下文信息
   */
  parse(text: string, context?: Record<string, any>): Promise<NLUResult>;

  /**
   * 检查 Provider 是否可用
   */
  isAvailable(): Promise<boolean>;

  /**
   * 获取配置信息
   */
  getConfig(): AIProviderConfig;

  /**
   * 销毁资源
   */
  destroy(): Promise<void>;
}

/**
 * AI Provider 配置
 */
export interface AIProviderConfig {
  name?: string;
  type?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * AI Provider 基类
 */
export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: string;
  abstract readonly type: 'aliyun' | 'deepseek' | 'zhipu' | 'ollama' | 'openai';

  protected config: Required<Pick<AIProviderConfig, 'timeout' | 'maxRetries'>> & AIProviderConfig;
  protected initialized: boolean = false;

  constructor(config: AIProviderConfig = {}) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      ...config
    };
  }

  abstract init(): Promise<void>;
  abstract parse(text: string, context?: Record<string, any>): Promise<NLUResult>;

  async isAvailable(): Promise<boolean> {
    return this.initialized;
  }

  getConfig(): AIProviderConfig {
    return { ...this.config };
  }

  async destroy(): Promise<void> {
    this.initialized = false;
  }

  /**
   * 构建 NLU 提示词
   */
  protected buildNLUPrompt(text: string): string {
    return `你是一个小店报价助手的意图识别器。请分析以下用户输入，返回 JSON 格式结果。

用户输入："${text}"

请识别以下内容：
1. 意图类型 (intent)：
   - retail_quote: 零售报价（如"张三两瓶可乐多少钱"）
   - purchase_price_check: 进货核价（如"老李那边可乐进价多少"）
   - single_item_query: 单品价格查询（如"可乐怎么卖"）
   - price_correction: 纠错改价（如"按11块算"）
   - confirm: 确认（如"好的"、"行"）
   - deny: 否定（如"不对"、"重新来"）
   - unknown: 无法识别

2. 顾客/供货商 (partner)：名称和类型（customer/supplier）

3. 商品列表 (products)：每个商品包含名称、数量、单位

4. 价格表达 (prices)：如果用户提到了具体价格

返回格式（严格 JSON）：
{
  "intent": { "type": "retail_quote", "confidence": 0.95 },
  "partner": { "name": "张三", "type": "customer", "confidence": 0.9 },
  "products": [
    { "name": "可乐", "quantity": 2, "unit": "瓶", "confidence": 0.95 }
  ],
  "prices": [
    { "value": 3, "unit": "元", "context": "可乐3块" }
  ]
}

只返回 JSON，不要其他解释。`;
  }

  /**
   * 解析 LLM 返回的 JSON
   */
  protected parseNLUResponse(response: string, rawText: string): NLUResult {
    try {
      // 提取 JSON 部分
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法解析 JSON 响应');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        intent: {
          intent: parsed.intent?.type || 'unknown',
          confidence: parsed.intent?.confidence || 0,
          rawText
        },
        partner: parsed.partner ? {
          name: parsed.partner.name,
          confidence: parsed.partner.confidence || 0.8
        } : undefined,
        products: (parsed.products || []).map((p: any) => ({
          name: p.name,
          quantity: p.quantity || 1,
          unit: p.unit || '个',
          confidence: p.confidence || 0.8
        })),
        prices: (parsed.prices || []).map((p: any) => ({
          value: p.value,
          unit: p.unit || '元',
          context: p.context || ''
        })),
        rawText,
        processedAt: new Date()
      };
    } catch (error) {
      console.error('解析 NLU 响应失败:', error);
      return {
        intent: {
          intent: 'unknown',
          confidence: 0,
          rawText
        },
        products: [],
        prices: [],
        rawText,
        processedAt: new Date()
      };
    }
  }
}

/**
 * AI Provider 工厂
 */
export class AIProviderFactory {
  private static providers: Map<string, AIProvider> = new Map();

  /**
   * 注册 Provider
   */
  static register(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * 获取 Provider
   */
  static get(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * 获取所有 Provider
   */
  static getAll(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * 获取第一个可用的 Provider
   */
  static async getFirstAvailable(): Promise<AIProvider | undefined> {
    for (const provider of this.providers.values()) {
      if (await provider.isAvailable()) {
        return provider;
      }
    }
    return undefined;
  }
}

