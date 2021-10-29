import { EntityRepository, Repository } from 'typeorm';
import { AccountHistory } from '../entities/account-history.entity';
import { HistoryQueryType } from '../types/history-query.type';
import config from '../../../config.json';

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
      .limit(1)
      .setParameter('stakeAddress', stakeAddress)
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