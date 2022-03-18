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
      .innerJoin('transaction.addresses', 'addresses')
      .innerJoin('addresses.address', 'address')
      .where('address.address = :address', { address: address })
      .orderBy('transaction.blockHeight', 'DESC')
      .addOrderBy('transaction.txIndex', 'DESC')
      .getOne();
  }

  async findHistory(
    stakeAddress: string,
    params: TxHistoryParam,
    count?: boolean,
  ): Promise<Transaction[] | number> {
    const qb = this.createQueryBuilder('transaction')
      .innerJoin('transaction.account', 'account')
      .innerJoinAndSelect('transaction.addresses', 'addresses')
      .innerJoinAndSelect('addresses.address', 'address')
      .innerJoin(
        'address.account',
        'addressAccount',
        'addressAccount.stakeAddress = :stakeAddress',
        { stakeAddress: stakeAddress },
      )
      .where('account.stakeAddress = :stakeAddress', {
        stakeAddress: stakeAddress,
      })
      .orderBy({
        'transaction.blockTime': 'DESC',
        'transaction.txIndex': 'DESC',
      });

    if (params.order) {
      qb.orderBy({
        'transaction.blockTime': params.order,
        'transaction.txIndex': params.order,
      });
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
      qb.andWhere('transaction.blockTime >= :from', { from: params.from });
    }

    if (params.to) {
      qb.andWhere('transaction.blockTime <= :to', { to: params.to });
    }

    if (count) return qb.getCount();

    qb.limit(params.limit ? params.limit : this.MAX_LIMIT);

    return qb.getMany();
  }

  findByYear(stakeAddress: string, year: number): Promise<Transaction[]> {
    const firstDay = dateToUnix(new Date(`${year}-01-01T00:00:00Z`));
    const lastDay = dateToUnix(new Date(`${year}-12-31T23:59:59Z`));

    return this.createQueryBuilder('transaction')
      .innerJoin('transaction.account', 'account')
      .where('account.stakeAddress = :stakeAddress', {
        stakeAddress: stakeAddress,
      })
      .andWhere(
        'transaction.blockTime >= :startTime AND transaction.blockTime <= :endTime',
        {
          startTime: firstDay,
          endTime: lastDay,
        },
      )
      .orderBy('transaction.blockTime', 'ASC')
      .addOrderBy('transaction.txIndex', 'ASC')
      .getMany();
  }

  findOneForAccount(
    txHash: string,
    stakeAddress: string,
  ): Promise<Transaction | undefined> {
    return this.createQueryBuilder('transaction')
      .innerJoin('transaction.account', 'account')
      .where(
        'transaction.txHash = :txHash AND account.stakeAddress = :stakeAddress',
        {
          txHash: txHash,
          stakeAddress: stakeAddress,
        },
      )
      .getOne();
  }
}
