/**
 * NLU 服务
 * 编排规则层和 AI 层，提供统一的 NLU 接口
 */

import { NLUResult, NLUEngineOptions, IntentType } from '../types/nlu';
import { intentClassifier } from './intent-classifier';
import { entityExtractor } from './entity-extractor';
import { AIProvider, AIProviderFactory } from './ai-provider';
import { AliyunProvider } from './providers/aliyun-provider';
import { createOpenAICompatibleProvider } from './providers/openai-compatible-provider';

/**
 * NLU 服务配置
 */
export interface NLUServiceConfig {
  /** 是否启用 AI 层 */
  enableAI?: boolean;
  /** AI Provider 名称 */
  aiProviderName?: string;
  /** 规则层置信度阈值（低于此值时调用 AI） */
  ruleConfidenceThreshold?: number;
  /** 是否优先使用规则层 */
  ruleFirst?: boolean;
}

/**
 * NLU 服务
 */
export class NLUService {
  private config: NLUServiceConfig;
  private initialized: boolean = false;
  private aiProvider?: AIProvider;

  constructor(config: NLUServiceConfig = {}) {
    this.config = {
      enableAI: true,
      aiProviderName: 'aliyun',
      ruleConfidenceThreshold: 0.6,
      ruleFirst: true,
      ...config
    };
  }

  /**
   * 初始化服务
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // 初始化实体抽取器
      await entityExtractor.init();

      // 初始化 AI Provider
      if (this.config.enableAI) {
        await this.initAIProvider();
      }

      this.initialized = true;
      console.log('✅ NLU 服务初始化成功');
    } catch (error) {
      console.error('❌ NLU 服务初始化失败:', error);
      // 即使 AI 初始化失败，规则层仍可用
      this.initialized = true;
    }
  }

  /**
   * 初始化 AI Provider
   * 优先级：OpenAI 兼容 > 阿里云
   */
  private async initAIProvider(): Promise<void> {
    try {
      // 1. 尝试 OpenAI 兼容 Provider（优先）
      const openaiProvider = createOpenAICompatibleProvider();
      if (openaiProvider) {
        AIProviderFactory.register(openaiProvider);
        try {
          await openaiProvider.init();
          this.aiProvider = openaiProvider;
          console.log('✅ 使用 OpenAI 兼容 Provider');
          return;
        } catch (error) {
          console.warn('OpenAI 兼容 Provider 初始化失败:', error);
        }
      }

      // 2. 尝试阿里云 Provider
      const aliyunProvider = new AliyunProvider({
        model: 'qwen-flash',
        useIntentModel: true
      });

      AIProviderFactory.register(aliyunProvider);

      try {
        await aliyunProvider.init();
        this.aiProvider = aliyunProvider;
        console.log('✅ 使用阿里云 Provider');
      } catch (error) {
        console.warn('阿里云 Provider 初始化失败:', error);
      }

    } catch (error) {
      console.warn('AI Provider 初始化失败，将仅使用规则层:', error);
      this.aiProvider = undefined;
    }
  }

  /**
   * 解析文本
   */
  async parse(text: string, context?: Record<string, any>): Promise<NLUResult> {
    if (!this.initialized) {
      await this.init();
    }

    const startTime = Date.now();

    // 1. 规则层解析
    const ruleResult = this.parseByRule(text);
    
    // 2. 判断是否需要 AI 增强
    const needAI = this.shouldUseAI(ruleResult);

    if (needAI && this.aiProvider) {
      try {
        // 3. AI 层解析
        const aiResult = await this.aiProvider.parse(text, context);
        
        // 4. 合并结果
        const mergedResult = this.mergeResults(ruleResult, aiResult);
        
        console.log(`NLU 解析完成 (规则+AI): ${Date.now() - startTime}ms`);
        return mergedResult;
      } catch (error) {
        console.warn('AI 解析失败，使用规则层结果:', error);
      }
    }

    console.log(`NLU 解析完成 (仅规则): ${Date.now() - startTime}ms`);
    return ruleResult;
  }

