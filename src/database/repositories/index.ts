import { ProductRepository } from './product.repository';
import { PartnerRepository } from './partner.repository';

class RepositoryManager {
  private productRepository: ProductRepository;
  private partnerRepository: PartnerRepository;

  constructor() {
    this.productRepository = new ProductRepository();
    this.partnerRepository = new PartnerRepository();
  }

  getProductRepository(): ProductRepository {
    return this.productRepository;
  }

  getPartnerRepository(): PartnerRepository {
    return this.partnerRepository;
  }
}

export const repositoryManager = new RepositoryManager();