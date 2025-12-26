#!/usr/bin/env ts-node
/**
 * 大模型专项评估测试
 * 
 * 强制绕过规则层，直接测试大模型的 NLU 能力
 */

import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

// LLM 配置
const LLM_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY || '',
  baseUrl: process.env.OPENAI_API_BASE || 'https://open.bigmodel.cn/api/paas/v4',
  model: process.env.OPENAI_MODEL || 'glm-4-flash'
};

interface TestCase {
  name: string;
  input: string;
  expectedIntent?: string;
  expectedPartner?: string;
  expectedProducts?: string[];
  category: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  input: string;
  category: string;
  expected: any;
  actual: any;
  duration: number;
  rawResponse?: string;
  error?: string;
}

const results: TestResult[] = [];

/**
 * 构建 NLU 提示词（与后端保持一致）
 */
function buildNLUPrompt(text: string): string {
  return `你是一个小店报价助手的意图识别器。请分析以下用户输入，识别其意图和相关实体。

用户输入：${text}

请严格按以下 JSON 格式返回：
{
  "intent": "retail_quote|single_item_query|price_correction|confirm|deny|purchase_price_check|unknown",
  "confidence": 0.0-1.0,
  "partner": { "name": "顾客姓名或null", "type": "熟客|普通|null" },
  "products": [
    { "name": "商品名", "quantity": 数量, "unit": "单位" }
  ],
  "priceAdjustment": { "type": "fixed|discount|round", "value": 数值或null }
}

意图说明：
- retail_quote: 报价请求，如"张三两瓶可乐多少钱"
- single_item_query: 单品查价，如"可乐怎么卖"
- price_correction: 价格修正，如"便宜点"、"抹零"
- confirm: 确认，如"好的"、"成交"
- deny: 否定/取消，如"不要了"、"算了"
- purchase_price_check: 进货查价，如"老李那边进价多少"
- unknown: 无法识别

只返回 JSON，不要其他文字。`;
}

/**
 * 调用大模型 API
 */
async function callLLM(text: string): Promise<{ response: string; duration: number }> {
  const prompt = buildNLUPrompt(text);
  const startTime = Date.now();

  const url = new URL(`${LLM_CONFIG.baseUrl}/chat/completions`);
  const isHttps = url.protocol === 'https:';
  const httpModule = isHttps ? https : http;

  const body = JSON.stringify({
    model: LLM_CONFIG.model,
    messages: [
      { role: 'system', content: '你是一个小店报价助手的意图识别器。请严格按照 JSON 格式返回结果。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.1,
    max_tokens: 1000
  });

  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_CONFIG.apiKey}`,
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 60000
    };

    const req = httpModule.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(json.error.message || 'API 错误'));
            return;
          }
          const content = json.choices?.[0]?.message?.content || '';
          resolve({ response: content, duration: Date.now() - startTime });
        } catch (e) {
          reject(new Error(`解析响应失败: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.write(body);
    req.end();
  });
}

/**
 * 解析大模型返回的 JSON
 */
function parseResponse(response: string): any {
  // 清理 markdown 代码块
  let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  try {
    return JSON.parse(cleaned);
  } catch {
    // 尝试提取 JSON
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('无法解析 JSON');
  }
}

/**
 * 运行单个测试
 */
