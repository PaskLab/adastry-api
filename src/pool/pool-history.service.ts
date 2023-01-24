import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, UpdateResult } from 'typeorm';
import config from '../../config.json';
import { PoolHistory } from './entities/pool-history.entity';
import { HistoryQueryType } from './types/history-query.type';

@Injectable()
export class PoolHistoryService {
  private readonly MAX_LIMIT = config.api.pageLimit;

  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  // REPOSITORY

  async findLastEpoch(poolId: string): Promise<PoolHistory | null> {
    return this.em
      .getRepository(PoolHistory)
      .createQueryBuilder('history')
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
  ): Promise<PoolHistory | null> {
    return this.em
      .getRepository(PoolHistory)
      .createQueryBuilder('history')
      .innerJoinAndSelect('history.pool', 'pool')
      .innerJoinAndSelect('history.epoch', 'epoch')
      .where('pool.poolId = :poolId')
      .andWhere('epoch.epoch = :epoch')
      .setParameters({ poolId: poolId, epoch: epoch })
      .getOne();
  }

  async findPoolHistory(
    params: HistoryQueryType,
  ): Promise<[PoolHistory[], number]> {
    const qb = this.em
      .getRepository(PoolHistory)
      .createQueryBuilder('history')
      .innerJoinAndSelect('history.pool', 'pool')
      .innerJoinAndSelect('history.epoch', 'epoch')
      .innerJoinAndSelect('history.cert', 'cert')
      .innerJoinAndSelect('cert.rewardAccount', 'rewardAccount')
      .innerJoinAndSelect('cert.owners', 'owners')
      .innerJoinAndSelect('owners.account', 'ownerAccount')
      .where('pool.poolId = :poolId')
      .setParameter('poolId', params.poolId)
      .take(this.MAX_LIMIT)
      .orderBy('epoch', 'DESC');

    if (params.order) {
      qb.orderBy('epoch', params.order);
    }

    if (params.limit) {
      qb.take(params.limit);
    }

    if (params.page) {
      qb.skip(
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

    return qb.getManyAndCount();
  }

  async findUnprocessed(
    poolId: string,
    untilEpoch: number,
  ): Promise<PoolHistory[]> {
    return this.em
      .getRepository(PoolHistory)
      .createQueryBuilder('history')
      .innerJoinAndSelect('history.pool', 'pool')
      .innerJoinAndSelect('history.epoch', 'epoch')
      .innerJoinAndSelect('history.cert', 'cert')
      .innerJoinAndSelect('cert.epoch', 'certEpoch')
      .innerJoinAndSelect('cert.rewardAccount', 'rewardAccount')
      .innerJoinAndSelect('cert.owners', 'owners')
      .innerJoinAndSelect('owners.account', 'ownerAccount')
      .where('pool.poolId = :poolId', { poolId: poolId })
      .andWhere('history.rewardsRevised = FALSE')
      .andWhere('epoch.epoch <= :epoch', { epoch: untilEpoch })
      .orderBy('epoch.epoch', 'ASC')
      .getMany();
  }

  async resetCalculation(poolId: number): Promise<UpdateResult> {
    return this.em
      .createQueryBuilder()
      .update(PoolHistory)
      .set({ rewardsRevised: false })
      .where('pool = :poolId', { poolId: poolId })
      .execute();
  }
}
