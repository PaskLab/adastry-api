import { EntityRepository, Repository } from 'typeorm';
import { AccountWithdraw } from '../entities/account-withdraw.entity';

@EntityRepository(AccountWithdraw)
export class AccountWithdrawRepository extends Repository<AccountWithdraw> {
  async findEpochWithdrawals(
    stakeAddress: string,
    epoch: number,
  ): Promise<AccountWithdraw[]> {
    return this.createQueryBuilder('withdraw')
      .innerJoinAndSelect('withdraw.epoch', 'epoch')
      .innerJoinAndSelect('withdraw.account', 'account')
      .where('account.stakeAddress = :stakeAddress', {
        stakeAddress: stakeAddress,
      })
      .andWhere('epoch.epoch = :epoch', { epoch: epoch })
      .getMany();
  }

  async findLastWithdraw(): Promise<AccountWithdraw | undefined> {
    return this.createQueryBuilder('withdraw')
      .orderBy('block', 'DESC')
      .getOne();
  }

  async findOneByAccountTx(
    stakeAddress: string,
    txHash: string,
  ): Promise<AccountWithdraw | undefined> {
    return this.createQueryBuilder('withdraw')
      .innerJoin('withdraw.account', 'account')
      .where('withdraw.txHash = :txHash', { txHash })
      .andWhere('account.stakeAddress = :stakeAddress', { stakeAddress })
      .getOne();
  }
}
