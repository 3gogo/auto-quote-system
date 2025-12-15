/**
 * 实体抽取器
 * 基于规则和词典的实体识别
 */

import { ProductEntity, PartnerEntity, PriceEntity } from '../types/nlu';
import { hotwordService } from '../services/hotword-service';

/**
 * 数量单位映射
 */
const UNIT_PATTERNS: Record<string, RegExp> = {
  '瓶': /([一二三四五六七八九十百千\d]+)\s*瓶/g,
  '包': /([一二三四五六七八九十百千\d]+)\s*包/g,
  '袋': /([一二三四五六七八九十百千\d]+)\s*袋/g,
  '箱': /([一二三四五六七八九十百千\d]+)\s*箱/g,
  '盒': /([一二三四五六七八九十百千\d]+)\s*盒/g,
  '个': /([一二三四五六七八九十百千\d]+)\s*个/g,
  '只': /([一二三四五六七八九十百千\d]+)\s*只/g,
  '条': /([一二三四五六七八九十百千\d]+)\s*条/g,
  '斤': /([一二三四五六七八九十百千\d\.]+)\s*斤/g,
  '块': /([一二三四五六七八九十百千\d]+)\s*块(?!钱)/g
};

/**
 * 中文数字转阿拉伯数字
 */
const CHINESE_NUM_MAP: Record<string, number> = {
  '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4,
  '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  '百': 100, '千': 1000
};

/**
 * 价格表达模式
 */
const PRICE_PATTERNS = [
  /(\d+(?:\.\d+)?)\s*[块元](?:[钱])?/g,
  /(\d+)\s*块\s*(\d+)/g,  // 5块5 = 5.5元
  /(\d+(?:\.\d+)?)\s*毛/g,
];

/**
 * 实体抽取器
 */
export class EntityExtractor {
  private productDictionary: Set<string> = new Set();
  private partnerDictionary: Set<string> = new Set();

  constructor() {}

  /**
   * 初始化词典
   */
  async init(): Promise<void> {
    // 从热词服务加载词典
    await hotwordService.init();
    const hotwords = hotwordService.getHotwordsByCategory();
    
    this.productDictionary = new Set(hotwords.products);
    this.partnerDictionary = new Set(hotwords.partners);

    console.log(`✅ 实体抽取器初始化完成: ${this.productDictionary.size} 商品, ${this.partnerDictionary.size} 顾客`);
  }

  /**
   * 刷新词典
   */
  async refreshDictionary(): Promise<void> {
    await hotwordService.refreshFromDatabase();
    const hotwords = hotwordService.getHotwordsByCategory();
    
    this.productDictionary = new Set(hotwords.products);
    this.partnerDictionary = new Set(hotwords.partners);
  }

  /**
   * 抽取所有实体
   */
  extractAll(text: string): {
    products: ProductEntity[];
    partner?: PartnerEntity;
    prices: PriceEntity[];
  } {
    return {
      products: this.extractProducts(text),
      partner: this.extractPartner(text),
      prices: this.extractPrices(text)
    };
  }

  /**
   * 抽取商品实体
   */
  extractProducts(text: string): ProductEntity[] {
    const products: ProductEntity[] = [];
    const normalizedText = text.toLowerCase();

    // 1. 先尝试词典匹配
    for (const productName of this.productDictionary) {
      if (normalizedText.includes(productName.toLowerCase())) {
        // 查找关联的数量
        const quantity = this.findQuantityNear(text, productName);
        products.push({
          name: productName,
          quantity: quantity.value,
          unit: quantity.unit,
          confidence: 0.9
        });
      }
    }

    // 2. 如果词典未匹配到，尝试规则匹配
    if (products.length === 0) {
      const ruleProducts = this.extractProductsByRule(text);
      products.push(...ruleProducts);
    }

    // 去重
    return this.deduplicateProducts(products);
  }

  /**
   * 基于规则抽取商品
   */
  private extractProductsByRule(text: string): ProductEntity[] {
    const products: ProductEntity[] = [];

    // 模式: [数量][单位][商品名] 或 [商品名][数量][单位]
    const patterns = [
      // "两瓶可乐"
      /([一二三四五六七八九十百千\d]+)\s*(瓶|包|袋|箱|盒|个|只|条|斤|块)([^\s,，。、]+)/g,
      // "可乐两瓶"
      /([^\s,，。、]+?)([一二三四五六七八九十百千\d]+)\s*(瓶|包|袋|箱|盒|个|只|条|斤|块)/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (pattern.source.startsWith('([一')) {
          // 数量在前
          const quantity = this.parseChineseNumber(match[1]);
          const unit = match[2];
          const name = match[3];
          
          if (this.isLikelyProduct(name)) {
            products.push({
              name,
              quantity,
              unit,
              confidence: 0.7
            });
          }
        } else {
          // 商品名在前
          const name = match[1];
          const quantity = this.parseChineseNumber(match[2]);
          const unit = match[3];
          
          if (this.isLikelyProduct(name)) {
            products.push({
              name,
              quantity,
              unit,
              confidence: 0.7
            });
          }
        }
      }
    }

