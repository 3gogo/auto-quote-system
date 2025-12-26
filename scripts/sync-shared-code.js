#!/usr/bin/env node
/**
 * 同步共享代码到小程序
 * 
 * 由于微信小程序不支持直接引入外部 node_modules，
 * 此脚本将共享代码复制到小程序的 utils 目录
 * 
 * 使用方法：
 *   node scripts/sync-shared-code.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// 源文件和目标文件映射
const filesToSync = [
  {
    from: 'client/shared/api/api.min.js',
    to: 'miniprogram/miniprogram/utils/shared-api-core.js'
  },
  {
    from: 'client/shared/utils/util.min.js',
    to: 'miniprogram/miniprogram/utils/shared-util-core.js'
  }
];

console.log('🔄 开始同步共享代码到小程序...\n');

let successCount = 0;
let errorCount = 0;

for (const file of filesToSync) {
  const fromPath = path.join(ROOT, file.from);
  const toPath = path.join(ROOT, file.to);
  
  try {
    // 检查源文件是否存在
    if (!fs.existsSync(fromPath)) {
      console.log(`⚠️  跳过：${file.from}（文件不存在）`);
      continue;
    }
    
    // 确保目标目录存在
    const toDir = path.dirname(toPath);
    if (!fs.existsSync(toDir)) {
      fs.mkdirSync(toDir, { recursive: true });
    }
    
    // 读取源文件
    let content = fs.readFileSync(fromPath, 'utf-8');
    
    // 添加同步标记
    const header = `/**
 * ⚠️ 此文件由构建脚本自动生成，请勿手动编辑
 * 源文件: ${file.from}
 * 同步时间: ${new Date().toISOString()}
 * 
 * 如需修改，请编辑源文件后运行: node scripts/sync-shared-code.js
 */

`;
    content = header + content;
    
    // 写入目标文件
    fs.writeFileSync(toPath, content);
    
    console.log(`✅ ${file.from} → ${file.to}`);
    successCount++;
    
  } catch (err) {
    console.error(`❌ 同步失败: ${file.from}`);
    console.error(`   错误: ${err.message}`);
    errorCount++;
  }
}

console.log('\n📊 同步完成');
console.log(`   成功: ${successCount}`);
console.log(`   失败: ${errorCount}`);

if (errorCount > 0) {
  process.exit(1);
}

