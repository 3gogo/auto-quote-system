/**
 * 文本向量嵌入服务
 * 使用阿里云 DashScope text-embedding-v3 模型
 */

/**
 * 嵌入服务配置
 */
export interface EmbeddingServiceConfig {
  /** API Key */
  apiKey?: string;
  /** 模型名称 */
  model?: string;
  /** 向量维度 */
  dimension?: number;
  /** 批量请求大小 */
  batchSize?: number;
}

/**
 * 嵌入结果
 */
export interface EmbeddingResult {
  /** 原始文本 */
  text: string;
  /** 向量嵌入 */
  embedding: number[];
  /** 向量维度 */
  dimension: number;
}

/**
 * 文本向量嵌入服务
 */
export class EmbeddingService {
  private config: Required<EmbeddingServiceConfig>;
  private baseUrl = 'https://dashscope.aliyuncs.com/api/v1';
  private initialized = false;

  constructor(config: EmbeddingServiceConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.DASHSCOPE_API_KEY || '',
      model: config.model || 'text-embedding-v3',
      dimension: config.dimension || 1024,
      batchSize: config.batchSize || 25
    };
  }

  /**
   * 初始化服务
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    if (!this.config.apiKey) {
      throw new Error('阿里云 API Key 未配置，请设置 DASHSCOPE_API_KEY 环境变量');
    }

    this.initialized = true;
    console.log(`✅ 向量嵌入服务初始化成功，模型: ${this.config.model}`);
  }

  /**
   * 获取单个文本的嵌入向量
   */
  async embed(text: string): Promise<EmbeddingResult> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  /**
   * 批量获取文本嵌入向量
   */
  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    if (!this.initialized) {
      await this.init();
    }

    const results: EmbeddingResult[] = [];
    
    // 分批处理
    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      const batch = texts.slice(i, i + this.config.batchSize);
      const batchResults = await this.embedBatchInternal(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 内部批量嵌入方法
   */
  private async embedBatchInternal(texts: string[]): Promise<EmbeddingResult[]> {
    const response = await fetch(
      `${this.baseUrl}/services/embeddings/text-embedding/text-embedding`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model,
          input: {
            texts: texts
          },
          parameters: {
            dimension: this.config.dimension,
            text_type: 'query'
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`向量嵌入 API 错误: ${errorText}`);
    }

    const result = await response.json() as {
      output?: {
        embeddings?: Array<{
          text_index: number;
          embedding: number[];
        }>;
      };
    };

    const embeddings = result.output?.embeddings || [];
    
    return texts.map((text, index) => {
      const embedding = embeddings.find(e => e.text_index === index)?.embedding || [];
      return {
        text,
        embedding,
        dimension: embedding.length
      };
    });
  }

  /**
   * 计算两个向量的余弦相似度
   */
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('向量维度不匹配');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * 查找与目标向量最相似的向量
   */
  findMostSimilar(
    targetEmbedding: number[],
    candidates: EmbeddingResult[],
    topK: number = 5,
    threshold: number = 0.7
  ): Array<{ result: EmbeddingResult; similarity: number }> {
    const scored = candidates.map(candidate => ({
      result: candidate,
      similarity: this.cosineSimilarity(targetEmbedding, candidate.embedding)
    }));

    return scored
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
}

// 导出单例
export const embeddingService = new EmbeddingService();

