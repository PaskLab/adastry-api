import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { MirTransaction } from './entities/mir-transaction.entity';
import { Account } from './entities/account.entity';

@Injectable()
export class MirTransactionService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  // REPOSITORY

  findLastTx(account: Account): Promise<MirTransaction | null> {
    return this.em
      .getRepository(MirTransaction)
      .createQueryBuilder('transaction')
      .innerJoin('transaction.account', 'account')
      .where('account.id = :accountId', { accountId: account.id })
      .orderBy('transaction.block', 'DESC')
      .addOrderBy('transaction.txIndex', 'DESC')
      .getOne();
  }

  async findEpochMIRTransactions(
    stakeAddress: string,
    epoch: number,
  ): Promise<MirTransaction[]> {
    return this.em
      .getRepository(MirTransaction)
      .createQueryBuilder('transaction')
      .innerJoinAndSelect('transaction.epoch', 'epoch')
      .innerJoinAndSelect('transaction.account', 'account')
      .where('account.stakeAddress = :stakeAddress', {
        stakeAddress: stakeAddress,
      })
      .andWhere('epoch.epoch = :epoch', { epoch: epoch })
      .getMany();
  }

  async findMIRTransaction(
    stakeAddress: string,
    txHash: string,
  ): Promise<MirTransaction | null> {
    return this.em
      .getRepository(MirTransaction)
      .createQueryBuilder('transaction')
      .innerJoinAndSelect('transaction.account', 'account')
      .where('account.stakeAddress = :stakeAddress', {
        stakeAddress: stakeAddress,
      })
      .andWhere('transaction.txHash = :txHash', { txHash })
      .getOne();
  }

  async findAccountMIRs(stakeAddress: string): Promise<MirTransaction[]> {
    return this.em
      .getRepository(MirTransaction)
      .createQueryBuilder('transaction')
      .innerJoinAndSelect('transaction.account', 'account')
      .where('account.stakeAddress = :stakeAddress', {
        stakeAddress: stakeAddress,
      })
      .getMany();
  }
}
