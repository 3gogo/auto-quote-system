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
    return `你是一个小店报价助手的意图识别器。请分析用户输入，返回 JSON 格式结果。

用户输入："${text}"

## 意图识别规则（重要！按优先级判断）

### 1. confirm 确认意图
单字表达优先判断为确认：
- "行" "好" "嗯" "可以" "对" "是" "OK" → confirm
- "好的" "行吧" "可以的" "成交" "就这样" → confirm

### 2. deny 否定/取消意图
- "不要了" "不买了" "算了" "取消" "重新来" "不对" → deny
- 含"不"+"要/买/行"组合 → deny
- 含"算了" → deny

### 3. price_correction 价格修正
- "按X块算" "便宜点" "抹零" "打折" "少算点" → price_correction

### 4. single_item_query 单品查价
仅当明确询问单品价格时：
- "XXX怎么卖" "XXX什么价" "XXX多少钱一个/瓶" → single_item_query
注意：有具体数量时应为 retail_quote

### 5. purchase_price_check 进货查价
含以下关键词时：
- "进价" "批发价" "老李/老王/批发商那边" "进货" → purchase_price_check

### 6. retail_quote 零售报价（默认意图）
- 提到商品+数量 → retail_quote
- "一箱矿泉水" "两瓶可乐" → retail_quote（有数量即报价）
- 口语表达如 "给我来" "给俺整" "帮我弄" → retail_quote

### 7. unknown
无法识别或闲聊问候 → unknown

## 数量单位转换
- "一打" = 12个
- "一条烟" = 10包
- "一箱" = 视商品而定
- "半斤" = 0.5斤

## 上下文理解
- "再来一瓶" → 需要上下文，返回 retail_quote + 商品信息
- "跟刚才一样" → retail_quote，商品为空需要上下文

## 返回格式（严格 JSON）
{
  "intent": { "type": "retail_quote", "confidence": 0.95 },
  "partner": { "name": "张三", "type": "customer", "confidence": 0.9 },
  "products": [
    { "name": "可乐", "quantity": 2, "unit": "瓶", "confidence": 0.95 }
  ],
  "prices": []
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

