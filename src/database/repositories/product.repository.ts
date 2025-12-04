import { Product } from '../models/product';
import { BaseRepository } from './base.repository';
import { getRepository } from 'typeorm';

export class ProductRepository extends BaseRepository<Product> {
  constructor() {
    super(getRepository(Product));
  }

  async findByName(name: string): Promise<Product | null> {
    return this.repository.findOne({ where: { name } });
  }

  async findByAlias(alias: string): Promise<Product | null> {
    return this.repository
      .createQueryBuilder('product')
      .where(':alias = ANY(product.aliases)', { alias })
      .getOne();
  }

  async findByCategory(category: string): Promise<Product[]> {
    return this.repository.find({ where: { category, isActive: true } });
  }

  async searchByNameOrAlias(searchTerm: string): Promise<Product[]> {
    return this.repository
      .createQueryBuilder('product')
      .where('product.name LIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orWhere(':searchTerm = ANY(product.aliases)', { searchTerm })
      .getMany();
  }
}