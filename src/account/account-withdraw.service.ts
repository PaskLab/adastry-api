import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { AccountWithdraw } from './entities/account-withdraw.entity';

@Injectable()
export class AccountWithdrawService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  // REPOSITORY

  async findEpochWithdrawals(
    stakeAddress: string,
    epoch: number,
  ): Promise<AccountWithdraw[]> {
    return this.em
      .getRepository(AccountWithdraw)
      .createQueryBuilder('withdraw')
      .innerJoinAndSelect('withdraw.epoch', 'epoch')
      .innerJoinAndSelect('withdraw.account', 'account')
      .where('account.stakeAddress = :stakeAddress', {
        stakeAddress: stakeAddress,
      })
      .andWhere('epoch.epoch = :epoch', { epoch: epoch })
      .getMany();
  }

  async findLastWithdraw(): Promise<AccountWithdraw | null> {
    return this.em
      .getRepository(AccountWithdraw)
      .createQueryBuilder('withdraw')
      .orderBy('block', 'DESC')
      .getOne();
  }

  async findOneByAccountTx(
    stakeAddress: string,
    txHash: string,
  ): Promise<AccountWithdraw | null> {
    return this.em
      .getRepository(AccountWithdraw)
      .createQueryBuilder('withdraw')
      .innerJoin('withdraw.account', 'account')
      .where('withdraw.txHash = :txHash', { txHash })
      .andWhere('account.stakeAddress = :stakeAddress', { stakeAddress })
      .getOne();
  }
}
