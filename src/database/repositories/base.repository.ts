import { Repository, DeepPartial, FindManyOptions, FindOneOptions, SaveOptions } from 'typeorm';

export abstract class BaseRepository<T> {
  protected repository: Repository<T>;

  constructor(repository: Repository<T>) {
    this.repository = repository;
  }

  async find(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options);
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne(options);
  }

  async findById(id: number | string): Promise<T | null> {
    return this.repository.findOne({ where: { id } as any });
  }

  async create(data: DeepPartial<T>, options?: SaveOptions): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity, options);
  }

  async update(id: number | string, data: DeepPartial<T>, options?: SaveOptions): Promise<T | null> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async delete(id: number | string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  async save(entity: T, options?: SaveOptions): Promise<T> {
    return this.repository.save(entity, options);
  }

  async count(options?: FindManyOptions<T>): Promise<number> {
    return this.repository.count(options);
  }

  getRepository(): Repository<T> {
    return this.repository;
  }
}