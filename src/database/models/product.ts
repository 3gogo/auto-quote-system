import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255, comment: '正式商品名称' })
  name!: string;

  @Column({ type: 'json', nullable: true, comment: '商品别名列表' })
  aliases!: string[];

  @Column({ length: 50, nullable: true, comment: '条码（可选）' })
  barcode!: string;

  @Column({ length: 50, comment: '商品类别（饮料/纸品等）' })
  category!: string;

  @Column({ length: 20, comment: '单位（瓶/包/箱等）' })
  unit!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '标准进货成本（可为空）' })
  baseCost!: number;

  @Column({ default: true, comment: '是否启用/在售' })
  isActive!: boolean;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt!: Date;
}