  /**
   * 规则层解析
   */
  private parseByRule(text: string): NLUResult {
    // 意图识别
    const intentResult = intentClassifier.classify(text);

    // 实体抽取
    const entities = entityExtractor.extractAll(text);

    return {
      intent: intentResult,
      partner: entities.partner,
      products: entities.products,
      prices: entities.prices,
      rawText: text,
      processedAt: new Date()
    };
  }

  /**
   * 判断是否需要使用 AI
   */
  private shouldUseAI(ruleResult: NLUResult): boolean {
    if (!this.config.enableAI) return false;
    if (!this.aiProvider) return false;

    // 1. 意图置信度低
    if (ruleResult.intent.confidence < this.config.ruleConfidenceThreshold!) {
      return true;
    }

    // 2. 意图为 unknown
    if (ruleResult.intent.intent === 'unknown') {
      return true;
    }

    // 3. 没有识别到商品，但文本较长
    if (ruleResult.products.length === 0 && ruleResult.rawText.length > 10) {
      return true;
    }

    return false;
  }

  /**
   * 合并规则层和 AI 层结果
   */
  private mergeResults(ruleResult: NLUResult, aiResult: NLUResult): NLUResult {
    // 意图：选择置信度更高的
    const intent = ruleResult.intent.confidence >= aiResult.intent.confidence
      ? ruleResult.intent
      : aiResult.intent;

    // 顾客：优先 AI 结果，因为规则层可能识别不全
    const partner = aiResult.partner || ruleResult.partner;

    // 商品：合并去重
    const productsMap = new Map<string, any>();
    for (const product of [...ruleResult.products, ...aiResult.products]) {
      const key = product.name.toLowerCase();
      const existing = productsMap.get(key);
      if (!existing || product.confidence > existing.confidence) {
        productsMap.set(key, product);
      }
    }

    // 价格：合并去重
    const pricesSet = new Set<number>();
    const prices = [...ruleResult.prices, ...aiResult.prices].filter(p => {
      if (pricesSet.has(p.value)) return false;
      pricesSet.add(p.value);
      return true;
    });

    return {
      intent,
      partner,
      products: Array.from(productsMap.values()),
      prices,
      rawText: ruleResult.rawText,
      processedAt: new Date()
    };
  }

  /**
   * 判断是否需要追问
   */
  needsClarification(result: NLUResult): boolean {
    // 1. 意图不明确
    if (result.intent.intent === 'unknown' || result.intent.confidence < 0.4) {
      return true;
    }

    // 2. 零售报价但没有商品
    if (result.intent.intent === 'retail_quote' && result.products.length === 0) {
      return true;
    }

    return false;
  }

  /**
   * 获取追问提示语
   */
  getClarificationPrompt(result: NLUResult): string {
    if (result.intent.intent === 'unknown') {
      return '抱歉，我没太听懂。你是想问商品价格，还是要结账报价？';
    }

    if (result.intent.intent === 'retail_quote' && result.products.length === 0) {
      return '你想要什么商品？可以说具体的商品名和数量。';
    }

    if (!result.partner && ['retail_quote', 'purchase_price_check'].includes(result.intent.intent)) {
      return '请问是哪位顾客？';
    }

    return '请再说一遍，我没太听清。';
  }

  /**
   * 切换 AI Provider
   */
  async switchAIProvider(providerName: string): Promise<void> {
    const provider = AIProviderFactory.get(providerName);
    if (provider) {
      if (!await provider.isAvailable()) {
        await provider.init();
      }
      this.aiProvider = provider;
      this.config.aiProviderName = providerName;
      console.log(`已切换到 AI Provider: ${providerName}`);
    } else {
      throw new Error(`未找到 AI Provider: ${providerName}`);
    }
  }

  /**
   * 禁用 AI 层
   */
  disableAI(): void {
    this.config.enableAI = false;
  }

  /**
   * 启用 AI 层
   */
  enableAI(): void {
    this.config.enableAI = true;
  }

  /**
   * 获取当前配置
   */
  getConfig(): NLUServiceConfig {
    return { ...this.config };
  }
}

// 导出单例
export const nluService = new NLUService();

