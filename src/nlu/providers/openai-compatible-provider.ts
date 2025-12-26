/**
 * OpenAI 兼容 API Provider
 * 支持任何遵循 OpenAI API 规范的服务：
 * - DeepSeek
 * - Gemini (通过兼容接口)
 * - Qwen
 * - GLM
 * - 本地模型 (Ollama, vLLM 等)
 */

import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import { BaseAIProvider, AIProviderConfig } from '../ai-provider';
import { NLUResult } from '../../types/nlu';

export interface OpenAICompatibleConfig extends AIProviderConfig {
  /** API 基础 URL (如 https://api.deepseek.com/v1) */
  baseUrl: string;
  /** API Key */
  apiKey: string;
  /** 模型名称 (如 deepseek-chat, gpt-4, qwen-turbo) */
  model: string;
  /** 温度参数 */
  temperature?: number;
  /** 最大输出 token */
  maxTokens?: number;
  /** 请求超时（毫秒），默认 15 秒 */
  timeout?: number;
}

/**
 * OpenAI 兼容 API Provider
 */
export class OpenAICompatibleProvider extends BaseAIProvider {
  readonly name = 'openai-compatible';
  readonly type = 'openai' as const;

  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: OpenAICompatibleConfig) {
    super(config);
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.temperature = config.temperature ?? 0.3;
    this.maxTokens = config.maxTokens ?? 1024;
    // 设置较短的超时时间，避免阻塞
    this.config.timeout = config.timeout ?? 15000;
  }

  async init(): Promise<void> {
    if (!this.apiKey) {
      throw new Error('OpenAI 兼容 API Key 未配置，请设置 OPENAI_API_KEY 环境变量');
    }

    if (!this.baseUrl) {
      throw new Error('OpenAI 兼容 API Base URL 未配置，请设置 OPENAI_API_BASE 环境变量');
    }

    if (!this.model) {
      throw new Error('模型名称未配置，请设置 OPENAI_MODEL 环境变量');
    }

    // 直接标记为已初始化，不进行阻塞测试
    // API 调用失败时会自动回退到规则层
    this.initialized = true;
    console.log(`✅ OpenAI 兼容 Provider 初始化成功: ${this.model} @ ${this.baseUrl}`);
  }

  /**
   * 测试 API 连接
   */
  private async testConnection(): Promise<boolean> {
    try {
      // 发送一个简单的请求测试连接
      await this.chatCompletion([
        { role: 'user', content: '你好' }
      ]);
      return true;
    } catch (error) {
      console.error('API 连接测试失败:', error);
      return false;
    }
  }

  /**
   * 调用 Chat Completion API
   */
  private async chatCompletion(
    messages: Array<{ role: string; content: string }>,
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<string> {
    const url = new URL(this.baseUrl + '/chat/completions');
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const requestBody = JSON.stringify({
      model: this.model,
      messages,
      temperature: options.temperature ?? this.temperature,
      max_tokens: options.maxTokens ?? this.maxTokens,
      response_format: { type: 'json_object' }
    });

    return new Promise((resolve, reject) => {
      const req = httpModule.request(
        {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Length': Buffer.byteLength(requestBody)
          },
          timeout: this.config.timeout
        },
        (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              // 调试日志：打印原始响应
              console.log('[OpenAI API] 状态码:', res.statusCode);
              console.log('[OpenAI API] 原始响应:', data.substring(0, 500));

              const response = JSON.parse(data);
              
              if (res.statusCode !== 200) {
                reject(new Error(`API 错误 (${res.statusCode}): ${response.error?.message || data}`));
                return;
              }

              // 尝试多种响应格式
              let content = response.choices?.[0]?.message?.content;
              
              // 兼容其他格式
              if (!content && response.result) {
                content = response.result;
              }
              if (!content && response.output) {
                content = response.output;
              }
              if (!content && response.data?.choices?.[0]?.message?.content) {
                content = response.data.choices[0].message.content;
              }
              if (!content && response.response) {
                content = response.response;
              }
              
              if (!content) {
                console.log('[OpenAI API] 完整响应结构:', JSON.stringify(response, null, 2).substring(0, 1000));
                reject(new Error('API 响应中没有内容'));
                return;
              }

              console.log('[OpenAI API] 解析成功，内容长度:', content.length);
              resolve(content);
            } catch (error) {
              console.error('[OpenAI API] 解析失败:', error, '原始数据:', data.substring(0, 200));
              reject(new Error(`解析响应失败: ${error}`));
            }
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时'));
      });

      req.write(requestBody);
      req.end();
    });
  }

  /**
   * 解析文本，返回意图和实体
   */
  async parse(text: string, context?: Record<string, any>): Promise<NLUResult> {
    if (!this.initialized) {
      await this.init();
    }

    const startTime = Date.now();
    const prompt = this.buildNLUPrompt(text);

    try {
      // 构建消息，包含上下文
      const messages: Array<{ role: string; content: string }> = [
        {
          role: 'system',
          content: '你是一个小店报价助手的意图识别器。请严格按照 JSON 格式返回结果。'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      // 添加上下文信息
      if (context?.previousMessages) {
        // 可以添加历史对话
      }

      const response = await this.chatCompletion(messages);
      const result = this.parseNLUResponse(response, text);

      console.log(`NLU 解析完成 (${this.model}): ${Date.now() - startTime}ms`);
      return result;

    } catch (error) {
      console.error('NLU 解析失败:', error);
      
      // 返回默认结果
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

  async isAvailable(): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }
    return true;
  }
}

/**
 * 创建 OpenAI 兼容 Provider 的工厂函数
 */
export function createOpenAICompatibleProvider(): OpenAICompatibleProvider | null {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

  if (!apiKey) {
    console.warn('OPENAI_API_KEY 未设置，OpenAI 兼容 Provider 不可用');
    return null;
  }

  return new OpenAICompatibleProvider({
    apiKey,
    baseUrl,
    model,
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '512', 10),
    // 默认 15 秒超时，避免长时间等待
    timeout: parseInt(process.env.OPENAI_TIMEOUT || '15000', 10)
  });
}

