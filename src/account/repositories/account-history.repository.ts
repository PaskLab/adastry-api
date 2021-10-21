import { EntityRepository, Repository } from 'typeorm';
import { AccountHistory } from '../entities/account-history.entity';

@EntityRepository(AccountHistory)
export class AccountHistoryRepository extends Repository<AccountHistory> {
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
}
