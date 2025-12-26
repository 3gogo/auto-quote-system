/**
 * 别名聚类服务
 * 使用向量嵌入对商品/顾客名称进行聚类，合并相似别名
 */

import { embeddingService, EmbeddingResult } from './embedding-service';

/**
 * 别名聚类配置
 */
export interface AliasClusterConfig {
  /** 相似度阈值（0-1），高于此值认为是同一个实体 */
  similarityThreshold?: number;
  /** 最小聚类大小 */
  minClusterSize?: number;
  /** 是否启用缓存 */
  enableCache?: boolean;
}

/**
 * 聚类结果
 */
export interface ClusterResult {
  /** 聚类 ID */
  clusterId: string;
  /** 主名称（出现频率最高或最长的名称） */
  primaryName: string;
  /** 所有别名 */
  aliases: string[];
  /** 聚类中的成员详情 */
  members: Array<{
    name: string;
    frequency: number;
    embedding?: number[];
  }>;
  /** 聚类内平均相似度 */
  avgSimilarity: number;
}

/**
 * 候选名称（用于聚类）
 */
export interface CandidateName {
  /** 名称 */
  name: string;
  /** 出现频率 */
  frequency: number;
  /** 来源类型 */
  sourceType: 'product' | 'partner';
}

/**
 * 别名聚类服务
 */
export class AliasClusterService {
  private config: Required<AliasClusterConfig>;
  private embeddingCache: Map<string, number[]> = new Map();
  private initialized = false;

  constructor(config: AliasClusterConfig = {}) {
    this.config = {
      similarityThreshold: config.similarityThreshold || 0.75,
      minClusterSize: config.minClusterSize || 1,
      enableCache: config.enableCache ?? true
    };
  }

  /**
   * 初始化服务
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    await embeddingService.init();
    this.initialized = true;
    console.log('✅ 别名聚类服务初始化成功');
  }

  /**
   * 对候选名称进行聚类
   */
  async clusterNames(candidates: CandidateName[]): Promise<ClusterResult[]> {
    if (!this.initialized) {
      await this.init();
    }

    if (candidates.length === 0) {
      return [];
    }

    // 1. 获取所有名称的向量嵌入
    const embeddings = await this.getEmbeddings(candidates.map(c => c.name));
    
    // 2. 构建名称到嵌入的映射
    const embeddingMap = new Map<string, number[]>();
    embeddings.forEach(e => {
      embeddingMap.set(e.text, e.embedding);
      if (this.config.enableCache) {
        this.embeddingCache.set(e.text, e.embedding);
      }
    });

    // 3. 使用 DBSCAN 风格的聚类算法
    const clusters = this.dbscanCluster(candidates, embeddingMap);

    // 4. 过滤小聚类
    return clusters.filter(c => c.members.length >= this.config.minClusterSize);
  }

  /**
   * 查找与给定名称相似的现有名称
   */
  async findSimilarNames(
    name: string,
    existingNames: string[],
    topK: number = 5
  ): Promise<Array<{ name: string; similarity: number }>> {
    if (!this.initialized) {
      await this.init();
    }

    if (existingNames.length === 0) {
      return [];
    }

    // 获取目标名称的嵌入
    const targetEmbedding = await this.getEmbedding(name);
    
    // 获取所有现有名称的嵌入
    const existingEmbeddings = await this.getEmbeddings(existingNames);

    // 查找最相似的
    const similar = embeddingService.findMostSimilar(
      targetEmbedding,
      existingEmbeddings,
      topK,
      this.config.similarityThreshold
    );

    return similar.map(s => ({
      name: s.result.text,
      similarity: s.similarity
    }));
  }

  /**
   * 判断两个名称是否可能是同一实体
   */
  async isSameEntity(name1: string, name2: string): Promise<{
    isSame: boolean;
    similarity: number;
  }> {
    if (!this.initialized) {
      await this.init();
    }

    const embedding1 = await this.getEmbedding(name1);
    const embedding2 = await this.getEmbedding(name2);

    const similarity = embeddingService.cosineSimilarity(embedding1, embedding2);

    return {
      isSame: similarity >= this.config.similarityThreshold,
      similarity
    };
  }

  /**
   * 获取单个名称的嵌入向量
   */
  private async getEmbedding(name: string): Promise<number[]> {
    // 检查缓存
    if (this.config.enableCache && this.embeddingCache.has(name)) {
      return this.embeddingCache.get(name)!;
    }

    const result = await embeddingService.embed(name);
    
    if (this.config.enableCache) {
      this.embeddingCache.set(name, result.embedding);
    }

    return result.embedding;
  }