async function runTest(tc: TestCase): Promise<TestResult> {
  try {
    const { response, duration } = await callLLM(tc.input);
    const parsed = parseResponse(response);

    let passed = true;
    const checks: string[] = [];

    // 意图检查
    if (tc.expectedIntent && parsed.intent !== tc.expectedIntent) {
      passed = false;
      checks.push(`意图: 期望 ${tc.expectedIntent}, 实际 ${parsed.intent}`);
    }

    // 顾客检查
    if (tc.expectedPartner !== undefined) {
      const actualPartner = parsed.partner?.name || null;
      if (actualPartner !== tc.expectedPartner && 
          !(actualPartner && tc.expectedPartner && actualPartner.includes(tc.expectedPartner))) {
        passed = false;
        checks.push(`顾客: 期望 ${tc.expectedPartner}, 实际 ${actualPartner}`);
      }
    }

    // 商品检查
    if (tc.expectedProducts && tc.expectedProducts.length > 0) {
      const actualProducts = (parsed.products || []).map((p: any) => p.name);
      for (const expected of tc.expectedProducts) {
        const found = actualProducts.some((actual: string) => 
          actual.includes(expected) || expected.includes(actual)
        );
        if (!found) {
          passed = false;
          checks.push(`商品缺失: ${expected}`);
        }
      }
    }

    return {
      name: tc.name,
      passed,
      input: tc.input,
      category: tc.category,
      expected: {
        intent: tc.expectedIntent,
        partner: tc.expectedPartner,
        products: tc.expectedProducts
      },
      actual: {
        intent: parsed.intent,
        confidence: parsed.confidence,
        partner: parsed.partner?.name || null,
        products: (parsed.products || []).map((p: any) => `${p.quantity}${p.unit}${p.name}`)
      },
      duration,
      rawResponse: response.substring(0, 200),
      error: checks.length > 0 ? checks.join('; ') : undefined
    };

  } catch (error) {
    return {
      name: tc.name,
      passed: false,
      input: tc.input,
      category: tc.category,
      expected: {},
      actual: {},
      duration: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// ========== 测试用例 ==========

const testCases: TestCase[] = [
  // === 核心场景：大模型必须正确处理 ===
  // 1. 标准报价
  {
    name: '标准报价-完整',
    input: '张三两瓶可乐三包纸巾多少钱',
    expectedIntent: 'retail_quote',
    expectedPartner: '张三',
    expectedProducts: ['可乐', '纸巾'],
    category: '核心-报价'
  },
  {
    name: '标准报价-简洁',
    input: '老王要五瓶啤酒',
    expectedIntent: 'retail_quote',
    expectedPartner: '老王',
    expectedProducts: ['啤酒'],
    category: '核心-报价'
  },
  {
    name: '标准报价-无顾客',
    input: '两瓶矿泉水多少钱',
    expectedIntent: 'retail_quote',
    expectedProducts: ['矿泉水'],
    category: '核心-报价'
  },

  // 2. 单品查价
  {
    name: '单品查价-多少钱',
    input: '可乐多少钱一瓶',
    expectedIntent: 'single_item_query',
    expectedProducts: ['可乐'],
    category: '核心-查价'
  },
  {
    name: '单品查价-怎么卖',
    input: '纸巾怎么卖',
    expectedIntent: 'single_item_query',
    expectedProducts: ['纸巾'],
    category: '核心-查价'
  },
  {
    name: '单品查价-什么价',
    input: '啤酒什么价',
    expectedIntent: 'single_item_query',
    expectedProducts: ['啤酒'],
    category: '核心-查价'
  },

  // 3. 价格修正
  {
    name: '价格修正-固定价',
    input: '按10块算',
    expectedIntent: 'price_correction',
    category: '核心-修正'
  },
  {
    name: '价格修正-便宜',
    input: '便宜点',
    expectedIntent: 'price_correction',
    category: '核心-修正'
  },
  {
    name: '价格修正-抹零',
    input: '抹个零头',
    expectedIntent: 'price_correction',
    category: '核心-修正'
  },
  {
    name: '价格修正-打折',
    input: '给打个九折',
    expectedIntent: 'price_correction',
    category: '核心-修正'
  },

  // 4. 确认/取消
  {
    name: '确认-好的',
    input: '好的',
    expectedIntent: 'confirm',
    category: '核心-确认'
  },
  {
    name: '确认-成交',
    input: '成交',
    expectedIntent: 'confirm',
    category: '核心-确认'
  },
  {
    name: '确认-行',
    input: '行',
    expectedIntent: 'confirm',
    category: '核心-确认'
  },
  {
    name: '取消-不要了',
    input: '不要了',
    expectedIntent: 'deny',
    category: '核心-取消'
  },
  {
    name: '取消-算了',
    input: '算了不买了',
    expectedIntent: 'deny',
    category: '核心-取消'
  },
  {
    name: '取消-重来',
    input: '不对，重新来',
    expectedIntent: 'deny',
    category: '核心-取消'
  },

  // 5. 进货查价
  {
    name: '进货-老李',
    input: '老李那边可乐进价多少',
    expectedIntent: 'purchase_price_check',
    expectedProducts: ['可乐'],
    category: '核心-进货'
  },
  {
    name: '进货-批发商',
    input: '批发商那里雪碧什么价',
    expectedIntent: 'purchase_price_check',
    expectedProducts: ['雪碧'],
    category: '核心-进货'
  },

  // === 难点场景：需要语义理解 ===
  // 1. 口语化表达
  {
    name: '口语-给我来',
    input: '给我来三瓶可乐',
    expectedIntent: 'retail_quote',
    expectedProducts: ['可乐'],
    category: '难点-口语'
  },
  {
    name: '口语-方言俺',
    input: '给俺整两包烟',
    expectedIntent: 'retail_quote',
    expectedProducts: ['烟'],
    category: '难点-口语'
  },
  {
    name: '口语-帮我弄',
    input: '帮我弄一箱矿泉水',
    expectedIntent: 'retail_quote',
    expectedProducts: ['矿泉水'],
    category: '难点-口语'
  },

  // 2. 模糊描述
  {
    name: '模糊-红色饮料',
    input: '那个红色的饮料来两瓶',
    expectedIntent: 'retail_quote',
    category: '难点-模糊'
  },
  {
    name: '模糊-那个啥',
    input: '那个啥，就是上次买的那个',
    expectedIntent: 'retail_quote',
    category: '难点-模糊'
  },

  // 3. 复杂句式
  {
    name: '复杂-长句',
    input: '张三昨天说要来买东西今天终于来了帮他拿两瓶可乐',
    expectedIntent: 'retail_quote',
    expectedPartner: '张三',
    expectedProducts: ['可乐'],
    category: '难点-复杂'
  },
  {
    name: '复杂-熟客老规矩',
    input: '张三老规矩',
    expectedIntent: 'retail_quote',
    expectedPartner: '张三',
    category: '难点-复杂'
  },

  // 4. 数量表达
  {
    name: '数量-半斤',
    input: '来半斤瓜子',
    expectedIntent: 'retail_quote',
    expectedProducts: ['瓜子'],
    category: '难点-数量'
  },
  {
    name: '数量-一箱',
    input: '一箱矿泉水',
    expectedIntent: 'retail_quote',
    expectedProducts: ['矿泉水'],
    category: '难点-数量'
  },

  // === 边界场景 ===
  {
    name: '边界-问候',
    input: '你好',
    expectedIntent: 'unknown',
    category: '边界'
  },
  {
    name: '边界-无关问题',
    input: '今天天气怎么样',
    expectedIntent: 'unknown',
    category: '边界'
  },
  {
    name: '边界-特殊字符',
    input: '可乐！！！多少钱？？？',
    expectedIntent: 'retail_quote',
    expectedProducts: ['可乐'],
    category: '边界'
  },

  // === 新增：上下文理解 ===
  {
    name: '上下文-再来一瓶',
    input: '再来一瓶',
    expectedIntent: 'retail_quote',
    category: '上下文理解'
  },
  {
    name: '上下文-跟刚才一样',
    input: '跟刚才一样的',
    expectedIntent: 'retail_quote',
    category: '上下文理解'
  },
  {
    name: '上下文-还要一个',
    input: '还要一个',
    expectedIntent: 'retail_quote',
    category: '上下文理解'
  },

  // === 新增：数量单位转换 ===
  {
    name: '数量单位-一打',
    input: '一打鸡蛋',
    expectedIntent: 'retail_quote',
    expectedProducts: ['鸡蛋'],
    category: '数量单位'
  },
  {
    name: '数量单位-一条烟',
    input: '一条中华',
    expectedIntent: 'retail_quote',
    expectedProducts: ['中华'],
    category: '数量单位'
  },
  {
    name: '数量单位-两箱',
    input: '两箱矿泉水',
    expectedIntent: 'retail_quote',
    expectedProducts: ['矿泉水'],
    category: '数量单位'
  },
  {
    name: '数量单位-半斤',
    input: '半斤瓜子',
    expectedIntent: 'retail_quote',
    expectedProducts: ['瓜子'],
    category: '数量单位'
  },

  // === 新增：更多确认/取消表达 ===
  {
    name: '确认-嗯',
    input: '嗯',
    expectedIntent: 'confirm',
    category: '确认取消'
  },
  {
    name: '确认-可以',
    input: '可以',
    expectedIntent: 'confirm',
    category: '确认取消'
  },
  {
    name: '确认-就这样',
    input: '就这样吧',
    expectedIntent: 'confirm',
    category: '确认取消'
  },
  {
    name: '取消-不买了',
    input: '不买了',
    expectedIntent: 'deny',
    category: '确认取消'
  },
  {
    name: '取消-取消',
    input: '取消',
    expectedIntent: 'deny',
    category: '确认取消'
  }
];

/**
 * 打印评估报告
 */
function printReport() {
  console.log('\n' + colors.bold + colors.magenta + '═'.repeat(80));
  console.log('               大模型专项评估报告（绕过规则层）');
  console.log('═'.repeat(80) + colors.reset);
  console.log(`   模型: ${LLM_CONFIG.model}`);
  console.log(`   API: ${LLM_CONFIG.baseUrl}`);
  console.log(`   时间: ${new Date().toLocaleString()}\n`);

  // 按类别分组
  const categories = new Map<string, TestResult[]>();
  for (const r of results) {
    const list = categories.get(r.category) || [];
    list.push(r);
    categories.set(r.category, list);
  }

  // 打印各类别
  for (const [category, items] of categories) {
    const passed = items.filter(i => i.passed).length;
    const total = items.length;
    const rate = (passed / total * 100).toFixed(0);
    const avgTime = items.reduce((s, i) => s + i.duration, 0) / total;
    
    const rateColor = passed === total ? colors.green : 
                     (passed >= total * 0.7 ? colors.yellow : colors.red);

    console.log(colors.bold + `\n📋 ${category}` + colors.reset + 
                ` (${rateColor}${passed}/${total} = ${rate}%${colors.reset}, 平均 ${avgTime.toFixed(0)}ms)`);
    console.log('─'.repeat(70));

    for (const r of items) {
      const status = r.passed ? colors.green + '✅' : colors.red + '❌';
      console.log(`${status}${colors.reset} ${r.name}`);
      console.log(`   输入: "${r.input}"`);
      console.log(`   耗时: ${r.duration}ms | 意图: ${r.actual.intent} (${(r.actual.confidence || 0).toFixed(2)})`);
      
      if (r.actual.partner) console.log(`   顾客: ${r.actual.partner}`);
      if (r.actual.products?.length > 0) console.log(`   商品: ${r.actual.products.join(', ')}`);
      if (r.error) console.log(`   ${colors.red}问题: ${r.error}${colors.reset}`);
    }
  }

  // 汇总
  console.log('\n' + colors.bold + colors.cyan + '═'.repeat(80));
  console.log('                          评估汇总');
  console.log('═'.repeat(80) + colors.reset + '\n');

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const avgTime = results.reduce((s, r) => s + r.duration, 0) / total;

  console.log(`  📊 总体指标`);
  console.log(`     总测试: ${total}`);
  console.log(`     ${colors.green}通过: ${passed}${colors.reset}`);
  console.log(`     ${colors.red}失败: ${total - passed}${colors.reset}`);
  console.log(`     通过率: ${(passed / total * 100).toFixed(1)}%`);
  console.log(`     平均耗时: ${avgTime.toFixed(0)}ms`);

  // 各类别通过率
  console.log('\n  📈 各类别通过率:');
  for (const [category, items] of categories) {
    const p = items.filter(i => i.passed).length;
    const t = items.length;
    const bar = '█'.repeat(Math.round(p / t * 15)) + '░'.repeat(15 - Math.round(p / t * 15));
    const color = p === t ? colors.green : (p >= t * 0.7 ? colors.yellow : colors.red);
    console.log(`     ${category.padEnd(12)} ${color}${bar}${colors.reset} ${p}/${t} (${(p/t*100).toFixed(0)}%)`);
  }

  // 意图识别准确率
  const intentResults = results.filter(r => r.expected.intent);
  const intentCorrect = intentResults.filter(r => r.actual.intent === r.expected.intent).length;
  console.log(`\n  🎯 意图识别准确率: ${intentCorrect}/${intentResults.length} = ${(intentCorrect/intentResults.length*100).toFixed(1)}%`);

  // 评估结论
  console.log('\n' + colors.bold + '📝 大模型能力评估:' + colors.reset);
  
  const passRate = passed / total;
  if (passRate >= 0.9) {
    console.log(colors.green + '  ✅ 优秀：大模型意图识别能力强，可作为规则层的可靠兜底' + colors.reset);
  } else if (passRate >= 0.8) {
    console.log(colors.green + '  ✅ 良好：大模型基本满足需求，少数边缘场景需规则层补充' + colors.reset);
  } else if (passRate >= 0.7) {
    console.log(colors.yellow + '  ⚠️ 中等：大模型存在一定识别误差，建议调整提示词' + colors.reset);
  } else {
    console.log(colors.red + '  ❌ 待改进：大模型识别能力不足，建议更换模型或优化提示词' + colors.reset);
  }

  // 失败用例分析
  const failures = results.filter(r => !r.passed);
  if (failures.length > 0) {
    console.log('\n  ❌ 失败用例分析:');
    for (const f of failures) {
      console.log(`     - ${f.name}: ${f.error}`);
    }
  }

  console.log('\n');
}

/**
 * 主函数
 */
async function main() {
  console.log('\n' + colors.bold + '🧪 大模型专项评估（强制 AI 模式）' + colors.reset);
  console.log(`   模型: ${LLM_CONFIG.model}`);
  console.log(`   测试用例: ${testCases.length} 个\n`);

  // 检查配置
  if (!LLM_CONFIG.apiKey) {
    console.log(colors.red + '   ✗ 未配置 OPENAI_API_KEY' + colors.reset);
    process.exit(1);
  }

  // 测试 API 连接
  console.log('   测试 API 连接...');
  try {
    const { duration } = await callLLM('测试');
    console.log(colors.green + `   ✓ API 连接正常 (${duration}ms)` + colors.reset + '\n');
  } catch (e) {
    console.log(colors.red + `   ✗ API 连接失败: ${e}` + colors.reset);
    process.exit(1);
  }

  // 运行测试
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const progress = `[${String(i + 1).padStart(2)}/${testCases.length}]`;
    process.stdout.write(`   ${progress} ${tc.name.padEnd(20)}... `);
    
    const result = await runTest(tc);
    results.push(result);
    
    const status = result.passed ? colors.green + '✓' : colors.red + '✗';
    console.log(`${status}${colors.reset} ${result.duration}ms`);
  }

  // 打印报告
  printReport();
}

// 运行
main().catch(console.error);

