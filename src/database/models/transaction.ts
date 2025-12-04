import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Partner } from './partner';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('bigint')
  id: number;

  @Column({ type: 'bigint', nullable: true, comment: '顾客/供货商 ID（可为空，若无法匹配）' })
  partnerId: number;

  @ManyToOne(() => Partner, { nullable: true })
  @JoinColumn({ name: 'partnerId' })
  partner: Partner;

  @Column({ type: 'datetime', comment: '交易时间' })
  timestamp: Date;

  @Column({ type: 'json', comment: '[{product_name, qty, unit, price}]' })
  itemsJson: any[];

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '实际成交总价' })
  totalPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '系统估计成本总价（有成本数据时）' })
  totalCost: number;

  @Column({ type: 'text', comment: '原始语音识别文本' })
  rawText: string;

  @Column({ length: 50, comment: '本次识别意图' })
  intent: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;
}