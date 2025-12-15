/**
 * 数据库初始化脚本
 * 创建表结构并插入示例数据
 * 
 * 运行方式: npx ts-node scripts/init-database.ts
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';

// 数据库连接配置
const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'auto_quote_system',
  logging: true
});

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
 * 创建表结构
 */
async function createTables(queryRunner: any): Promise<void> {
  info('创建数据表...');

  // Products 表
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS products (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL COMMENT '正式商品名称',
      aliases JSON COMMENT '商品别名列表',
      barcode VARCHAR(50) COMMENT '条码',
      category VARCHAR(50) NOT NULL COMMENT '商品类别',
      unit VARCHAR(20) NOT NULL COMMENT '单位',
      baseCost DECIMAL(10,2) COMMENT '进货成本',
      isActive BOOLEAN DEFAULT TRUE COMMENT '是否启用',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_name (name),
      INDEX idx_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  success('创建 products 表');

  // Partners 表
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS partners (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL COMMENT '称呼',
      type ENUM('customer', 'supplier') NOT NULL DEFAULT 'customer' COMMENT '类型',
      level ENUM('normal', 'regular_customer', 'small_business', 'big_customer') DEFAULT 'normal' COMMENT '客户等级',
      note TEXT COMMENT '备注',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_name (name),
      INDEX idx_type (type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  success('创建 partners 表');

  // Pricing Rules 表
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS pricing_rules (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      scopeType ENUM('global', 'category', 'level', 'special') NOT NULL COMMENT '作用域类型',
      scopeValue VARCHAR(255) NOT NULL COMMENT '作用域值',
      formula VARCHAR(255) NOT NULL COMMENT '定价公式',
      rounding ENUM('none', 'floor_to_1', 'ceil_to_1', 'round_to_1', 'round_to_0.5', 'floor_to_0.5') DEFAULT 'round_to_1' COMMENT '取整策略',
      priority INT DEFAULT 0 COMMENT '优先级',
      enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
      productId BIGINT COMMENT '商品ID',
      partnerId BIGINT COMMENT '客户ID',
      productCategory VARCHAR(50) COMMENT '商品分类',
      partnerLevel VARCHAR(50) COMMENT '客户等级',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_scope (scopeType, scopeValue),
      INDEX idx_priority (priority DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  success('创建 pricing_rules 表');

  // Transactions 表
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      partnerId BIGINT COMMENT '客户ID',
      timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '交易时间',
      itemsJson JSON NOT NULL COMMENT '商品详情JSON',
      totalPrice DECIMAL(10,2) NOT NULL COMMENT '总售价',
      totalCost DECIMAL(10,2) COMMENT '总成本',
      rawText TEXT COMMENT '原始语音文本',
      intent VARCHAR(50) COMMENT '识别意图',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_partner (partnerId),
      INDEX idx_timestamp (timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  success('创建 transactions 表');

  // Candidate Products 表
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS candidate_products (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL COMMENT '商品名称',
      aliasesCluster JSON COMMENT '别名聚类',
      estimatedCost DECIMAL(10,2) COMMENT '估算成本',
      frequency INT DEFAULT 1 COMMENT '出现次数',
      confirmed BOOLEAN DEFAULT FALSE COMMENT '是否已确认',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_name (name),
      INDEX idx_confirmed (confirmed)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  success('创建 candidate_products 表');

  // Candidate Partners 表
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS candidate_partners (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL COMMENT '顾客称呼',
      frequency INT DEFAULT 1 COMMENT '出现次数',
      confirmed BOOLEAN DEFAULT FALSE COMMENT '是否已确认',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_name (name),
      INDEX idx_confirmed (confirmed)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  success('创建 candidate_partners 表');
}

/**
 * 插入示例数据
 */
async function insertSampleData(queryRunner: any): Promise<void> {
  info('插入示例数据...');

  // 示例商品
  const products = [
    { name: '可乐', aliases: ['可口可乐', '百事可乐', '肥宅快乐水'], category: '饮料', unit: '瓶', baseCost: 2.5 },
    { name: '雪碧', aliases: ['雪碧柠檬味'], category: '饮料', unit: '瓶', baseCost: 2.5 },
    { name: '芬达', aliases: ['芬达橙味'], category: '饮料', unit: '瓶', baseCost: 2.5 },
    { name: '农夫山泉', aliases: ['矿泉水', '农夫山泉矿泉水'], category: '饮料', unit: '瓶', baseCost: 1.0 },
    { name: '纸巾', aliases: ['抽纸', '面巾纸'], category: '日用品', unit: '包', baseCost: 3.0 },
    { name: '心相印', aliases: ['心相印纸巾'], category: '日用品', unit: '包', baseCost: 4.5 },
    { name: '蓝月亮', aliases: ['蓝月亮洗衣液'], category: '日用品', unit: '瓶', baseCost: 15.0 },
    { name: '方便面', aliases: ['泡面', '康师傅', '统一方便面'], category: '食品', unit: '包', baseCost: 2.0 },
  ];

  for (const p of products) {
    await queryRunner.query(`
      INSERT INTO products (name, aliases, category, unit, baseCost, isActive)
      VALUES (?, ?, ?, ?, ?, TRUE)
      ON DUPLICATE KEY UPDATE updatedAt = NOW()
    `, [p.name, JSON.stringify(p.aliases), p.category, p.unit, p.baseCost]);
  }
  success(`插入 ${products.length} 个示例商品`);

  // 示例客户
  const partners = [
    { name: '张三', type: 'customer', level: 'regular_customer', note: '常客' },
    { name: '老李', type: 'supplier', level: 'normal', note: '供货商' },
    { name: '王阿姨', type: 'customer', level: 'normal', note: '楼上邻居' },
    { name: '隔壁小卖部', type: 'customer', level: 'small_business', note: '批发客户' },
    { name: '大刘', type: 'customer', level: 'big_customer', note: '大客户' },
  ];

  for (const p of partners) {
    await queryRunner.query(`
      INSERT INTO partners (name, type, level, note)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE updatedAt = NOW()
    `, [p.name, p.type, p.level, p.note]);
  }
  success(`插入 ${partners.length} 个示例客户`);

  // 默认定价规则
  const rules = [
    { scopeType: 'global', scopeValue: '*', formula: 'cost * 1.2', rounding: 'round_to_1', priority: 0 },
    { scopeType: 'category', scopeValue: '饮料', formula: 'cost * 1.2', rounding: 'round_to_0.5', priority: 10 },
    { scopeType: 'category', scopeValue: '日用品', formula: 'cost * 1.25', rounding: 'round_to_1', priority: 10 },
    { scopeType: 'category', scopeValue: '食品', formula: 'cost * 1.3', rounding: 'round_to_1', priority: 10 },
    { scopeType: 'level', scopeValue: 'regular_customer', formula: 'price * 0.95', rounding: 'floor_to_0.5', priority: 20 },
    { scopeType: 'level', scopeValue: 'big_customer', formula: 'price * 0.9', rounding: 'floor_to_1', priority: 20 },
  ];

  for (const r of rules) {
    await queryRunner.query(`
      INSERT INTO pricing_rules (scopeType, scopeValue, formula, rounding, priority, enabled)
      VALUES (?, ?, ?, ?, ?, TRUE)
      ON DUPLICATE KEY UPDATE updatedAt = NOW()
    `, [r.scopeType, r.scopeValue, r.formula, r.rounding, r.priority]);
  }
  success(`插入 ${rules.length} 条定价规则`);
}

/**
 * 主函数
 */
async function main() {
  console.log('\n' + '='.repeat(50));
  console.log('       AI 小店报价助手 - 数据库初始化');
  console.log('='.repeat(50) + '\n');

  info(`连接数据库: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}/${process.env.DB_DATABASE || 'auto_quote_system'}`);

  try {
    await dataSource.initialize();
    success('数据库连接成功');

    const queryRunner = dataSource.createQueryRunner();

    await createTables(queryRunner);
    await insertSampleData(queryRunner);

    await queryRunner.release();
    await dataSource.destroy();

    console.log('\n' + '='.repeat(50));
    success('数据库初始化完成！');
    console.log('='.repeat(50) + '\n');

    info('示例数据已插入，你可以开始测试了：');
    info('  npx ts-node scripts/verify-modules.ts');
    console.log('');

  } catch (error) {
    fail(`数据库初始化失败: ${error}`);
    console.error(error);
    process.exit(1);
  }
}

// 运行
main();

