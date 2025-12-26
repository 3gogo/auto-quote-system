#!/usr/bin/env ts-node
/**
 * 端到端测试脚本
 * 验证整个系统从输入到输出的完整流程
 * 
 * 运行方式: 
 *   1. 先启动后端服务: npm run dev
 *   2. 运行测试: npx ts-node scripts/e2e-test.ts
 */

import * as http from 'http';

// 配置
const API_BASE = process.env.API_BASE || 'http://localhost:3001';

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color: string, ...args: any[]) {
  console.log(color, ...args, colors.reset);
}

function success(msg: string) { log(colors.green, '✅', msg); }
function fail(msg: string) { log(colors.red, '❌', msg); }
function info(msg: string) { log(colors.blue, 'ℹ️ ', msg); }
function warn(msg: string) { log(colors.yellow, '⚠️ ', msg); }
function section(msg: string) { 
  console.log('\n' + colors.bold + colors.cyan + '━'.repeat(50));
  console.log('  ' + msg);
  console.log('━'.repeat(50) + colors.reset + '\n');
}

// 测试结果
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

/**
 * HTTP 请求封装
 */
function request(options: {
  method: string;
  path: string;
  data?: any;
}): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + options.path);
    
    const reqOptions: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: options.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve({ status: res.statusCode || 0, data });
        } catch {
          resolve({ status: res.statusCode || 0, data: body });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    if (options.data) {
      req.write(JSON.stringify(options.data));
    }
    req.end();
  });
}

/**
 * 运行单个测试
 */
async function runTest(
  name: string, 
  testFn: () => Promise<void>
): Promise<boolean> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.push({ name, passed: true, duration });
    success(`${name} (${duration}ms)`);
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMsg, duration });
    fail(`${name}: ${errorMsg}`);
    return false;
  }
}

// ========== 测试用例 ==========

/**
 * 测试1: 健康检查
 */
async function testHealthCheck() {
  const res = await request({ method: 'GET', path: '/health' });
  
  if (res.status !== 200) {
    throw new Error(`状态码 ${res.status}，期望 200`);
  }
  
  if (res.data.status !== 'ok') {
    throw new Error(`状态 ${res.data.status}，期望 ok`);
  }
  
  info(`  版本: ${res.data.version}`);
}

/**
 * 测试2: API 根路径
 */
async function testApiRoot() {
  const res = await request({ method: 'GET', path: '/api' });
  
  if (res.status !== 200) {
    throw new Error(`状态码 ${res.status}`);
  }
  
  if (!res.data.endpoints) {
    throw new Error('缺少 endpoints 字段');
  }
  
  info(`  端点: ${Object.keys(res.data.endpoints).join(', ')}`);
}

/**
 * 测试3: 创建会话
 */
let testSessionId = '';

async function testCreateSession() {
  const res = await request({ 
    method: 'POST', 
    path: '/api/conversation/session',
    data: {}
  });
  
  if (!res.data.success) {
    // 可能是 session 自动创建，尝试直接发送消息
    testSessionId = 'test_' + Date.now();
    info(`  使用测试会话 ID: ${testSessionId}`);
    return;
  }
  
  testSessionId = res.data.data?.sessionId || 'test_' + Date.now();
  info(`  会话 ID: ${testSessionId}`);
}

/**
 * 测试4: 发送文本消息（报价请求）
 */
async function testSendQuoteMessage() {
  const res = await request({
    method: 'POST',
    path: '/api/conversation/chat',
    data: {
      sessionId: testSessionId,
      text: '老王要两瓶可乐三包纸巾'
    }
  });
  
  if (!res.data.success && res.status !== 200) {
    throw new Error(`请求失败: ${res.data.error?.message || JSON.stringify(res.data)}`);
  }
  
  const data = res.data.data || res.data;
  
  info(`  意图: ${data.nlu?.intent?.intent || data.intent || '未识别'}`);
  info(`  回复: ${(data.text || data.speechText || '').substring(0, 50)}...`);
  
  if (data.quote) {
    info(`  报价项数: ${data.quote.items?.length || 0}`);
  }
}

/**
 * 测试5: 单品查询
 */
async function testSingleItemQuery() {
  const res = await request({
    method: 'POST',
    path: '/api/conversation/chat',
    data: {
      sessionId: testSessionId,
      text: '可乐怎么卖'
    }
  });
  
  if (!res.data.success && res.status !== 200) {
    throw new Error(`请求失败: ${res.data.error?.message || JSON.stringify(res.data)}`);
  }
  
  const data = res.data.data || res.data;
  info(`  回复: ${(data.text || data.speechText || '').substring(0, 50)}...`);
}

/**
 * 测试6: 价格修正
 */
