#!/usr/bin/env ts-node
/**
 * 语音功能测试脚本
 * 
 * 测试内容：
 * 1. TTS 语音合成
 * 2. ASR 语音识别（如果有音频文件）
 * 3. 完整语音处理流程
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

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

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

/**
 * HTTP 请求封装
 */
function request(endpoint: string, data: any, timeout = 60000): Promise<{ data: any; duration: number }> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const url = new URL(API_BASE + endpoint);

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
 * 测试 TTS 语音合成
 */
async function testTTS() {
  console.log('\n' + colors.bold + '📢 测试 TTS 语音合成' + colors.reset);
  console.log('─'.repeat(50));

  const testTexts = [
    '您好，欢迎光临小店',
    '可乐3块，纸巾4块，一共7块',
    '张三，两瓶可乐6块，确认吗？',
    '好的，已记录'
  ];

  for (const text of testTexts) {
    process.stdout.write(`   测试: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"... `);
    
    try {
      const { data, duration } = await request('/api/voice/tts', {
        text,
        speaker: 'default',
        speed: 1.0,
        format: 'wav'
      });

      if (data.success && data.data?.audio?.buffer) {
        const audioSize = data.data.audio.buffer.length;
        console.log(colors.green + `✓ ${duration}ms (${audioSize} bytes)` + colors.reset);
        
        results.push({
          name: `TTS: ${text.substring(0, 20)}`,
          passed: true,
          duration,
          details: `音频大小: ${audioSize} bytes`
        });

        // 可选：保存第一个音频文件用于验证
        if (testTexts.indexOf(text) === 0) {
          try {
            const outputDir = path.join(__dirname, '../test-output');
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
            const audioBuffer = Buffer.from(data.data.audio.buffer, 'base64');
            const outputFile = path.join(outputDir, 'tts-test.wav');
            fs.writeFileSync(outputFile, audioBuffer);
            console.log(`   ${colors.blue}已保存到: ${outputFile}${colors.reset}`);
          } catch (e) {
            // 忽略保存错误
          }
        }
      } else {
        console.log(colors.red + `✗ ${data.error?.message || '无音频数据'}` + colors.reset);
        results.push({
          name: `TTS: ${text.substring(0, 20)}`,
          passed: false,
          duration,
          error: data.error?.message
        });
      }
    } catch (error) {
      console.log(colors.red + `✗ ${error}` + colors.reset);
      results.push({
        name: `TTS: ${text.substring(0, 20)}`,
        passed: false,
        duration: 0,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

/**
 * 测试 ASR 语音识别
 */
async function testASR() {
  console.log('\n' + colors.bold + '🎤 测试 ASR 语音识别' + colors.reset);
  console.log('─'.repeat(50));

  // 检查是否有测试音频文件
  const testAudioDir = path.join(__dirname, '../test-audio');
  const testOutputDir = path.join(__dirname, '../test-output');

  // 如果有 TTS 生成的音频，可以用来测试 ASR
  const ttsTestFile = path.join(testOutputDir, 'tts-test.wav');
  
  if (fs.existsSync(ttsTestFile)) {
    process.stdout.write(`   测试: TTS 生成的音频... `);
    
    try {
      const audioBuffer = fs.readFileSync(ttsTestFile);
      const audioBase64 = audioBuffer.toString('base64');

      const { data, duration } = await request('/api/voice/recognize', {
        audio: audioBase64,
        language: 'zh-CN',
        hotwords: ['可乐', '纸巾', '矿泉水', '张三', '老王']
      });

      if (data.success && data.data?.result?.text) {
        const text = data.data.result.text;
        const confidence = data.data.result.confidence;
        console.log(colors.green + `✓ "${text}" (置信度: ${confidence?.toFixed(2) || 'N/A'}, ${duration}ms)` + colors.reset);
        
        results.push({
          name: 'ASR: TTS 生成音频',
          passed: true,
          duration,
          details: `识别结果: ${text}`
        });
      } else {
        console.log(colors.yellow + `⚠ ${data.error?.message || '无识别结果'}` + colors.reset);
        results.push({
          name: 'ASR: TTS 生成音频',
          passed: false,
          duration,
          error: data.error?.message || '无识别结果'
        });
      }
    } catch (error) {
      console.log(colors.red + `✗ ${error}` + colors.reset);
      results.push({
        name: 'ASR: TTS 生成音频',
        passed: false,
        duration: 0,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    console.log(colors.yellow + `   ⚠ 未找到测试音频文件，跳过 ASR 测试` + colors.reset);
    console.log(`   提示: 可以将音频文件放入 ${testAudioDir} 目录进行测试`);
  }
}

/**
 * 测试完整语音流程
 */
async function testVoiceProcess() {
  console.log('\n' + colors.bold + '🔄 测试完整语音流程' + colors.reset);
  console.log('─'.repeat(50));

  // 需要有测试音频才能进行完整流程测试
  const testOutputDir = path.join(__dirname, '../test-output');
  const ttsTestFile = path.join(testOutputDir, 'tts-test.wav');
  
  if (!fs.existsSync(ttsTestFile)) {
    console.log(colors.yellow + `   ⚠ 未找到测试音频，跳过完整流程测试` + colors.reset);
    return;
  }

  process.stdout.write(`   测试: 完整语音处理流程... `);
  
  try {
    const audioBuffer = fs.readFileSync(ttsTestFile);
    const audioBase64 = audioBuffer.toString('base64');

    const { data, duration } = await request('/api/voice/process', {
      sessionId: `voice_test_${Date.now()}`,
      audioData: audioBase64,
      audioFormat: 'wav'
    });

    if (data.success) {
      const recognizedText = data.data?.recognizedText || '';
      const responseText = data.data?.response?.text || '';
      const hasAudio = !!data.data?.response?.audioData;
      
      console.log(colors.green + `✓ ${duration}ms` + colors.reset);
      console.log(`   ${colors.blue}识别: "${recognizedText}"${colors.reset}`);
      console.log(`   ${colors.blue}回复: "${responseText}"${colors.reset}`);
      console.log(`   ${colors.blue}回复音频: ${hasAudio ? '有' : '无'}${colors.reset}`);
      
      results.push({
        name: '完整语音流程',
        passed: true,
        duration,
        details: `识别: ${recognizedText}, 回复: ${responseText}`
      });
    } else {
      console.log(colors.red + `✗ ${data.error?.message}` + colors.reset);
      results.push({
        name: '完整语音流程',
        passed: false,
        duration,
        error: data.error?.message
      });
    }
  } catch (error) {
    console.log(colors.red + `✗ ${error}` + colors.reset);
    results.push({
      name: '完整语音流程',
      passed: false,
      duration: 0,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * 打印测试报告
 */
function printReport() {
  console.log('\n' + colors.bold + colors.cyan + '═'.repeat(60));
  console.log('                     语音功能测试报告');
  console.log('═'.repeat(60) + colors.reset + '\n');

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  
  console.log(`  总测试: ${total}`);
  console.log(`  ${colors.green}通过: ${passed}${colors.reset}`);
  console.log(`  ${colors.red}失败: ${total - passed}${colors.reset}`);
  console.log(`  通过率: ${(passed / total * 100).toFixed(1)}%`);

  if (results.filter(r => !r.passed).length > 0) {
    console.log('\n  ❌ 失败用例:');
    for (const r of results.filter(r => !r.passed)) {
      console.log(`     - ${r.name}: ${r.error}`);
    }
  }

  console.log('\n');
}

/**
 * 主函数
 */
async function main() {
  console.log('\n' + colors.bold + '🎵 语音功能测试' + colors.reset);
  console.log(`   API 地址: ${API_BASE}\n`);

  // 检查服务连接
  try {
    await request('/api/conversation/chat', { sessionId: 'test', text: 'test' }, 5000);
    console.log(colors.green + '   ✓ 服务连接正常' + colors.reset);
  } catch {
    console.log(colors.red + '   ✗ 无法连接服务，请先启动: npm run dev' + colors.reset + '\n');
    process.exit(1);
  }

  // 运行测试
  await testTTS();
  await testASR();
  await testVoiceProcess();

  // 打印报告
  printReport();
}

// 运行
main().catch(console.error);

