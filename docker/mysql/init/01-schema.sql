-- ============================================
-- AI 小店报价助手 - 数据库初始化脚本
-- ============================================

-- 使用数据库
USE auto_quote_system;

-- 合作伙伴表（顾客/供应商）
CREATE TABLE IF NOT EXISTS partners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT '称呼（张三/老李/隔壁小卖部等）',
    type ENUM('customer', 'supplier') NOT NULL COMMENT 'customer/supplier',
    level ENUM('normal', 'regular', 'small_business', 'big_customer') DEFAULT NULL COMMENT '普通顾客/熟客/小商户/大客户',
    note VARCHAR(500) DEFAULT NULL COMMENT '备注（如"楼上理发店"）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_name (name),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='合作伙伴表';

-- 商品表
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT '正式商品名称',
    aliases JSON DEFAULT NULL COMMENT '商品别名列表',
    barcode VARCHAR(50) DEFAULT NULL COMMENT '条码（可选）',
    category VARCHAR(50) NOT NULL COMMENT '商品类别（饮料/纸品等）',
    unit VARCHAR(20) NOT NULL COMMENT '单位（瓶/包/箱等）',
    base_cost DECIMAL(10, 2) DEFAULT NULL COMMENT '标准进货成本（可为空）',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用/在售',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_name (name),
    INDEX idx_category (category),
    INDEX idx_barcode (barcode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品表';

-- 定价规则表
CREATE TABLE IF NOT EXISTS pricing_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scope_type ENUM('global', 'category', 'level', 'special') NOT NULL COMMENT '全店/global、类别/category、顾客类型/level、专用/special',
    scope_value VARCHAR(255) NOT NULL COMMENT '具体作用对象（如"饮料""熟客""张三+可乐"）',
    formula VARCHAR(255) NOT NULL COMMENT '表达式（如 `cost * 1.2` 或 `3.0` 固定价）',
    rounding VARCHAR(50) DEFAULT NULL COMMENT '抹零规则（如"floor_to_1_yuan"）',
    priority INT DEFAULT 0 COMMENT '优先级，数字越大越优先',
    enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_scope_type (scope_type),
    INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='定价规则表';

-- 交易记录表
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partner_id BIGINT DEFAULT NULL COMMENT '顾客/供货商 ID（可为空，若无法匹配）',
    timestamp DATETIME NOT NULL COMMENT '交易时间',
    items_json JSON NOT NULL COMMENT '[{product_name, qty, unit, price}]',
    total_price DECIMAL(10, 2) NOT NULL COMMENT '实际成交总价',
    total_cost DECIMAL(10, 2) DEFAULT NULL COMMENT '系统估计成本总价（有成本数据时）',
    raw_text TEXT NOT NULL COMMENT '原始语音识别文本',
    intent VARCHAR(50) NOT NULL COMMENT '本次识别意图',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_partner_id (partner_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交易记录表';

-- 候选商品表
CREATE TABLE IF NOT EXISTS candidate_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT '商品候选名称',
    frequency INT DEFAULT 1 COMMENT '出现次数',
    price_distribution JSON COMMENT '价格分布',
    aliases_cluster JSON COMMENT '别名聚类',
    confirmed BOOLEAN DEFAULT FALSE COMMENT '是否已确认',
    product_id BIGINT DEFAULT NULL COMMENT '关联的正式商品 ID（确认后设置）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_name (name),
    INDEX idx_confirmed (confirmed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='候选商品表';

-- 候选顾客表
CREATE TABLE IF NOT EXISTS candidate_partners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT '顾客候选称呼',
    frequency INT DEFAULT 1 COMMENT '出现次数',
    total_amount DECIMAL(10, 2) DEFAULT 0 COMMENT '消费总额',
    visit_count INT DEFAULT 1 COMMENT '来访频次',
    transaction_ids JSON COMMENT '关联的交易 ID 列表',
    confirmed BOOLEAN DEFAULT FALSE COMMENT '是否已确认',
    partner_id BIGINT DEFAULT NULL COMMENT '关联的正式顾客 ID（确认后设置）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_name (name),
    INDEX idx_confirmed (confirmed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='候选顾客表';

