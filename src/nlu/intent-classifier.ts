/**
 * 意图分类器
 * 基于规则的意图识别
 */

import { IntentType, IntentResult } from '../types/nlu';

/**
 * 意图模式定义
 */
interface IntentPattern {
  intent: IntentType;
  patterns: RegExp[];
  keywords: string[];
  priority: number;
}

/**
 * 意图分类器
 */
export class IntentClassifier {
  private intentPatterns: IntentPattern[] = [];

  constructor() {
    this.initPatterns();
  }

  /**
   * 初始化意图模式
   */
  private initPatterns(): void {
    this.intentPatterns = [
      // 零售报价
      {
        intent: 'retail_quote',
        patterns: [
          /([给卖]|要|买|拿|来)\s*.+\s*(多少钱|几块|多少|怎么算|算)/,
          /[给卖]\s*.+/,
          /.+\s*(多少钱|几块钱|多少)/,
          /.+\s*(要|买|拿|来)\s*.+/,
          /[一二三四五六七八九十百千\d]+\s*(瓶|包|袋|箱|盒|个|只|条|斤)/,
        ],
        keywords: ['给', '卖', '要', '买', '拿', '来', '多少钱', '几块', '怎么算'],
        priority: 1
      },

      // 进货核价
      {
        intent: 'purchase_price_check',
        patterns: [
          /进[货价].*多少/,
          /(进货|成本|本钱|批发).*[多少几]/,
          /[从向].*进/,
          /.*(那边|那儿|那里).*[多少几]/,
          /.*进价.*/,
        ],
        keywords: ['进货', '进价', '成本', '本钱', '批发', '进'],
        priority: 2
      },

      // 单品价格查询
      {
        intent: 'single_item_query',
        patterns: [
          /.+\s*怎么卖/,
          /.+\s*卖多少/,
          /.+\s*[多少几]块[钱]?/,
          /.+\s*(什么|啥)价/,
        ],
        keywords: ['怎么卖', '卖多少', '什么价', '啥价'],
        priority: 3
      },

      // 纠错改价
      {
        intent: 'price_correction',
        patterns: [
          /按\s*\d+\s*[块元]/,
          /(算|记|改|调)\s*\d+\s*[块元]?/,
          /[贵便宜][了]?\s*\d+/,
          /(不对|错了|改一下|重新算)/,
          /\d+\s*[块元]\s*(算|吧)/,
        ],
        keywords: ['按', '算', '记', '改', '贵了', '便宜', '不对', '错了', '重新'],
        priority: 4
      },

      // 否定（优先级高于确认，避免 "不对" 被 "对" 匹配）
      {
        intent: 'deny',
        patterns: [
          /^(不|不是|不对|不行|错|重来|重新|再说一遍)$/,
          /^(不对|不是|不行|错了)$/,
          /(不是|不对|不行|错了|重来|重新|再说)[一]?[遍]?$/,
          /没有|不要|取消/,
        ],
        keywords: ['不是', '不对', '不行', '错', '重来', '重新', '再说', '没有', '不要', '取消'],
        priority: 6  // 高于确认
      },

      // 确认
      {
        intent: 'confirm',
        patterns: [
          /^(好|行|对|是|可以|OK|ok|没问题|就这样|成)$/,
          /^(好的|行的|对的|是的|可以|OK|ok|没问题|就这样|成)[吧了啊呢]?$/,
        ],
        keywords: ['好的', '行的', '对的', '是的', '可以', 'OK', '没问题', '就这样', '成'],
        priority: 5
      }
    ];
  }

  /**
   * 分类意图
   */
  classify(text: string): IntentResult {
    const normalizedText = this.normalizeText(text);
    
    let bestMatch: { intent: IntentType; confidence: number; pattern?: string } = {
      intent: 'unknown',
      confidence: 0
    };

    for (const intentPattern of this.intentPatterns) {
      const score = this.calculateScore(normalizedText, intentPattern);
      
      if (score.confidence > bestMatch.confidence) {
        bestMatch = {
          intent: intentPattern.intent,
          confidence: score.confidence,
          pattern: score.matchedPattern
        };
      }
    }

    return {
      intent: bestMatch.intent,
      confidence: bestMatch.confidence,
      rawText: text,
      matchedPattern: bestMatch.pattern
    };
  }

  /**
   * 计算意图匹配分数
   */
  private calculateScore(
    text: string,
    intentPattern: IntentPattern
  ): { confidence: number; matchedPattern?: string } {
    let maxScore = 0;
    let matchedPattern: string | undefined;

    // 模式匹配
    for (const pattern of intentPattern.patterns) {
      if (pattern.test(text)) {
        const score = 0.8 + (0.1 * intentPattern.priority / 5);
        if (score > maxScore) {
          maxScore = score;
          matchedPattern = pattern.source;
        }
      }
    }

    // 关键词匹配（如果模式未匹配到，尝试关键词）
    if (maxScore < 0.5) {
      let keywordMatchCount = 0;
      for (const keyword of intentPattern.keywords) {
        if (text.includes(keyword)) {
          keywordMatchCount++;
        }
      }
      
      if (keywordMatchCount > 0) {
        const keywordScore = 0.4 + (0.2 * keywordMatchCount / intentPattern.keywords.length);
        if (keywordScore > maxScore) {
          maxScore = keywordScore;
          matchedPattern = `keywords: ${intentPattern.keywords.slice(0, 3).join(', ')}`;
        }
      }
    }

    return { confidence: maxScore, matchedPattern };
  }

  /**
   * 文本规范化
   */
  private normalizeText(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[,，。.！!？?]/g, '');
  }

  /**
   * 批量分类
   */
  classifyBatch(texts: string[]): IntentResult[] {
    return texts.map(text => this.classify(text));
  }

  /**
   * 添加自定义模式
   */
  addPattern(intent: IntentType, pattern: RegExp, priority: number = 1): void {
    const existingPattern = this.intentPatterns.find(p => p.intent === intent);
    if (existingPattern) {
      existingPattern.patterns.push(pattern);
    } else {
      this.intentPatterns.push({
        intent,
        patterns: [pattern],
        keywords: [],
        priority
      });
    }
  }

  /**
   * 添加关键词
   */
  addKeyword(intent: IntentType, keyword: string): void {
    const existingPattern = this.intentPatterns.find(p => p.intent === intent);
    if (existingPattern && !existingPattern.keywords.includes(keyword)) {
      existingPattern.keywords.push(keyword);
    }
  }
}

// 导出单例
export const intentClassifier = new IntentClassifier();
