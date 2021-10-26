import { EntityRepository, Repository } from 'typeorm';
import { PoolUpdate } from '../entities/pool-update.entity';

@EntityRepository(PoolUpdate)
export class PoolUpdateRepository extends Repository<PoolUpdate> {
  async findLastUpdate(
    poolId: string,
    untilEpoch?: number,
  ): Promise<PoolUpdate | undefined> {
    const query = this.createQueryBuilder('update')
      .innerJoinAndSelect('update.pool', 'pool')
      .innerJoinAndSelect('update.epoch', 'epoch')
      .leftJoinAndSelect('update.owners', 'owners')
      .leftJoinAndSelect('owners.account', 'ownerAccount')
      .where('pool.poolId = :poolId')
      .orderBy('update.block', 'DESC')
      .limit(1)
      .setParameter('poolId', poolId);

    if (untilEpoch) {
      query
        .where('epoch.epoch <= :untilEpoch')
        .setParameter('untilEpoch', untilEpoch);
    }

    return query.getOne();
  }
}
