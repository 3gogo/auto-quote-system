#!/usr/bin/env ts-node
/**
 * 大模型功能评估测试脚本
 * 
 * 测试范围：
 * 1. 规则层基础场景
 * 2. 大模型调用场景
 * 3. 边界条件和容错
 * 4. 性能基准
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
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

interface TestCase {
  name: string;
  input: string;
  expectedIntent?: string;
  expectedPartner?: string;
  expectedProductCount?: number;
  expectAICall?: boolean;  // 是否期望调用大模型
  category: 'rule' | 'ai' | 'edge' | 'perf';
}

interface TestResult {
  name: string;
  passed: boolean;
  input: string;
  expected: any;
  actual: any;
  duration: number;
  usedAI: boolean;
  error?: string;
}

const results: TestResult[] = [];

/**
 * HTTP 请求封装
 */
function request(data: any): Promise<{ data: any; duration: number }> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const url = new URL(API_BASE + '/api/conversation/chat');
    
    const reqOptions: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ 
            data: result, 
            duration: Date.now() - startTime 
          });
        } catch {
          reject(new Error(`解析响应失败: ${body}`));
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
 * 运行单个测试
 */
async function runTest(tc: TestCase): Promise<TestResult> {
  const sessionId = `eval_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  
  try {
    const { data, duration } = await request({
      sessionId,
      text: tc.input
    });

    if (!data.success) {
      return {
        name: tc.name,
        passed: false,
        input: tc.input,
        expected: {},
        actual: data,
        duration,
        usedAI: false,
        error: data.error?.message || 'API 返回失败'
      };
    }

    const result = data.data;
    const nlu = result.nlu;
    
    // 判断是否使用了 AI（通过响应时间估算，>1000ms 可能使用了 AI）
    const usedAI = duration > 1000;

    // 检查结果
    let passed = true;
    const checks: string[] = [];

    if (tc.expectedIntent && nlu.intent.intent !== tc.expectedIntent) {
      passed = false;
      checks.push(`意图: 期望 ${tc.expectedIntent}, 实际 ${nlu.intent.intent}`);
    }

    if (tc.expectedPartner !== undefined) {
      const actualPartner = nlu.partner?.name || null;
      if (actualPartner !== tc.expectedPartner) {
        passed = false;
        checks.push(`顾客: 期望 ${tc.expectedPartner}, 实际 ${actualPartner}`);
      }
    }

    if (tc.expectedProductCount !== undefined) {
      const actualCount = nlu.products?.length || 0;
      if (actualCount !== tc.expectedProductCount) {
        passed = false;
        checks.push(`商品数: 期望 ${tc.expectedProductCount}, 实际 ${actualCount}`);
      }
    }

    return {
      name: tc.name,
      passed,
      input: tc.input,
      expected: {
        intent: tc.expectedIntent,
        partner: tc.expectedPartner,
        productCount: tc.expectedProductCount
      },
      actual: {
        intent: nlu.intent.intent,
        confidence: nlu.intent.confidence,
        partner: nlu.partner?.name || null,
        productCount: nlu.products?.length || 0,
        text: result.text?.substring(0, 50)
      },
      duration,
      usedAI,
      error: checks.length > 0 ? checks.join('; ') : undefined
    };

  } catch (error) {
    return {
      name: tc.name,
      passed: false,
      input: tc.input,
      expected: {},
      actual: {},
      duration: 0,
      usedAI: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// ========== 测试用例定义 ==========

const testCases: TestCase[] = [
  // === 规则层基础场景 ===
  {
    name: '标准报价请求',
    input: '张三两瓶可乐多少钱',
    expectedIntent: 'retail_quote',
    expectedPartner: '张三',
    expectedProductCount: 1,
    category: 'rule'
  },
  {
    name: '多商品报价',
    input: '老王要三瓶可乐两包纸巾',
    expectedIntent: 'retail_quote',
    expectedPartner: '老王',
    expectedProductCount: 2,
    category: 'rule'
  },
  {
    name: '单品查询',
    input: '可乐怎么卖',
    expectedIntent: 'single_item_query',
    category: 'rule'
  },
  {
    name: '价格修正',
    input: '按10块算',
    expectedIntent: 'price_correction',
    category: 'rule'
  },
  {
    name: '确认意图',
    input: '好的',
    expectedIntent: 'confirm',
    category: 'rule'
  },
  {
    name: '否定意图',
    input: '不对，重新来',
    expectedIntent: 'deny',
    category: 'rule'
  },
  {
    name: '进货查价',
    input: '老李那边可乐进价多少',
    expectedIntent: 'purchase_price_check',
    category: 'rule'
  },

  // === 需要 AI 辅助的场景 ===
  {
    name: '口语化表达',
    input: '那个谁，就隔壁开店的，帮他拿点喝的',
    expectedIntent: 'retail_quote',
    expectAICall: true,
    category: 'ai'
  },
  {
    name: '模糊商品描述',
    input: '给我那个红色的甜饮料',
    expectAICall: true,
    category: 'ai'
  },
  {
    name: '复杂上下文',
    input: '跟昨天一样的',
    expectAICall: true,
    category: 'ai'
  },
  {
    name: '简单问候',
    input: '你好',
    expectedIntent: 'unknown',
    category: 'ai'
  },

  // === 边界条件 ===
  {
    name: '空输入处理',
    input: '',
    category: 'edge'
  },
  {
    name: '超长输入',
    input: '我想要很多很多东西，可乐雪碧矿泉水纸巾方便面火腿肠啤酒香烟还有其他的',
    category: 'edge'
  },
  {
    name: '特殊字符',
    input: '可乐@#￥%多少钱？？？',
    category: 'edge'
  },
  {
    name: '数字表达',
    input: '来5瓶3.5的水',
    category: 'edge'
  },
  {
    name: '方言表达',
    input: '给俺整两瓶可乐',
    category: 'edge'
  }
];

/**
 * 打印测试结果
 */
function printResults() {
  console.log('\n' + colors.bold + colors.cyan + '═'.repeat(70));
  console.log('                    大模型功能评估报告');
  console.log('═'.repeat(70) + colors.reset + '\n');

  // 按类别分组
  const categories = {
    rule: { name: '规则层基础场景', results: [] as TestResult[] },
    ai: { name: '大模型调用场景', results: [] as TestResult[] },
    edge: { name: '边界条件测试', results: [] as TestResult[] },
    perf: { name: '性能测试', results: [] as TestResult[] }
  };

  for (const tc of testCases) {
    const result = results.find(r => r.name === tc.name);
    if (result) {
      categories[tc.category].results.push(result);
    }
  }

  // 打印各类别结果
  for (const [key, cat] of Object.entries(categories)) {
    if (cat.results.length === 0) continue;

    console.log(colors.bold + `\n📋 ${cat.name}` + colors.reset);
    console.log('─'.repeat(50));

    for (const r of cat.results) {
      const status = r.passed 
        ? colors.green + '✅ PASS' 
        : colors.red + '❌ FAIL';
      
      const aiTag = r.usedAI 
        ? colors.yellow + ' [AI]' 
        : colors.dim + ' [规则]';
      
      console.log(`${status}${colors.reset}${aiTag}${colors.reset} ${r.name}`);
      console.log(`   输入: "${r.input.substring(0, 40)}${r.input.length > 40 ? '...' : ''}"`);
      console.log(`   结果: 意图=${r.actual.intent || 'N/A'}, 置信度=${r.actual.confidence?.toFixed(2) || 'N/A'}, 耗时=${r.duration}ms`);
      
      if (r.error) {
        console.log(`   ${colors.red}错误: ${r.error}${colors.reset}`);
      }
    }
  }

  // 汇总统计
  console.log('\n' + colors.bold + colors.cyan + '═'.repeat(70));
  console.log('                    评估汇总');
  console.log('═'.repeat(70) + colors.reset + '\n');

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / total;
  const aiCalls = results.filter(r => r.usedAI).length;
  const ruleCalls = total - aiCalls;

  console.log(`  总测试数: ${total}`);
  console.log(`  ${colors.green}通过: ${passed}${colors.reset}`);
  console.log(`  ${colors.red}失败: ${failed}${colors.reset}`);
  console.log(`  通过率: ${(passed / total * 100).toFixed(1)}%`);
  console.log('');
  console.log(`  规则层处理: ${ruleCalls} (${(ruleCalls / total * 100).toFixed(1)}%)`);
  console.log(`  大模型处理: ${aiCalls} (${(aiCalls / total * 100).toFixed(1)}%)`);
  console.log(`  平均响应时间: ${avgDuration.toFixed(0)}ms`);

  // 性能分析
  const ruleResults = results.filter(r => !r.usedAI);
  const aiResults = results.filter(r => r.usedAI);
  
  if (ruleResults.length > 0) {
    const ruleAvg = ruleResults.reduce((s, r) => s + r.duration, 0) / ruleResults.length;
    console.log(`  规则层平均耗时: ${ruleAvg.toFixed(0)}ms`);
  }
  
  if (aiResults.length > 0) {
    const aiAvg = aiResults.reduce((s, r) => s + r.duration, 0) / aiResults.length;
    console.log(`  大模型平均耗时: ${aiAvg.toFixed(0)}ms`);
  }

  // 评估结论
  console.log('\n' + colors.bold + '📊 评估结论:' + colors.reset);
  
  if (passed / total >= 0.9) {
    console.log(colors.green + '  ✅ 系统整体表现良好，大部分场景正常工作' + colors.reset);
  } else if (passed / total >= 0.7) {
    console.log(colors.yellow + '  ⚠️  系统基本可用，但部分场景需要优化' + colors.reset);
  } else {
    console.log(colors.red + '  ❌ 系统存在较多问题，需要进一步调试' + colors.reset);
  }

  // 具体建议
  console.log('\n' + colors.bold + '💡 建议:' + colors.reset);
  
  if (aiResults.length > 0 && aiResults.some(r => r.duration > 20000)) {
    console.log('  - 大模型响应较慢，建议切换到更快的模型（如 gemini-2.5-flash）');
  }
  
  if (failed > 0) {
    console.log('  - 部分测试失败，需要检查规则匹配逻辑或大模型提示词');
  }
  
  if (ruleCalls / total > 0.8) {
    console.log('  - 规则层覆盖良好，大模型调用较少，成本可控');
  }

  console.log('\n');
}

/**
 * 主函数
 */
async function main() {
  console.log('\n' + colors.bold + '🧪 大模型功能评估测试' + colors.reset);
  console.log(`   API 地址: ${API_BASE}\n`);

  // 检查服务是否运行
  try {
    await request({ sessionId: 'health_check', text: 'test' });
  } catch {
    console.log(colors.red + '❌ 无法连接到后端服务' + colors.reset);
    console.log('   请先运行: npm run dev\n');
    process.exit(1);
  }

  console.log(`   开始测试 ${testCases.length} 个用例...\n`);

  // 运行所有测试
  for (const tc of testCases) {
    process.stdout.write(`   测试: ${tc.name}... `);
    const result = await runTest(tc);
    results.push(result);
    
    if (result.passed) {
      console.log(colors.green + `✓ ${result.duration}ms` + colors.reset);
    } else {
      console.log(colors.red + `✗ ${result.error || 'failed'}` + colors.reset);
    }
  }

  // 打印结果
  printResults();
}

// 运行
main().catch(console.error);

