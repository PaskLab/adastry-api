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
  ): Promise<[Transaction[], number]> {
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

    if (params.from) {
      qb.andWhere('transaction.blockTime >= :from', { from: params.from });
    }

    if (params.to) {
      qb.andWhere('transaction.blockTime <= :to', { to: params.to });
    }

    qb.take(params.limit ? params.limit : this.MAX_LIMIT);

    if (params.page) {
      qb.skip(
        (params.page - 1) * (params.limit ? params.limit : this.MAX_LIMIT),
      );
    }

    return qb.getManyAndCount();
  }

  findByYear(
    stakeAddress: string,
    year: number,
    quarter?: number,
  ): Promise<Transaction[]> {
    let startMonth = '01';
    let endMonth = '12';
    let endDay = '31';

    if (quarter) {
      const zeroLead = (str) => ('0' + str).slice(-2);
      startMonth = zeroLead((quarter - 1) * 3 + 1);
      endMonth = zeroLead((quarter - 1) * 3 + 3);
      endDay = quarter < 2 || quarter > 3 ? '31' : '30';
    }

    const firstDay = dateToUnix(new Date(`${year}-${startMonth}-01T00:00:00Z`));
    const lastDay = dateToUnix(
      new Date(`${year}-${endMonth}-${endDay}T23:59:59Z`),
    );

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
