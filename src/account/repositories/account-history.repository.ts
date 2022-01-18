import { EntityRepository, Repository } from 'typeorm';
import { AccountHistory } from '../entities/account-history.entity';
import { HistoryQueryType } from '../types/history-query.type';
import config from '../../../config.json';
import { dateToUnix } from '../../utils/utils';

@EntityRepository(AccountHistory)
export class AccountHistoryRepository extends Repository<AccountHistory> {
  private readonly MAX_LIMIT = config.api.pageLimit;

  async findLastEpoch(
    stakeAddress: string,
  ): Promise<AccountHistory | undefined> {
    return this.createQueryBuilder('history')
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
  ): Promise<AccountHistory | undefined> {
    return this.createQueryBuilder('history')
      .innerJoinAndSelect('history.account', 'account')
      .innerJoinAndSelect('history.epoch', 'epoch')
      .where('account.stakeAddress = :stakeAddress')
      .andWhere('epoch.epoch = :epoch')
      .setParameters({ stakeAddress: stakeAddress, epoch: epoch })
      .getOne();
  }

  async findAccountHistory(
    params: HistoryQueryType,
  ): Promise<AccountHistory[]> {
    const qb = this.createQueryBuilder('history')
      .innerJoinAndSelect('history.account', 'account')
      .innerJoinAndSelect('history.epoch', 'epoch')
      .leftJoinAndSelect('history.pool', 'pool')
      .where('account.stakeAddress = :stakeAddress')
      .setParameter('stakeAddress', params.stakeAddress)
      .limit(this.MAX_LIMIT)
      .orderBy('epoch.epoch', 'DESC');

    if (params.order) {
      qb.orderBy('epoch.epoch', params.order);
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

  findByYear(stakeAddress: string, year: number): Promise<AccountHistory[]> {
    const firstDay = dateToUnix(new Date(`${year}-01-01T00:00:00Z`));
    const lastDay = dateToUnix(new Date(`${year}-12-31T23:59:59Z`));

    return this.createQueryBuilder('history')
      .innerJoinAndSelect('history.account', 'account')
      .innerJoinAndSelect('history.epoch', 'epoch')
      .where('account.stakeAddress = :stakeAddress', {
        stakeAddress: stakeAddress,
      })
      .andWhere(
        'epoch.startTime >= :startTime AND epoch.startTime <= :endTime',
        { startTime: firstDay, endTime: lastDay },
      )
      .getMany();
  }

  async findAccountSelection(
    stakeAddresses: string[],
    epoch: number,
  ): Promise<AccountHistory[]> {
    return this.createQueryBuilder('history')
      .innerJoinAndSelect('history.account', 'account')
      .innerJoinAndSelect('history.epoch', 'epoch')
      .where('account.stakeAddress IN (:...stakeAddresses)', {
        stakeAddresses: stakeAddresses,
      })
      .andWhere('epoch.epoch = :epoch', { epoch: epoch })
      .getMany();
  }
}
