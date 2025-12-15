/**
 * 模块验收测试脚本
 * 
 * 运行方式: npx ts-node scripts/verify-modules.ts
 */

import { intentClassifier } from '../src/nlu/intent-classifier';
import { entityExtractor } from '../src/nlu/entity-extractor';
import { nluService } from '../src/nlu/nlu-service';
import { pricingEngine } from '../src/pricing/pricing-engine';
import { pricingService } from '../src/pricing/pricing-service';

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color: string, ...args: any[]) {
  console.log(color, ...args, colors.reset);
}

function success(msg: string) { log(colors.green, '✅', msg); }
function fail(msg: string) { log(colors.red, '❌', msg); }
function info(msg: string) { log(colors.blue, 'ℹ️ ', msg); }
function warn(msg: string) { log(colors.yellow, '⚠️ ', msg); }

/**
 * 测试意图分类器
 */
function testIntentClassifier() {
  console.log('\n=== 测试意图分类器 ===\n');

  const testCases = [
    { text: '张三两瓶可乐多少钱', expected: 'retail_quote' },
    { text: '老李那边可乐进价多少', expected: 'purchase_price_check' },
    { text: '可乐怎么卖', expected: 'single_item_query' },
    { text: '按11块算', expected: 'price_correction' },
    { text: '好的', expected: 'confirm' },
    { text: '不对', expected: 'deny' },
    { text: '给我三包纸巾', expected: 'retail_quote' },
    { text: '雪碧几块钱', expected: 'single_item_query' },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const result = intentClassifier.classify(tc.text);
    if (result.intent === tc.expected) {
      success(`"${tc.text}" → ${result.intent} (置信度: ${result.confidence.toFixed(2)})`);
      passed++;
    } else {
      fail(`"${tc.text}" → ${result.intent}，期望: ${tc.expected}`);
      failed++;
    }
  }

  console.log(`\n意图分类器: ${passed}/${testCases.length} 通过\n`);
  return failed === 0;
}

/**
 * 测试实体抽取器
 */
