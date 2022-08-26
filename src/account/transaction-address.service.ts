import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { TransactionAddress } from './entities/transaction-address.entity';

@Injectable()
export class TransactionAddressService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  // REPOSITORY

  async exist(txHash: string, address: string): Promise<boolean> {
    const count = await this.em
      .getRepository(TransactionAddress)
      .createQueryBuilder('transactionAddress')
      .innerJoin('transactionAddress.tx', 'transaction')
      .innerJoin('transactionAddress.address', 'address')
      .where('transaction.txHash = :txHash AND address.address = :address', {
        txHash: txHash,
        address: address,
      })
      .getCount();

    return count > 0;
  }
}
