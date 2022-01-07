import { EntityRepository, Repository } from 'typeorm';
import { AddressTransaction } from '../entities/address-transaction.entity';

@EntityRepository(AddressTransaction)
export class AddressTransactionRepository extends Repository<AddressTransaction> {
  findLastAddressTx(address: string): Promise<AddressTransaction | undefined> {
    return this.createQueryBuilder('transaction')
      .innerJoin('transaction.address', 'address')
      .where('address = :address', { address: address })
      .orderBy('transaction.blockHeight', 'DESC')
      .addOrderBy('transaction.txIndex', 'DESC')
      .getOne();
  }
}
