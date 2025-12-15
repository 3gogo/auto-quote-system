import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建 products 表
    await queryRunner.createTable(
      new Table({
        name: 'products',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            comment: '正式商品名称',
          },
          {
            name: 'aliases',
            type: 'json',
            isNullable: true,
            comment: '商品别名列表',
          },
          {
            name: 'barcode',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '条码（可选）',
          },
          {
            name: 'category',
            type: 'varchar',
            length: '50',
            comment: '商品类别（饮料/纸品等）',
          },
          {
            name: 'unit',
            type: 'varchar',
            length: '20',
            comment: '单位（瓶/包/箱等）',
          },
          {
            name: 'baseCost',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
            comment: '标准进货成本（可为空）',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
            comment: '是否启用/在售',
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            comment: '创建时间',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
            comment: '更新时间',
          },
        ],
      }),
      true
    );

    // 创建 partners 表
    await queryRunner.createTable(
      new Table({
        name: 'partners',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            comment: '称呼（张三/老李/隔壁小卖部等）',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['customer', 'supplier'],
            comment: 'customer/supplier',
          },
          {
            name: 'level',
            type: 'enum',
            enum: ['normal', 'regular', 'small_business', 'big_customer'],
            isNullable: true,
            comment: '普通顾客/熟客/小商户/大客户',
          },
          {
            name: 'note',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: '备注（如"楼上理发店"）',
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            comment: '创建时间',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
            comment: '更新时间',
          },
        ],
      }),
      true
    );

    // 创建 pricing_rules 表
    await queryRunner.createTable(
      new Table({
        name: 'pricing_rules',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'scopeType',
            type: 'enum',
            enum: ['global', 'category', 'level', 'special'],
            comment: '全店/global、类别/category、顾客类型/level、专用/special',
          },
          {
            name: 'scopeValue',
            type: 'varchar',
            length: '255',
            comment: '具体作用对象（如"饮料""熟客""张三+可乐"）',
          },
          {
            name: 'formula',
            type: 'varchar',
            length: '255',
            comment: '表达式（如 `cost * 1.2` 或 `3.0` 固定价）',
          },
          {
            name: 'rounding',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '抹零规则（如"floor_to_1_yuan"）',
          },
          {
            name: 'priority',
            type: 'int',
            default: 0,
            comment: '优先级，数字越大越优先',
          },
          {
            name: 'enabled',
            type: 'boolean',
            default: true,
            comment: '是否启用',
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            comment: '创建时间',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
            comment: '更新时间',
          },
        ],
      }),
      true
    );

    // 创建 transactions 表
    await queryRunner.createTable(
      new Table({
        name: 'transactions',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'partnerId',
            type: 'bigint',
            isNullable: true,
            comment: '顾客/供货商 ID（可为空，若无法匹配）',
          },
          {
            name: 'timestamp',
            type: 'datetime',
            comment: '交易时间',
          },
          {
            name: 'itemsJson',
            type: 'json',
            comment: '[{product_name, qty, unit, price}]',
          },
          {
            name: 'totalPrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
            comment: '实际成交总价',
          },
          {
            name: 'totalCost',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
            comment: '系统估计成本总价（有成本数据时）',
          },
          {
            name: 'rawText',
            type: 'text',
            comment: '原始语音识别文本',
          },
          {
            name: 'intent',
            type: 'varchar',
            length: '50',
            comment: '本次识别意图',
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            comment: '创建时间',
          },
        ],
      }),
      true
    );

    // 创建 candidate_products 表
    await queryRunner.createTable(
      new Table({
        name: 'candidate_products',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            comment: '商品候选名称',
          },
          {
            name: 'frequency',
            type: 'int',
            default: 1,
            comment: '出现次数',
          },
          {
            name: 'priceDistribution',
            type: 'json',
            comment: '价格分布',
          },
          {
            name: 'aliasesCluster',
            type: 'json',
            comment: '别名聚类',
          },
          {
            name: 'confirmed',
            type: 'boolean',
            default: false,
            comment: '是否已确认',
          },
          {
            name: 'productId',
            type: 'bigint',
            isNullable: true,
            comment: '关联的正式商品 ID（确认后设置）',
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            comment: '创建时间',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
            comment: '更新时间',
          },
        ],
      }),
      true
    );

    // 创建 candidate_partners 表
    await queryRunner.createTable(
      new Table({
        name: 'candidate_partners',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            comment: '顾客候选称呼',
          },
          {
            name: 'frequency',
            type: 'int',
            default: 1,
            comment: '出现次数',
          },
          {
            name: 'totalAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            comment: '消费总额',
          },
          {
            name: 'visitCount',
            type: 'int',
            default: 1,
            comment: '来访频次',
          },
          {
            name: 'transactionIds',
            type: 'json',
            comment: '关联的交易 ID 列表',
          },
          {
            name: 'confirmed',
            type: 'boolean',
            default: false,
            comment: '是否已确认',
          },
          {
            name: 'partnerId',
            type: 'bigint',
            isNullable: true,
            comment: '关联的正式顾客 ID（确认后设置）',
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            comment: '创建时间',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
            comment: '更新时间',
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('candidate_partners', true);
    await queryRunner.dropTable('candidate_products', true);
    await queryRunner.dropTable('transactions', true);
    await queryRunner.dropTable('pricing_rules', true);
    await queryRunner.dropTable('partners', true);
    await queryRunner.dropTable('products', true);
  }
}