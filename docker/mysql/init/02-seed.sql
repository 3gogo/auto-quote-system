-- ============================================
-- AI 小店报价助手 - 测试数据
-- ============================================

USE auto_quote_system;

-- 插入测试商品
INSERT INTO products (name, aliases, category, unit, base_cost) VALUES
('可乐', '["可口可乐", "百事可乐", "cola"]', '饮料', '瓶', 2.00),
('雪碧', '["sprite"]', '饮料', '瓶', 2.00),
('矿泉水', '["农夫山泉", "怡宝", "水"]', '饮料', '瓶', 1.00),
('纸巾', '["抽纸", "面巾纸"]', '日用品', '包', 3.00),
('方便面', '["泡面", "康师傅"]', '食品', '包', 2.50),
('火腿肠', '["肠", "双汇"]', '食品', '根', 1.00),
('啤酒', '["青岛啤酒", "雪花啤酒"]', '饮料', '瓶', 3.00),
('香烟', '["烟"]', '烟草', '包', 15.00);

-- 插入测试顾客
INSERT INTO partners (name, type, level, note) VALUES
('张三', 'customer', 'regular', '楼上理发店老板'),
('李四', 'customer', 'normal', NULL),
('老王', 'customer', 'regular', '隔壁五金店'),
('小明', 'customer', 'normal', '学生'),
('批发商刘', 'supplier', 'big_customer', '饮料批发');

-- 插入默认定价规则
INSERT INTO pricing_rules (scope_type, scope_value, formula, rounding, priority, enabled) VALUES
('global', '*', 'cost * 1.3', 'round_to_0.5', 0, TRUE),
('category', '饮料', 'cost * 1.5', 'floor_to_1', 10, TRUE),
('category', '日用品', 'cost * 1.4', 'round_to_1', 10, TRUE),
('level', 'regular', 'cost * 1.2', 'floor_to_1', 20, TRUE),
('level', 'big_customer', 'cost * 1.1', 'none', 25, TRUE);