  /**
   * 批量获取嵌入向量
   */
  private async getEmbeddings(names: string[]): Promise<EmbeddingResult[]> {
    // 分离已缓存和未缓存的名称
    const cached: EmbeddingResult[] = [];
    const uncached: string[] = [];

    for (const name of names) {
      if (this.config.enableCache && this.embeddingCache.has(name)) {
        cached.push({
          text: name,
          embedding: this.embeddingCache.get(name)!,
          dimension: this.embeddingCache.get(name)!.length
        });
      } else {
        uncached.push(name);
      }
    }

    // 获取未缓存的嵌入
    if (uncached.length > 0) {
      const newEmbeddings = await embeddingService.embedBatch(uncached);
      
      // 更新缓存
      if (this.config.enableCache) {
        newEmbeddings.forEach(e => {
          this.embeddingCache.set(e.text, e.embedding);
        });
      }

      cached.push(...newEmbeddings);
    }

    return cached;
  }

  /**
   * DBSCAN 风格的聚类算法
   */
  private dbscanCluster(
    candidates: CandidateName[],
    embeddingMap: Map<string, number[]>
  ): ClusterResult[] {
    const visited = new Set<string>();
    const clusters: ClusterResult[] = [];
    let clusterCount = 0;

    for (const candidate of candidates) {
      if (visited.has(candidate.name)) continue;

      // 找到所有相似的名称
      const neighbors = this.findNeighbors(candidate, candidates, embeddingMap);
      
      if (neighbors.length === 0) {
        // 单独成簇
        visited.add(candidate.name);
        clusterCount++;
        clusters.push({
          clusterId: `cluster_${clusterCount}`,
          primaryName: candidate.name,
          aliases: [],
          members: [{
            name: candidate.name,
            frequency: candidate.frequency,
            embedding: embeddingMap.get(candidate.name)
          }],
          avgSimilarity: 1
        });
        continue;
      }

      // 创建新聚类
      clusterCount++;
      const clusterMembers: CandidateName[] = [candidate];
      visited.add(candidate.name);

      // 扩展聚类
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.name)) {
          visited.add(neighbor.name);
          clusterMembers.push(neighbor);

          // 递归查找邻居的邻居
          const neighborNeighbors = this.findNeighbors(neighbor, candidates, embeddingMap);
          for (const nn of neighborNeighbors) {
            if (!visited.has(nn.name)) {
              neighbors.push(nn);
            }
          }
        }
      }

      // 计算聚类内平均相似度
      const avgSimilarity = this.calculateClusterSimilarity(clusterMembers, embeddingMap);

      // 选择主名称（频率最高的或最长的）
      const primaryMember = clusterMembers.reduce((best, current) => 
        current.frequency > best.frequency || 
        (current.frequency === best.frequency && current.name.length > best.name.length)
          ? current 
          : best
      );

      clusters.push({
        clusterId: `cluster_${clusterCount}`,
        primaryName: primaryMember.name,
        aliases: clusterMembers
          .filter(m => m.name !== primaryMember.name)
          .map(m => m.name),
        members: clusterMembers.map(m => ({
          name: m.name,
          frequency: m.frequency,
          embedding: embeddingMap.get(m.name)
        })),
        avgSimilarity
      });
    }

    return clusters;
  }

  /**
   * 查找相似的邻居
   */
  private findNeighbors(
    target: CandidateName,
    candidates: CandidateName[],
    embeddingMap: Map<string, number[]>
  ): CandidateName[] {
    const targetEmbedding = embeddingMap.get(target.name);
    if (!targetEmbedding) return [];

    return candidates.filter(c => {
      if (c.name === target.name) return false;
      const embedding = embeddingMap.get(c.name);
      if (!embedding) return false;

      const similarity = embeddingService.cosineSimilarity(targetEmbedding, embedding);
      return similarity >= this.config.similarityThreshold;
    });
  }

  /**
   * 计算聚类内平均相似度
   */
  private calculateClusterSimilarity(
    members: CandidateName[],
    embeddingMap: Map<string, number[]>
  ): number {
    if (members.length <= 1) return 1;

    let totalSimilarity = 0;
    let pairCount = 0;

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const embedding1 = embeddingMap.get(members[i].name);
        const embedding2 = embeddingMap.get(members[j].name);
        if (embedding1 && embedding2) {
          totalSimilarity += embeddingService.cosineSimilarity(embedding1, embedding2);
          pairCount++;
        }
      }
    }

    return pairCount > 0 ? totalSimilarity / pairCount : 1;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.embeddingCache.clear();
  }
}

// 导出单例
export const aliasClusterService = new AliasClusterService();

