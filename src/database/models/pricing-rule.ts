import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pricing_rules')
export class PricingRule {
  @PrimaryGeneratedColumn('bigint')
  id: number;

  @Column({ type: 'enum', enum: ['global', 'category', 'level', 'special'], comment: '全店/global、类别/category、顾客类型/level、专用/special' })
  scopeType: 'global' | 'category' | 'level' | 'special';

  @Column({ length: 255, comment: '具体作用对象（如"饮料""熟客""张三+可乐"）' })
  scopeValue: string;

  @Column({ length: 255, comment: '表达式（如 `cost * 1.2` 或 `3.0` 固定价）' })
  formula: string;

  @Column({ length: 50, nullable: true, comment: '抹零规则（如"floor_to_1_yuan"）' })
  rounding: string;

  @Column({ type: 'int', default: 0, comment: '优先级，数字越大越优先' })
  priority: number;

  @Column({ default: true, comment: '是否启用' })
  enabled: boolean;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}