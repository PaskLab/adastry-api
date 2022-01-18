import { EntityRepository, Repository } from 'typeorm';
import { Asset } from '../entities/asset.entity';

@EntityRepository(Asset)
export class AssetRepository extends Repository<Asset> {
  async exist(hexId: string): Promise<boolean> {
    const count = await this.createQueryBuilder('asset')
      .where('asset.hexId = :hexId', { hexId: hexId })
      .getCount();

    return count > 0;
  }
}
