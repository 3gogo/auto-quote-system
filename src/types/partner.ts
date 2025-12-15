/**
 * 顾客/供货商类型
 */
export type PartnerType = 'customer' | 'supplier';

/**
 * 顾客等级
 */
export type PartnerLevel = 'normal' | 'regular' | 'small_business' | 'big_customer';

/**
 * 顾客等级中文映射
 */
export const PartnerLevelLabels: Record<PartnerLevel, string> = {
  normal: '普通顾客',
  regular: '熟客',
  small_business: '小商户',
  big_customer: '大客户'
};

/**
 * 顾客等级加价系数（默认值）
 */
export const PartnerLevelMarkup: Record<PartnerLevel, number> = {
  normal: 1.4,      // 普通顾客：成本 × 1.4
  regular: 1.25,    // 熟客：成本 × 1.25
  small_business: 1.15, // 小商户：成本 × 1.15
  big_customer: 1.1     // 大客户：成本 × 1.1
};

