import { EntityRepository, Repository } from 'typeorm';
import { PoolHistory } from '../entities/pool-history.entity';

@EntityRepository(PoolHistory)
export class PoolHistoryRepository extends Repository<PoolHistory> {
  async findLastEpoch(poolId: string): Promise<PoolHistory | undefined> {
    return this.createQueryBuilder('history')
      .innerJoinAndSelect('history.pool', 'pool')
      .innerJoinAndSelect('history.epoch', 'epoch')
      .where('pool.poolId = :poolId')
      .orderBy('epoch.epoch', 'DESC')
      .limit(1)
      .setParameter('poolId', poolId)
      .getOne();
  }
}
