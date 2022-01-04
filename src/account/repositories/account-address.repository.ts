import { EntityRepository, Repository } from 'typeorm';
import { AccountAddress } from '../entities/account-address.entity';

@EntityRepository(AccountAddress)
export class AccountAddressRepository extends Repository<AccountAddress> {
  async findAccountAddr(stakeAddress: string): Promise<AccountAddress[]> {
    return this.createQueryBuilder('address')
      .innerJoin('address.account', 'account')
      .where('account.stakeAddress = :stakeAddress', {
        stakeAddress: stakeAddress,
      })
      .getMany();
  }
}
