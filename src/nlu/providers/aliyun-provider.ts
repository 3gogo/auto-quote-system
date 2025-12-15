/**
 * 阿里云通义千问 AI Provider
 * 支持 tongyi-intent-detect-v3 和 qwen-flash 等模型
 */

import { BaseAIProvider, AIProviderConfig } from '../ai-provider';
import { NLUResult } from '../../types/nlu';

/**
 * 阿里云 Provider 配置
 */
export interface AliyunProviderConfig extends AIProviderConfig {
  /** API Key（从环境变量 DASHSCOPE_API_KEY 获取） */
  apiKey?: string;
  /** 模型名称 */
  model?: string;
  /** 是否使用意图理解专用模型 */
  useIntentModel?: boolean;
}

/**
 * 阿里云通义千问 Provider
 */
export class AliyunProvider extends BaseAIProvider {
  readonly name = 'aliyun';
  readonly type = 'aliyun' as const;

  private apiKey: string;
  private model: string;
  private useIntentModel: boolean;
  private baseUrl = 'https://dashscope.aliyuncs.com/api/v1';

  constructor(config: AliyunProviderConfig = {}) {
    super({
      name: 'aliyun',
      type: 'aliyun',
      ...config
    });

    this.apiKey = config.apiKey || process.env.DASHSCOPE_API_KEY || '';
    this.model = config.model || 'qwen-flash';
    this.useIntentModel = config.useIntentModel ?? true;
  }

  async init(): Promise<void> {
    if (!this.apiKey) {
      throw new Error('阿里云 API Key 未配置，请设置 DASHSCOPE_API_KEY 环境变量');
    }

    // 验证 API Key
    try {
      const available = await this.isAvailable();
      if (available) {
        this.initialized = true;
        console.log(`✅ 阿里云 Provider 初始化成功，模型: ${this.model}`);
      }
    } catch (error) {
      console.error('❌ 阿里云 Provider 初始化失败:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    // 这里可以添加健康检查逻辑
    return true;
  }

  async parse(text: string, context?: Record<string, any>): Promise<NLUResult> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      if (this.useIntentModel) {
        // 使用意图理解专用模型
        return await this.parseWithIntentModel(text, context);
      } else {
        // 使用通用大模型
        return await this.parseWithLLM(text, context);
      }
    } catch (error) {
      console.error('阿里云 NLU 解析失败:', error);
      return {
        intent: {
          intent: 'unknown',
          confidence: 0,
          rawText: text
        },
        products: [],
        prices: [],
        rawText: text,
        processedAt: new Date()
      };
    }
  }

  /**
   * 使用意图理解专用模型
   */
  private async parseWithIntentModel(text: string, context?: Record<string, any>): Promise<NLUResult> {
    // tongyi-intent-detect-v3 API 调用
    const response = await fetch(`${this.baseUrl}/services/aigc/text-generation/generation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'disable'
      },
      body: JSON.stringify({
        model: 'tongyi-intent-detect-v3',
        input: {
          prompt: text,
          // 定义意图和槽位
          intents: [
            { name: 'retail_quote', description: '零售报价' },
            { name: 'purchase_price_check', description: '进货核价' },
            { name: 'single_item_query', description: '单品查询' },
            { name: 'price_correction', description: '纠错改价' },
            { name: 'confirm', description: '确认' },
            { name: 'deny', description: '否定' }
          ],
          slots: [
            { name: 'partner', description: '顾客或供货商名称' },
            { name: 'product', description: '商品名称' },
            { name: 'quantity', description: '数量' },
            { name: 'unit', description: '单位' },
            { name: 'price', description: '价格' }
          ]
        },
        parameters: {
          result_format: 'message'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('意图理解 API 错误:', errorText);
      // 降级到通用大模型
      return this.parseWithLLM(text, context);
    }

    const result = await response.json();
    return this.parseIntentModelResponse(result, text);
  }

  /**
   * 使用通用大模型
   */
  private async parseWithLLM(text: string, context?: Record<string, any>): Promise<NLUResult> {
    const prompt = this.buildNLUPrompt(text);

    const response = await fetch(`${this.baseUrl}/services/aigc/text-generation/generation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'disable'
      },
      body: JSON.stringify({
        model: this.model,
        input: {
          messages: [
            { role: 'system', content: '你是一个小店报价助手的意图识别器，请严格按 JSON 格式返回结果。' },
            { role: 'user', content: prompt }
          ]
        },
        parameters: {
          result_format: 'message',
          temperature: 0.1,
          max_tokens: 1000
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`阿里云 API 错误: ${errorText}`);
    }

    const result = await response.json() as { output?: { choices?: Array<{ message?: { content?: string } }> } };
    const content = result.output?.choices?.[0]?.message?.content || '';
    
    return this.parseNLUResponse(content, text);
  }

  /**
   * 解析意图理解模型的响应
   */
  private parseIntentModelResponse(result: any, rawText: string): NLUResult {
    try {
      const output = result.output || {};
      const intent = output.intent || 'unknown';
      const confidence = output.confidence || 0;
      const slots = output.slots || {};

      // 解析槽位
      const products: any[] = [];
      if (slots.product) {
        const productNames = Array.isArray(slots.product) ? slots.product : [slots.product];
        const quantities = Array.isArray(slots.quantity) ? slots.quantity : [slots.quantity || 1];
        const units = Array.isArray(slots.unit) ? slots.unit : [slots.unit || '个'];

        for (let i = 0; i < productNames.length; i++) {
          products.push({
            name: productNames[i],
            quantity: parseInt(quantities[i] || 1),
            unit: units[i] || '个',
            confidence: 0.8
          });
        }
      }

      const prices: any[] = [];
      if (slots.price) {
        const priceValues = Array.isArray(slots.price) ? slots.price : [slots.price];
        for (const value of priceValues) {
          prices.push({
            value: parseFloat(value),
            unit: '元',
            context: ''
          });
        }
      }

      return {
        intent: {
          intent: intent,
          confidence: confidence,
          rawText
        },
        partner: slots.partner ? {
          name: slots.partner,
          confidence: 0.8
        } : undefined,
        products,
        prices,
        rawText,
        processedAt: new Date()
      };
    } catch (error) {
      console.error('解析意图理解响应失败:', error);
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