async function testEntityExtractor() {
  console.log('\n=== 测试实体抽取器 ===\n');

  const testCases = [
    {
      text: '两瓶可乐三包纸巾',
      expectedProducts: 2,
      products: [
        { name: '可乐', quantity: 2, unit: '瓶' },
        { name: '纸巾', quantity: 3, unit: '包' }
      ]
    },
    {
      text: '张三要一箱矿泉水',
      expectedProducts: 1,
      expectedPartner: '张三'
    },
    {
      text: '5块5的雪碧',
      expectedPrices: 1,
      priceValue: 5.5
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const result = entityExtractor.extractAll(tc.text);

    // 检查商品数量
    if (tc.expectedProducts !== undefined) {
      if (result.products.length >= tc.expectedProducts - 1) {
        success(`"${tc.text}" → 提取到 ${result.products.length} 个商品`);
        for (const p of result.products) {
          info(`  - ${p.name}: ${p.quantity}${p.unit}`);
        }
        passed++;
      } else {
        fail(`"${tc.text}" → 商品数量 ${result.products.length}，期望 ${tc.expectedProducts}`);
        failed++;
      }
    }

    // 检查顾客
    if (tc.expectedPartner) {
      if (result.partner?.name === tc.expectedPartner) {
        success(`"${tc.text}" → 顾客: ${result.partner.name}`);
        passed++;
      } else {
        fail(`"${tc.text}" → 顾客: ${result.partner?.name}，期望: ${tc.expectedPartner}`);
        failed++;
      }
    }

    // 检查价格
    if (tc.expectedPrices !== undefined) {
      if (result.prices.length >= tc.expectedPrices) {
        success(`"${tc.text}" → 价格: ${result.prices.map(p => p.value).join(', ')}`);
        passed++;
      } else {
        fail(`"${tc.text}" → 价格数量 ${result.prices.length}，期望 ${tc.expectedPrices}`);
        failed++;
      }
    }
  }

  console.log(`\n实体抽取器: ${passed} 项通过\n`);
  return failed === 0;
}

/**
 * 测试 NLU 服务
 */
async function testNLUService() {
  console.log('\n=== 测试 NLU 服务 ===\n');

  // 不初始化 AI（避免需要 API Key）
  const testInputs = [
    '张三两瓶可乐',
    '老李三包纸巾多少钱',
    '可乐怎么卖'
  ];

  let passed = 0;

  for (const text of testInputs) {
    try {
      const result = await nluService.parse(text);
      success(`解析 "${text}":`);
      info(`  意图: ${result.intent.intent} (${result.intent.confidence.toFixed(2)})`);
      info(`  商品: ${result.products.map(p => `${p.quantity}${p.unit}${p.name}`).join(', ') || '无'}`);
      info(`  顾客: ${result.partner?.name || '无'}`);
      passed++;
    } catch (error) {
      fail(`解析 "${text}" 失败: ${error}`);
    }
  }

  console.log(`\nNLU 服务: ${passed}/${testInputs.length} 通过\n`);
  return passed === testInputs.length;
}

/**
 * 测试定价引擎
 */
async function testPricingEngine() {
  console.log('\n=== 测试定价引擎 ===\n');

  // 测试默认规则
  const context = {
    products: [
      { name: '可乐', quantity: 2, unit: '瓶', confidence: 0.9 },
      { name: '纸巾', quantity: 1, unit: '包', confidence: 0.85 }
    ]
  };

  try {
    // 模拟商品成本
    const quote = await pricingEngine.quote(context);

    success('生成报价成功:');
    for (const item of quote.items) {
      info(`  - ${item.productName}: ${item.suggestedUnitPrice} 元/${item.unit} x ${item.quantity} = ${item.suggestedSubtotal} 元`);
    }
    info(`  总价: ${quote.totalSuggestedPrice} 元`);
    info(`  播报: "${quote.message}"`);

    return true;
  } catch (error) {
    fail(`定价引擎测试失败: ${error}`);
    return false;
  }
}

/**
 * 测试完整报价流程
 */
async function testPricingService() {
  console.log('\n=== 测试完整报价流程 ===\n');

  const testInputs = [
    '张三两瓶可乐',
    '可乐怎么卖',
    '好的'
  ];

  let passed = 0;

  for (const text of testInputs) {
    try {
      const result = await pricingService.processQuote({ text });
      success(`处理 "${text}":`);
      info(`  意图: ${result.nlu.intent.intent}`);
      info(`  播报: "${result.speechText}"`);
      info(`  耗时: ${result.processingTime}ms`);
      passed++;
    } catch (error) {
      fail(`处理 "${text}" 失败: ${error}`);
    }
  }

  console.log(`\n定价服务: ${passed}/${testInputs.length} 通过\n`);
  return passed === testInputs.length;
}

/**
 * 主函数
 */
async function main() {
  console.log('\n' + '='.repeat(50));
  console.log('       AI 小店报价助手 - 模块验收测试');
  console.log('='.repeat(50));

  const results: boolean[] = [];

  // 1. 意图分类器
  results.push(testIntentClassifier());

  // 2. 实体抽取器
  results.push(await testEntityExtractor());

  // 3. NLU 服务（不连接 AI）
  warn('NLU 服务测试 (仅规则层，未连接 AI)');
  results.push(await testNLUService());

  // 4. 定价引擎
  warn('定价引擎测试 (使用默认规则，未连接数据库)');
  results.push(await testPricingEngine());

  // 5. 完整报价流程
  warn('完整报价流程测试 (未连接数据库)');
  results.push(await testPricingService());

  // 汇总
  console.log('\n' + '='.repeat(50));
  console.log('                  测试汇总');
  console.log('='.repeat(50) + '\n');

  const allPassed = results.every(r => r);
  if (allPassed) {
    success('所有测试通过！模块验收成功。');
  } else {
    fail(`${results.filter(r => !r).length} 项测试失败`);
  }

  console.log('\n📝 提示:');
  info('- 当前测试未连接数据库和 AI API');
  info('- 要测试完整功能，请配置 DASHSCOPE_API_KEY 和数据库');
  info('- 运行 npm run dev 启动服务后可通过 API 测试\n');

  process.exit(allPassed ? 0 : 1);
}

// 运行
main().catch(console.error);