    return products;
  }

  /**
   * 判断是否可能是商品名
   */
  private isLikelyProduct(name: string): boolean {
    // 排除常见的非商品词
    const blacklist = ['他', '她', '我', '你', '这', '那', '的', '了', '吗', '呢', '啊', '吧', 
                       '要', '买', '给', '卖', '拿', '来', '找', '跟'];
    if (blacklist.includes(name)) return false;
    
    // 名称太短或太长
    if (name.length < 1 || name.length > 20) return false;
    
    // 排除看起来像人名的词（姓+1-2个字，以常见动词结尾）
    const surnames = '张王李赵刘陈杨黄吴周徐孙马朱胡林郭何高罗郑梁谢宋唐许邓冯曹彭曾肖田董潘袁蔡蒋余于杜叶程魏苏吕丁任卢姚沈韩';
    if (surnames.includes(name[0]) && name.length <= 3) {
      // 看起来像人名（姓+名）
      if (!name.includes('水') && !name.includes('酒') && !name.includes('纸')) {
        return false;
      }
    }
    
    // 排除以 "老/小" 开头的（通常是人名）
    if (name.startsWith('老') || name.startsWith('小')) {
      if (name.length <= 3) return false;
    }
    
    return true;
  }

  /**
   * 查找商品附近的数量表达
   */
  private findQuantityNear(text: string, productName: string): { value: number; unit: string } {
    const productIndex = text.indexOf(productName);
    const searchStart = Math.max(0, productIndex - 10);
    const searchEnd = Math.min(text.length, productIndex + productName.length + 10);
    const searchText = text.substring(searchStart, searchEnd);

    for (const [unit, pattern] of Object.entries(UNIT_PATTERNS)) {
      pattern.lastIndex = 0;
      const match = pattern.exec(searchText);
      if (match) {
        return {
          value: this.parseChineseNumber(match[1]),
          unit
        };
      }
    }

    // 默认数量
    return { value: 1, unit: '个' };
  }

  /**
   * 抽取顾客/供货商实体
   */
  extractPartner(text: string): PartnerEntity | undefined {
    // 1. 词典匹配
    for (const partnerName of this.partnerDictionary) {
      if (text.includes(partnerName)) {
        return {
          name: partnerName,
          confidence: 0.95
        };
      }
    }

    // 2. 规则匹配常见称呼模式
    // 常见姓氏
    const surnames = '张王李赵刘陈杨黄吴周徐孙马朱胡林郭何高罗郑梁谢宋唐许邓冯曹彭曾肖田董潘袁蔡蒋余于杜叶程魏苏吕丁任卢姚沈韩';
    
    const patterns: Array<{ regex: RegExp; nameIndex: number }> = [
      // "给张三" "卖张三" "找张三"
      { regex: new RegExp(`(?:给|卖给?|找|跟)\\s*(老|小)?([${surnames}][^\\s,，。、要买拿给卖]{0,2})`, 'u'), nameIndex: 0 },
      // 句首 "张三要xxx" "老李买xxx"
      { regex: new RegExp(`^(老|小)?([${surnames}][^\\s,，。、要买拿给卖]{0,2})(?:要|买|拿|来)`, 'u'), nameIndex: 0 },
      // "隔壁xxx"
      { regex: /隔壁\s*([^\s,，。、要买拿给卖]+)/, nameIndex: 1 },
      // "楼上xxx"
      { regex: /楼[上下]\s*([^\s,，。、要买拿给卖]+)/, nameIndex: 1 },
    ];

    for (const { regex, nameIndex } of patterns) {
      const match = text.match(regex);
      if (match) {
        let name: string;
        if (nameIndex === 0) {
          // 处理 "老/小" + 姓名
          const prefix = match[1] || '';
          const surname = match[2] || '';
          name = prefix + surname;
        } else {
          name = match[nameIndex] || '';
        }
        
        // 验证名称有效性
        if (name && name.length >= 2 && name.length <= 6 && !this.isLikelyProduct(name)) {
          return {
            name: name.trim(),
            confidence: 0.75
          };
        }
      }
    }

    return undefined;
  }

  /**
   * 抽取价格实体
   */
  extractPrices(text: string): PriceEntity[] {
    const prices: PriceEntity[] = [];

    // 模式1: "X块" 或 "X元"
    const pattern1 = /(\d+(?:\.\d+)?)\s*[块元](?:钱)?/g;
    let match;
    while ((match = pattern1.exec(text)) !== null) {
      prices.push({
        value: parseFloat(match[1]),
        unit: '元',
        context: match[0]
      });
    }

    // 模式2: "X块Y" (如"5块5"表示5.5元)
    const pattern2 = /(\d+)\s*块\s*(\d)/g;
    while ((match = pattern2.exec(text)) !== null) {
      const value = parseInt(match[1]) + parseInt(match[2]) / 10;
      prices.push({
        value,
        unit: '元',
        context: match[0]
      });
    }

    // 模式3: "X毛" (角)
    const pattern3 = /(\d+)\s*毛/g;
    while ((match = pattern3.exec(text)) !== null) {
      prices.push({
        value: parseInt(match[1]) / 10,
        unit: '元',
        context: match[0]
      });
    }

    return prices;
  }

  /**
   * 解析中文数字
   */
  private parseChineseNumber(str: string): number {
    // 纯数字
    if (/^\d+(\.\d+)?$/.test(str)) {
      return parseFloat(str);
    }

    // 中文数字
    let result = 0;
    let temp = 0;

    for (const char of str) {
      const num = CHINESE_NUM_MAP[char];
      if (num !== undefined) {
        if (num >= 10) {
          if (temp === 0) temp = 1;
          result += temp * num;
          temp = 0;
        } else {
          temp = num;
        }
      }
    }

    return result + temp;
  }

  /**
   * 商品去重
   */
  private deduplicateProducts(products: ProductEntity[]): ProductEntity[] {
    const seen = new Map<string, ProductEntity>();
    
    for (const product of products) {
      const key = product.name.toLowerCase();
      const existing = seen.get(key);
      
      if (!existing || product.confidence > existing.confidence) {
        seen.set(key, product);
      }
    }

    return Array.from(seen.values());
  }
}

// 导出单例
export const entityExtractor = new EntityExtractor();

