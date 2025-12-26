#!/usr/bin/env ts-node
/**
 * 大模型全面评估测试脚本
 * 
 * 测试模式：
 * 1. 强制 AI 模式 - 绕过规则层，测试大模型兜底能力
 * 2. 实际场景模式 - 基于真实使用场景的评估
 */

import * as http from 'http';

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

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

interface TestCase {
  name: string;
  input: string;
  expectedIntent?: string;
  expectedPartner?: string;
  expectedProducts?: string[];
  expectedPrices?: number[];
  scenario: string;  // 场景分类
  description?: string;  // 场景描述
}

interface TestResult {
  name: string;
  passed: boolean;
  input: string;
  scenario: string;
  expected: any;
  actual: any;
  duration: number;
  aiResponse?: string;
  error?: string;
}

const results: TestResult[] = [];

/**
 * HTTP 请求封装
 */
function request(data: any, timeout = 120000): Promise<{ data: any; duration: number }> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const url = new URL(API_BASE + '/api/conversation/chat');
    
    const reqOptions: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ data: result, duration: Date.now() - startTime });
        } catch {
          reject(new Error(`解析响应失败: ${body.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.write(JSON.stringify(data));
    req.end();
  });
}

/**
 * 运行测试
 */
async function runTest(tc: TestCase): Promise<TestResult> {
  const sessionId = `eval_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  
  try {
    const { data, duration } = await request({ sessionId, text: tc.input });

    if (!data.success) {
      return {
        name: tc.name,
        passed: false,
        input: tc.input,
        scenario: tc.scenario,
        expected: {},
        actual: data,
        duration,
        error: data.error?.message || 'API 返回失败'
      };
    }

    const result = data.data;
    const nlu = result.nlu;
    
    let passed = true;
    const checks: string[] = [];

    // 意图检查
    if (tc.expectedIntent && nlu.intent.intent !== tc.expectedIntent) {
      passed = false;
      checks.push(`意图: 期望 ${tc.expectedIntent}, 实际 ${nlu.intent.intent}`);
    }

    // 顾客检查
    if (tc.expectedPartner !== undefined) {
      const actualPartner = nlu.partner?.name || null;
      if (actualPartner !== tc.expectedPartner) {
        passed = false;
        checks.push(`顾客: 期望 ${tc.expectedPartner}, 实际 ${actualPartner}`);
      }
    }

    // 商品检查
    if (tc.expectedProducts) {
      const actualProducts = (nlu.products || []).map((p: any) => p.name);
      const missing = tc.expectedProducts.filter(p => !actualProducts.some((a: string) => a.includes(p) || p.includes(a)));
      if (missing.length > 0) {
        passed = false;
        checks.push(`商品缺失: ${missing.join(', ')}`);
      }
    }

    return {
      name: tc.name,
      passed,
      input: tc.input,
      scenario: tc.scenario,
      expected: {
        intent: tc.expectedIntent,
        partner: tc.expectedPartner,
        products: tc.expectedProducts
      },
      actual: {
        intent: nlu.intent.intent,
        confidence: nlu.intent.confidence,
        partner: nlu.partner?.name || null,
        products: (nlu.products || []).map((p: any) => `${p.quantity}${p.unit}${p.name}`),
        response: result.text?.substring(0, 60)
      },
      duration,
      error: checks.length > 0 ? checks.join('; ') : undefined
    };

  } catch (error) {
    return {
      name: tc.name,
      passed: false,
      input: tc.input,
      scenario: tc.scenario,
      expected: {},
      actual: {},
      duration: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// ========== 实际使用场景测试用例 ==========

const scenarioTests: TestCase[] = [
  // === 场景1：标准报价流程 ===
  {
    name: '完整报价（顾客+商品+询价）',
    input: '张三两瓶可乐三包纸巾多少钱',
    expectedIntent: 'retail_quote',
    expectedPartner: '张三',
    expectedProducts: ['可乐', '纸巾'],
    scenario: '标准报价',
    description: '店主日常最常见的报价场景'
  },
  {
    name: '简洁报价（顾客+商品）',
    input: '老王要五瓶啤酒',
    expectedIntent: 'retail_quote',
    expectedPartner: '老王',
    expectedProducts: ['啤酒'],
    scenario: '标准报价'
  },
  {
    name: '无顾客报价',
    input: '两瓶矿泉水多少钱',
    expectedIntent: 'retail_quote',
    expectedProducts: ['矿泉水'],
    scenario: '标准报价'
  },

  // === 场景2：口语化/方言表达 ===
  {
    name: '口语化-给我来',
    input: '给我来三瓶可乐',
    expectedIntent: 'retail_quote',
    expectedProducts: ['可乐'],
    scenario: '口语化表达'
  },
  {
    name: '方言-俺',
    input: '给俺整两包烟',
    expectedIntent: 'retail_quote',
    expectedProducts: ['烟'],
    scenario: '口语化表达'
  },
  {
    name: '方言-弄',
    input: '帮我弄一箱矿泉水',
    expectedIntent: 'retail_quote',
    expectedProducts: ['矿泉水'],
    scenario: '口语化表达'
  },
  {
    name: '口语化-那个啥',
    input: '那个啥，就那个红色瓶子的饮料，来两瓶',
    expectedIntent: 'retail_quote',
    scenario: '口语化表达',
    description: '模糊商品描述'
  },

  // === 场景3：多商品组合 ===
  {
    name: '两商品',
    input: '一瓶可乐一包纸巾',
    expectedIntent: 'retail_quote',
    expectedProducts: ['可乐', '纸巾'],
    scenario: '多商品组合'
  },
  {
    name: '三商品',
    input: '可乐雪碧矿泉水各来一瓶',
    expectedIntent: 'retail_quote',
    expectedProducts: ['可乐', '雪碧', '矿泉水'],
    scenario: '多商品组合'
  },
  {
    name: '多商品带数量',
    input: '两瓶可乐三包纸巾五根火腿肠',
    expectedIntent: 'retail_quote',
    expectedProducts: ['可乐', '纸巾', '火腿肠'],
    scenario: '多商品组合'
  },

  // === 场景4：价格询问与修正 ===
  {
    name: '单品查价',
    input: '可乐多少钱一瓶',
    expectedIntent: 'single_item_query',
    scenario: '价格询问'
  },
  {
    name: '单品查价-怎么卖',
    input: '这个纸巾怎么卖',
    expectedIntent: 'single_item_query',
    scenario: '价格询问'
  },
  {
    name: '价格修正-按X算',
    input: '按10块算',
    expectedIntent: 'price_correction',
    scenario: '价格修正'
  },
  {
    name: '价格修正-便宜点',
    input: '便宜两块吧',
    expectedIntent: 'price_correction',
    scenario: '价格修正'
  },
  {
    name: '价格修正-抹零',
    input: '抹个零头吧',
    expectedIntent: 'price_correction',
    scenario: '价格修正'
  },

  // === 场景5：确认与取消 ===
  {
    name: '确认-好的',
    input: '好的',
    expectedIntent: 'confirm',
    scenario: '确认取消'
  },
  {
    name: '确认-行',
    input: '行',
    expectedIntent: 'confirm',
    scenario: '确认取消'
  },
  {
    name: '确认-成交',
    input: '成交',
    expectedIntent: 'confirm',
    scenario: '确认取消'
  },
  {
    name: '取消-不要了',
    input: '不要了',
    expectedIntent: 'deny',
    scenario: '确认取消'
  },
  {
    name: '取消-算了',
    input: '算了不买了',
    expectedIntent: 'deny',
    scenario: '确认取消'
  },

  // === 场景6：进货查价 ===
  {
    name: '进货查价-老李',
    input: '老李那边可乐进价多少',
    expectedIntent: 'purchase_price_check',
    scenario: '进货查价'
  },
  {
    name: '进货查价-批发商',
    input: '批发商那里雪碧什么价',
    expectedIntent: 'purchase_price_check',
    scenario: '进货查价'
  },

  // === 场景7：熟客场景 ===
  {
    name: '熟客-张三',
    input: '张三老规矩',
    expectedPartner: '张三',
    scenario: '熟客场景',
    description: '熟客惯例购买'
  },
  {
    name: '熟客-隔壁老王',
    input: '隔壁老王来拿货',
    expectedPartner: '老王',
    scenario: '熟客场景'
  },

  // === 场景8：数量表达 ===
  {
    name: '数量-阿拉伯数字',
    input: '5瓶可乐',
    expectedIntent: 'retail_quote',
    expectedProducts: ['可乐'],
    scenario: '数量表达'
  },
  {
    name: '数量-中文大写',
    input: '三瓶雪碧',
    expectedIntent: 'retail_quote',
    expectedProducts: ['雪碧'],
    scenario: '数量表达'
  },
  {
    name: '数量-一箱',
    input: '一箱矿泉水',
    expectedIntent: 'retail_quote',
    expectedProducts: ['矿泉水'],
    scenario: '数量表达'
  },
  {
    name: '数量-半斤',
    input: '来半斤瓜子',
    expectedIntent: 'retail_quote',
    scenario: '数量表达'
  },

  // === 场景9：特殊表达 ===
  {
    name: '疑问句',
    input: '你们有雪碧吗',
    scenario: '特殊表达',
    description: '询问是否有货'
  },
  {
    name: '模糊需求',
    input: '我想买点喝的',
    scenario: '特殊表达',
    description: '模糊商品需求'
  },
  {
    name: '问候',
    input: '老板在吗',
    scenario: '特殊表达'
  },

  // === 场景10：边界条件 ===
  {
    name: '特殊字符',
    input: '可乐！！！多少钱？？？',
    expectedIntent: 'retail_quote',
    scenario: '边界条件'
  },
  {
    name: '长句子',
    input: '张三昨天说要来买东西今天终于来了帮他拿两瓶可乐三包纸巾',
    expectedIntent: 'retail_quote',
    expectedPartner: '张三',
    scenario: '边界条件'
  },
  {
    name: '价格带小数',
    input: '来5瓶3块5的水',
    expectedIntent: 'retail_quote',
    scenario: '边界条件'
  }
];

/**
 * 打印详细评估报告
 */
function printDetailedReport() {
  console.log('\n' + colors.bold + colors.cyan + '═'.repeat(80));
  console.log('                       大模型全面功能评估报告');
  console.log('═'.repeat(80) + colors.reset);
  console.log(`   测试时间: ${new Date().toLocaleString()}`);
  console.log(`   API 地址: ${API_BASE}\n`);

  // 按场景分组
  const scenarios = new Map<string, TestResult[]>();
  for (const r of results) {
    const list = scenarios.get(r.scenario) || [];
    list.push(r);
    scenarios.set(r.scenario, list);
  }

  // 打印各场景结果
  for (const [scenario, items] of scenarios) {
    const passed = items.filter(i => i.passed).length;
    const total = items.length;
    const rate = (passed / total * 100).toFixed(0);
    const avgTime = items.reduce((s, i) => s + i.duration, 0) / total;
    
    const rateColor = passed === total ? colors.green : (passed >= total * 0.7 ? colors.yellow : colors.red);
    
    console.log(colors.bold + `\n📋 ${scenario}` + colors.reset + ` (${rateColor}${passed}/${total} = ${rate}%${colors.reset}, 平均 ${avgTime.toFixed(0)}ms)`);
    console.log('─'.repeat(70));

    for (const r of items) {
      const status = r.passed ? colors.green + '✅' : colors.red + '❌';
      const timeColor = r.duration > 5000 ? colors.yellow : colors.dim;
      
      console.log(`${status}${colors.reset} ${r.name}`);
      console.log(`   ${colors.dim}输入: "${r.input.substring(0, 50)}${r.input.length > 50 ? '...' : ''}"${colors.reset}`);
      console.log(`   ${timeColor}耗时: ${r.duration}ms${colors.reset} | 意图: ${r.actual.intent || 'N/A'} (${(r.actual.confidence || 0).toFixed(2)})`);
      
      if (r.actual.partner) {
        console.log(`   顾客: ${r.actual.partner}`);
      }
      if (r.actual.products && r.actual.products.length > 0) {
        console.log(`   商品: ${r.actual.products.join(', ')}`);
      }
      if (r.actual.response) {
        console.log(`   ${colors.blue}回复: "${r.actual.response}..."${colors.reset}`);
      }
      if (r.error) {
        console.log(`   ${colors.red}问题: ${r.error}${colors.reset}`);
      }
    }
  }

  // 汇总统计
  console.log('\n' + colors.bold + colors.cyan + '═'.repeat(80));
  console.log('                          评估汇总统计');
  console.log('═'.repeat(80) + colors.reset + '\n');

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const avgDuration = results.reduce((s, r) => s + r.duration, 0) / total;
  const aiCalls = results.filter(r => r.duration > 1000).length;

  console.log(`  📊 总体统计`);
  console.log(`     总测试数: ${total}`);
  console.log(`     ${colors.green}通过: ${passed}${colors.reset}`);
  console.log(`     ${colors.red}失败: ${failed}${colors.reset}`);
  console.log(`     通过率: ${(passed / total * 100).toFixed(1)}%`);
  console.log('');
  console.log(`  ⚡ 性能统计`);
  console.log(`     平均响应时间: ${avgDuration.toFixed(0)}ms`);
  console.log(`     快速响应(<1s): ${results.filter(r => r.duration < 1000).length} (${(results.filter(r => r.duration < 1000).length / total * 100).toFixed(0)}%)`);
  console.log(`     慢响应(>5s): ${results.filter(r => r.duration > 5000).length} (${(results.filter(r => r.duration > 5000).length / total * 100).toFixed(0)}%)`);

  // 各场景通过率
  console.log('\n  📈 各场景通过率');
  for (const [scenario, items] of scenarios) {
    const p = items.filter(i => i.passed).length;
    const t = items.length;
    const bar = '█'.repeat(Math.round(p / t * 20)) + '░'.repeat(20 - Math.round(p / t * 20));
    const color = p === t ? colors.green : (p >= t * 0.7 ? colors.yellow : colors.red);
    console.log(`     ${scenario.padEnd(15)} ${color}${bar}${colors.reset} ${p}/${t}`);
  }

  // 失败用例详情
  if (failed > 0) {
    console.log('\n  ❌ 失败用例详情');
    for (const r of results.filter(r => !r.passed)) {
      console.log(`     - ${r.name}: ${r.error}`);
    }
  }

  // 评估结论
  console.log('\n' + colors.bold + colors.magenta + '═'.repeat(80));
  console.log('                          评估结论');
  console.log('═'.repeat(80) + colors.reset + '\n');

  const passRate = passed / total;
  if (passRate >= 0.95) {
    console.log(colors.green + '  ✅ 优秀：系统功能完备，各场景表现出色' + colors.reset);
  } else if (passRate >= 0.85) {
    console.log(colors.green + '  ✅ 良好：系统整体表现良好，可满足日常使用' + colors.reset);
  } else if (passRate >= 0.70) {
    console.log(colors.yellow + '  ⚠️  中等：系统基本可用，部分场景需要优化' + colors.reset);
  } else {
    console.log(colors.red + '  ❌ 待改进：系统存在较多问题，需要进一步调试' + colors.reset);
  }

  // 功能覆盖评估
  console.log('\n  📋 功能覆盖评估:');
  const intentCoverage = new Set(results.map(r => r.actual.intent)).size;
  console.log(`     意图类型覆盖: ${intentCoverage}/7 (${['retail_quote', 'single_item_query', 'price_correction', 'confirm', 'deny', 'purchase_price_check', 'unknown'].filter(i => results.some(r => r.actual.intent === i)).join(', ')})`);
  
  console.log('\n  💡 优化建议:');
  if (results.filter(r => r.duration > 5000).length > 3) {
    console.log('     - 响应时间较长的用例较多，建议检查大模型响应或调整触发阈值');
  }
  if (failed > 0) {
    console.log('     - 存在失败用例，建议检查规则匹配或大模型提示词');
  }
  if (passRate >= 0.9) {
    console.log('     - 系统表现良好，可考虑进一步优化响应时间');
  }

  console.log('\n');
}

/**
 * 主函数
 */
async function main() {
  console.log('\n' + colors.bold + '🧪 大模型全面功能评估' + colors.reset);
  console.log(`   API 地址: ${API_BASE}`);
  console.log(`   测试用例: ${scenarioTests.length} 个\n`);

  // 检查服务
  try {
    await request({ sessionId: 'check', text: 'test' }, 10000);
    console.log(colors.green + '   ✓ 服务连接正常' + colors.reset + '\n');
  } catch {
    console.log(colors.red + '   ✗ 无法连接服务，请先启动: npm run dev' + colors.reset + '\n');
    process.exit(1);
  }

  // 运行测试
  for (let i = 0; i < scenarioTests.length; i++) {
    const tc = scenarioTests[i];
    const progress = `[${String(i + 1).padStart(2)}/${scenarioTests.length}]`;
    process.stdout.write(`   ${progress} ${tc.name.padEnd(25)}... `);
    
    const result = await runTest(tc);
    results.push(result);
    
    const status = result.passed ? colors.green + '✓' : colors.red + '✗';
    const time = result.duration > 5000 ? colors.yellow : colors.dim;
    console.log(`${status}${colors.reset} ${time}${result.duration}ms${colors.reset}`);
  }

  // 打印报告
  printDetailedReport();
}

// 运行
main().catch(console.error);

