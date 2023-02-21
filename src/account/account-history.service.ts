import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import config from '../../config.json';
import { AccountHistory } from './entities/account-history.entity';
import { AccountHistoryQueryType } from './types/account-history-query.type';
import { generateUnixTimeRange } from '../utils/utils';
import { FromQueryType } from '../utils/types/from-query.type';

@Injectable()
export class AccountHistoryService {
  private readonly MAX_LIMIT = config.api.pageLimit;
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  // REPOSITORY

  async findLastEpoch(stakeAddress: string): Promise<AccountHistory | null> {
    return this.em
      .getRepository(AccountHistory)
      .createQueryBuilder('history')
      .innerJoinAndSelect('history.account', 'account')
      .innerJoinAndSelect('history.epoch', 'epoch')
      .where('account.stakeAddress = :stakeAddress')
      .orderBy('epoch.epoch', 'DESC')
      .setParameter('stakeAddress', stakeAddress)
      .getOne();
  }

  async findOneRecord(
    stakeAddress: string,
    epoch: number,
  ): Promise<AccountHistory | null> {
    return this.em
      .getRepository(AccountHistory)
      .createQueryBuilder('history')
      .innerJoinAndSelect('history.account', 'account')
      .innerJoinAndSelect('history.epoch', 'epoch')
      .where('account.stakeAddress = :stakeAddress')
      .andWhere('epoch.epoch = :epoch')
      .setParameters({ stakeAddress: stakeAddress, epoch: epoch })
      .getOne();
  }

  async findAccountHistory(
    params: AccountHistoryQueryType,
  ): Promise<[AccountHistory[], number]> {
    const qb = this.em
      .getRepository(AccountHistory)
      .createQueryBuilder('history')
      .innerJoinAndSelect('history.account', 'account')
      .innerJoinAndSelect('history.epoch', 'epoch')
      .leftJoinAndSelect('history.pool', 'pool')
      .where('account.stakeAddress = :stakeAddress')
      .setParameter('stakeAddress', params.stakeAddress)
      .orderBy('epoch.epoch', 'DESC');

    if (params.order) {
      qb.orderBy('epoch.epoch', params.order);
    }

    if (params.from) {
      if (params.order && params.order === 'ASC') {
        qb.andWhere('epoch.epoch >= :from');
      } else {
        qb.andWhere('epoch.epoch <= :from');
      }
      qb.setParameter('from', params.from);
    }

    qb.take(params.limit ? params.limit : this.MAX_LIMIT);

    if (params.page) {
      qb.skip(
        (params.page - 1) * (params.limit ? params.limit : this.MAX_LIMIT),
      );
    }

    return qb.getManyAndCount();
  }

  async findAccountHistorySelection(
    stakeAddresses: string[],
    params: FromQueryType,
  ): Promise<[AccountHistory[], number]> {
    if (!stakeAddresses.length) return [[], 0];

    const qb = this.em
      .getRepository(AccountHistory)
      .createQueryBuilder('history')
      .innerJoinAndSelect('history.account', 'account')
      .innerJoinAndSelect('history.epoch', 'epoch')
      .leftJoinAndSelect('history.pool', 'pool')
      .where('account.stakeAddress IN (:...stakeAddresses)', {
        stakeAddresses: stakeAddresses,
      })
      .orderBy('epoch.epoch', 'ASC');

    if (params.order) {
      qb.orderBy('epoch.epoch', params.order);
    }

    if (params.from) {
      if (params.order && params.order === 'DESC') {
        qb.andWhere('epoch.epoch <= :from');
      } else {
        qb.andWhere('epoch.epoch >= :from');
      }
      qb.setParameter('from', params.from);
    }

    return qb.getManyAndCount();
  }

  findByYear(
    stakeAddress: string,
    year: number,
    month?: number,
    quarter?: number,
  ): Promise<AccountHistory[]> {
    const range = generateUnixTimeRange(year, month, quarter);

    return this.em
      .getRepository(AccountHistory)
      .createQueryBuilder('history')
      .innerJoinAndSelect('history.account', 'account')
      .innerJoinAndSelect('history.epoch', 'epoch')
      .where('account.stakeAddress = :stakeAddress', {
        stakeAddress: stakeAddress,
      })
      .andWhere(
        'epoch.startTime >= :startTime AND epoch.startTime <= :endTime',
        range,
      )
      .orderBy('epoch.startTime', 'ASC')
      .getMany();
  }

  async findByYearSelection(
    stakeAddresses: string[],
    year: number,
    month?: number,
    quarter?: number,
  ): Promise<AccountHistory[]> {
    if (!stakeAddresses.length) return [];

    const range = generateUnixTimeRange(year, month, quarter);

    return this.em
      .getRepository(AccountHistory)
      .createQueryBuilder('history')
      .innerJoinAndSelect('history.account', 'account')
      .innerJoinAndSelect('history.epoch', 'epoch')
      .where('account.stakeAddress IN (:...stakeAddresses)', {
        stakeAddresses: stakeAddresses,
      })
      .andWhere(
        'epoch.startTime >= :startTime AND epoch.startTime <= :endTime',
        range,
      )
      .orderBy('epoch.startTime', 'ASC')
      .addOrderBy('account.id', 'ASC')
      .getMany();
  }

  async findEpochHistorySelection(
    stakeAddresses: string[],
    epoch: number,
  ): Promise<AccountHistory[]> {
    if (!stakeAddresses.length) return [];

    return this.em
      .getRepository(AccountHistory)
      .createQueryBuilder('history')
      .innerJoinAndSelect('history.account', 'account')
      .innerJoinAndSelect('history.epoch', 'epoch')
      .where('account.stakeAddress IN (:...stakeAddresses)', {
        stakeAddresses: stakeAddresses,
      })
      .andWhere('epoch.epoch = :epoch', { epoch: epoch })
      .getMany();
  }
}
