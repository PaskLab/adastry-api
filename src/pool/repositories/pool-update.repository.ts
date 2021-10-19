import { EntityRepository, Repository } from 'typeorm';
import { PoolUpdate } from '../entities/pool-update.entity';

@EntityRepository(PoolUpdate)
export class PoolUpdateRepository extends Repository<PoolUpdate> {
  async findLastUpdate(
    poolId: string,
    untilEpoch?: number,
  ): Promise<PoolUpdate | undefined> {
    let query = this.createQueryBuilder('update')
      .innerJoin('update.pool', 'pool')
      .innerJoin('update.epoch', 'epoch')
      .where('pool.poolId = :poolId')
      .orderBy('epoch.epoch', 'DESC')
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
