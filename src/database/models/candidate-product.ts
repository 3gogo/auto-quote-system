import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('candidate_products')
export class CandidateProduct {
  @PrimaryGeneratedColumn('bigint')
  id: number;

  @Column({ length: 255, comment: '商品候选名称' })
  name: string;

  @Column({ type: 'int', default: 1, comment: '出现次数' })
  frequency: number;

  @Column({ type: 'json', comment: '价格分布' })
  priceDistribution: {
    min: number;
    max: number;
    avg: number;
    count: number;
  };

  @Column({ type: 'json', comment: '别名聚类' })
  aliasesCluster: string[];

  @Column({ type: 'boolean', default: false, comment: '是否已确认' })
  confirmed: boolean;

  @Column({ type: 'bigint', nullable: true, comment: '关联的正式商品 ID（确认后设置）' })
  productId: number;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}