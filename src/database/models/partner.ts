import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('partners')
export class Partner {
  @PrimaryGeneratedColumn('bigint')
  id: number;

  @Column({ length: 255, comment: '称呼（张三/老李/隔壁小卖部等）' })
  name: string;

  @Column({ type: 'enum', enum: ['customer', 'supplier'], comment: 'customer/supplier' })
  type: 'customer' | 'supplier';

  @Column({ type: 'enum', enum: ['normal', 'regular', 'small_business', 'big_customer'], nullable: true, comment: '普通顾客/熟客/小商户/大客户' })
  level: 'normal' | 'regular' | 'small_business' | 'big_customer' | null;

  @Column({ length: 500, nullable: true, comment: '备注（如"楼上理发店"）' })
  note: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}