import { EntityRepository, Repository } from 'typeorm';
import { PoolHistory } from '../entities/pool-history.entity';
import { HistoryQueryType } from '../types/history-query.type';
import config from '../../../config.json';

@EntityRepository(PoolHistory)
export class PoolHistoryRepository extends Repository<PoolHistory> {
  private readonly MAX_LIMIT = config.api.pageLimit;

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

  async findOneRecord(
    poolId: string,
    epoch: number,
  ): Promise<PoolHistory | undefined> {
    return this.createQueryBuilder('history')
      .innerJoinAndSelect('history.pool', 'pool')
      .innerJoinAndSelect('history.epoch', 'epoch')
      .where('pool.poolId = :poolId')
      .andWhere('epoch.epoch = :epoch')
      .setParameters({ poolId: poolId, epoch: epoch })
      .getOne();
  }

  async findPoolHistory(params: HistoryQueryType): Promise<PoolHistory[]> {
    const qb = this.createQueryBuilder('history')
      .innerJoinAndSelect('history.pool', 'pool')
      .innerJoinAndSelect('history.epoch', 'epoch')
      .innerJoinAndSelect('history.cert', 'cert')
      .innerJoinAndSelect('cert.rewardAccount', 'rewardAccount')
      .innerJoinAndSelect('cert.owners', 'owners')
      .innerJoinAndSelect('owners.account', 'ownerAccount')
      .where('pool.poolId = :poolId')
      .setParameter('poolId', params.poolId)
      .limit(this.MAX_LIMIT)
      .orderBy('epoch', 'DESC');

    if (params.order) {
      qb.orderBy('epoch', params.order);
    }

    if (params.limit) {
      qb.limit(params.limit);
    }

    if (params.page) {
      qb.offset(
        (params.page - 1) * (params.limit ? params.limit : this.MAX_LIMIT),
      );
    }

    if (params.from) {
      if (params.order && params.order === 'ASC') {
        qb.andWhere('epoch.epoch >= :from');
      } else {
        qb.andWhere('epoch.epoch <= :from');
      }
      qb.setParameter('from', params.from);
    }

    return qb.getMany();
  }
}
