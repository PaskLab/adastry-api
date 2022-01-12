import { EntityRepository, Repository } from 'typeorm';
import { Asset } from '../entities/asset.entity';

@EntityRepository(Asset)
export class AssetRepository extends Repository<Asset> {}
