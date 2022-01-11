import { EntityRepository, Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { TxHistoryParam } from '../params/tx-history.param';
import config from '../../../config.json';
import { dateToUnix } from '../../utils/utils';

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
      .orderBy({ blockTime: 'DESC', txIndex: 'DESC' });

    if (params.order) {
      qb.orderBy({ blockTime: params.order, txIndex: params.order });
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

  findByYear(stakeAddress: string, year: number): Promise<Transaction[]> {
    const firstDay = dateToUnix(new Date(`${year}-01-01T00:00:00Z`));
    const lastDay = dateToUnix(new Date(`${year}-12-31T23:59:59Z`));

    return this.createQueryBuilder('transaction')
      .innerJoin('transaction.address', 'address')
      .innerJoin('address.account', 'account')
      .where('account.stakeAddress = :stakeAddress', {
        stakeAddress: stakeAddress,
      })
      .andWhere('blockTime >= :startTime AND blockTime <= :endTime', {
        startTime: firstDay,
        endTime: lastDay,
      })
      .orderBy('blockTime', 'ASC')
      .addOrderBy('txIndex', 'ASC')
      .getMany();
  }
}
