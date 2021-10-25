import { EntityRepository, Repository } from 'typeorm';
import { Account } from '../entities/account.entity';

@EntityRepository(Account)
export class AccountRepository extends Repository<Account> {
  async findAll(): Promise<Account[]> {
    return this.createQueryBuilder('account')
      .leftJoinAndSelect('account.epoch', 'epoch')
      .leftJoinAndSelect('account.pool', 'pool')
      .leftJoinAndSelect('account.currency', 'currency')
      .getMany();
  }

  async findOneWithJoin(stakeAddress: string): Promise<Account | undefined> {
    return this.createQueryBuilder('account')
      .leftJoinAndSelect('account.epoch', 'epoch')
      .leftJoinAndSelect('account.pool', 'pool')
      .leftJoinAndSelect('pool.epoch', 'poolEpoch')
      .leftJoinAndSelect('account.currency', 'currency')
      .where('account.stakeAddress = :stakeAddress')
      .setParameter('stakeAddress', stakeAddress)
      .getOne();
  }
}
