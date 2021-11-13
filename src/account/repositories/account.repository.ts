import { EntityRepository, Repository } from 'typeorm';
import { Account } from '../entities/account.entity';

@EntityRepository(Account)
export class AccountRepository extends Repository<Account> {
  async findAll(): Promise<Account[]> {
    return this.createQueryBuilder('account')
      .leftJoinAndSelect('account.epoch', 'epoch')
      .leftJoinAndSelect('account.pool', 'pool')
      .getMany();
  }

  async findOneWithJoin(stakeAddress: string): Promise<Account | undefined> {
    return this.createQueryBuilder('account')
      .leftJoinAndSelect('account.epoch', 'epoch')
      .leftJoinAndSelect('account.pool', 'pool')
      .leftJoinAndSelect('pool.epoch', 'poolEpoch')
      .where('account.stakeAddress = :stakeAddress')
      .setParameter('stakeAddress', stakeAddress)
      .getOne();
  }
}
