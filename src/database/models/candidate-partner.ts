import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('candidate_partners')
export class CandidatePartner {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255, comment: '顾客候选称呼' })
  name!: string;

  @Column({ type: 'int', default: 1, comment: '出现次数' })
  frequency!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: '消费总额' })
  totalAmount!: number;

  @Column({ type: 'int', default: 1, comment: '来访频次' })
  visitCount!: number;

  @Column({ type: 'json', comment: '关联的交易 ID 列表' })
  transactionIds!: number[];

  @Column({ type: 'boolean', default: false, comment: '是否已确认' })
  confirmed!: boolean;

  @Column({ type: 'bigint', nullable: true, comment: '关联的正式顾客 ID（确认后设置）' })
  partnerId!: number;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt!: Date;
}
