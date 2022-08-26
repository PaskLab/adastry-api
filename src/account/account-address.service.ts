import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { AccountAddress } from './entities/account-address.entity';

@Injectable()
export class AccountAddressService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  // REPOSITORY

  async findAccountAddr(stakeAddress: string): Promise<AccountAddress[]> {
    return this.em
      .getRepository(AccountAddress)
      .createQueryBuilder('address')
      .innerJoin('address.account', 'account')
      .where('account.stakeAddress = :stakeAddress', {
        stakeAddress: stakeAddress,
      })
      .getMany();
  }
}
