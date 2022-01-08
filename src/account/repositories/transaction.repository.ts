import { EntityRepository, Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { TxHistoryParam } from '../params/tx-history.param';
import config from '../../../config.json';

@EntityRepository(Transaction)
export class TransactionRepository extends Repository<Transaction> {
  private readonly MAX_LIMIT = config.api.pageLimit;

  findLastAddressTx(address: string): Promise<Transaction | undefined> {
    return this.createQueryBuilder('transaction')
      .innerJoin('transaction.address', 'address')
      .where('address.address = :address', { address: address })
      .orderBy('blockHeight', 'DESC')
      .addOrderBy('txIndex', 'DESC')
      .getOne();
  }

  async findHistory(
    stakeAddress: string,
    params: TxHistoryParam,
  ): Promise<Transaction[]> {
    const qb = this.createQueryBuilder('transaction')
      .innerJoinAndSelect('transaction.address', 'address')
      .innerJoin('address.account', 'account')
      .where('account.stakeAddress = :stakeAddress', {
        stakeAddress: stakeAddress,
      })
      .limit(this.MAX_LIMIT)
      .orderBy('blockTime', 'DESC');

    if (params.order) {
      qb.orderBy('blockTime', params.order);
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
      qb.andWhere('blockTime >= :from', { from: params.from });
    }

    if (params.to) {
      qb.andWhere('blockTime <= :to', { to: params.to });
    }

    return qb.getMany();
  }
}