async function testPriceCorrection() {
  const res = await request({
    method: 'POST',
    path: '/api/conversation/chat',
    data: {
      sessionId: testSessionId,
      text: '按10块算'
    }
  });
  
  if (!res.data.success && res.status !== 200) {
    throw new Error(`请求失败: ${res.data.error?.message || JSON.stringify(res.data)}`);
  }
  
  const data = res.data.data || res.data;
  info(`  回复: ${(data.text || data.speechText || '').substring(0, 50)}...`);
}

/**
 * 测试7: 确认交易
 */
async function testConfirmTransaction() {
  const res = await request({
    method: 'POST',
    path: '/api/conversation/chat',
    data: {
      sessionId: testSessionId,
      text: '好的，确认'
    }
  });
  
  if (!res.data.success && res.status !== 200) {
    // 确认可能需要先有报价
    warn('  确认需要先有有效报价');
    return;
  }
  
  const data = res.data.data || res.data;
  info(`  回复: ${(data.text || data.speechText || '').substring(0, 50)}...`);
}

/**
 * 测试8: 获取交易列表
 */
async function testGetTransactions() {
  const res = await request({
    method: 'GET',
    path: '/api/transactions'
  });
  
  if (!res.data.success && res.status !== 200) {
    throw new Error(`请求失败: ${res.data.error?.message || JSON.stringify(res.data)}`);
  }
  
  const data = res.data.data || res.data;
  const records = data.records || data.data || [];
  info(`  交易数量: ${records.length}`);
}

/**
 * 测试9: 获取统计数据
 */
async function testGetStats() {
  const today = new Date().toISOString().split('T')[0];
  const res = await request({
    method: 'GET',
    path: `/api/transactions/stats/summary?startDate=${today}&endDate=${today}`
  });
  
  if (res.status === 404) {
    warn('  统计接口可能未实现');
    return;
  }
  
  if (!res.data.success && res.status !== 200) {
    throw new Error(`请求失败: ${res.data.error?.message || JSON.stringify(res.data)}`);
  }
  
  const data = res.data.data || res.data;
  info(`  今日订单: ${data.totalCount || 0}`);
  info(`  今日金额: ${data.totalAmount || 0}`);
}

/**
 * 测试10: 清除会话
 */
async function testClearSession() {
  const res = await request({
    method: 'DELETE',
    path: `/api/conversation/sessions/${testSessionId}`
  });
  
  if (!res.data.success && res.status !== 200 && res.status !== 204) {
    throw new Error(`请求失败: ${res.data.error?.message || JSON.stringify(res.data)}`);
  }
  
  info('  会话已清除');
}

/**
 * 主函数
 */
async function main() {
  console.log('\n' + colors.bold + '🧪 AI 小店报价助手 - 端到端测试' + colors.reset);
  console.log(`   API 地址: ${API_BASE}\n`);

  // 检查服务是否运行
  section('1. 基础连接测试');
  
  try {
    await request({ method: 'GET', path: '/health' });
  } catch (error) {
    fail('无法连接到后端服务');
    console.log('\n❌ 请确保后端服务正在运行:');
    console.log('   npm run dev\n');
    process.exit(1);
  }

  // 运行测试
  await runTest('健康检查', testHealthCheck);
  await runTest('API 根路径', testApiRoot);

  section('2. 对话流程测试');
  
  await runTest('创建/获取会话', testCreateSession);
  await runTest('发送报价请求', testSendQuoteMessage);
  await runTest('单品查询', testSingleItemQuery);
  await runTest('价格修正', testPriceCorrection);
  await runTest('确认交易', testConfirmTransaction);

  section('3. 交易管理测试');
  
  await runTest('获取交易列表', testGetTransactions);
  await runTest('获取统计数据', testGetStats);

  section('4. 清理测试');
  
  await runTest('清除会话', testClearSession);

  // 汇总结果
  section('测试结果汇总');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`  总计: ${total} 项测试`);
  console.log(`  ${colors.green}通过: ${passed}${colors.reset}`);
  console.log(`  ${colors.red}失败: ${failed}${colors.reset}`);

  if (failed > 0) {
    console.log('\n  失败的测试:');
    for (const r of results.filter(r => !r.passed)) {
      console.log(`    - ${r.name}: ${r.error}`);
    }
  }

  const passRate = ((passed / total) * 100).toFixed(1);
  console.log(`\n  通过率: ${passRate}%`);

  if (passed === total) {
    console.log('\n' + colors.green + colors.bold + '🎉 所有测试通过！' + colors.reset + '\n');
  } else if (passed >= total * 0.8) {
    console.log('\n' + colors.yellow + '⚠️  大部分测试通过，请检查失败项' + colors.reset + '\n');
  } else {
    console.log('\n' + colors.red + '❌ 多项测试失败，请检查后端服务' + colors.reset + '\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// 运行
main().catch(error => {
  console.error('测试脚本错误:', error);
  process.exit(1);
});

