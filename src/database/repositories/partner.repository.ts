import { Partner } from '../models/partner';
import { BaseRepository } from './base.repository';
import { getRepository } from 'typeorm';

export class PartnerRepository extends BaseRepository<Partner> {
  constructor() {
    super(getRepository(Partner));
  }

  async findByName(name: string): Promise<Partner | null> {
    return this.repository.findOne({ where: { name } });
  }

  async findByType(type: 'customer' | 'supplier'): Promise<Partner[]> {
    return this.repository.find({ where: { type } });
  }

  async findCustomers(): Promise<Partner[]> {
    return this.repository.find({ where: { type: 'customer' } });
  }

  async findSuppliers(): Promise<Partner[]> {
    return this.repository.find({ where: { type: 'supplier' } });
  }

  async searchByName(searchTerm: string): Promise<Partner[]> {
    return this.repository
      .createQueryBuilder('partner')
      .where('partner.name LIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .getMany();
  }
}