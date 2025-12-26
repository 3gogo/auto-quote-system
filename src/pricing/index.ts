/**
 * Pricing 模块导出
 */

// 核心服务
export { pricingService, PricingService, PricingServiceConfig, QuoteRequest, QuoteResult } from './pricing-service';
export { pricingEngine, PricingEngine } from './pricing-engine';

// 阶段 3 智能优化服务
export { 
  historyLearningService, 
  HistoryLearningService,
  type HistoryLearningConfig,
  type PriceDistribution 
} from './history-learning-service';

export { 
  profitAnalysisService, 
  ProfitAnalysisService,
  type ProfitAnalysisConfig,
  type ProfitAnalysisReport,
  type ProductProfitAnalysis,
  type PartnerProfitContribution,
  type BargainProductAnalysis 
} from './profit-analysis-service';

export { 
  ruleRecommendationService, 
  RuleRecommendationService,
  type RuleRecommendationConfig,
  type RuleRecommendation,
  type RecommendationType 
} from './rule-recommendation-service';

// 类型
export * from '../types/pricing';

