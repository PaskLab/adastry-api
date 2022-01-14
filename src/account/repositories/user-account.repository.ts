import { EntityRepository, Repository } from 'typeorm';
import { UserAccount } from '../entities/user-account.entity';

@EntityRepository(UserAccount)
export class UserAccountRepository extends Repository<UserAccount> {
  async findUserAccount(
    userId: number,
    stakeAddress: string,
  ): Promise<UserAccount | undefined> {
    return this.createQueryBuilder('userAccount')
      .innerJoinAndSelect('userAccount.account', 'account')
      .innerJoinAndSelect('userAccount.user', 'user')
      .where('user.id = :userId')
      .andWhere('account.stakeAddress = :stakeAddress')
      .setParameters({ userId: userId, stakeAddress: stakeAddress })
      .getOne();
  }

  async findUserAccountWithJoin(
    userId: number,
    stakeAddress: string,
  ): Promise<UserAccount | undefined> {
    return this.createQueryBuilder('userAccount')
      .innerJoinAndSelect('userAccount.account', 'account')
      .innerJoinAndSelect('userAccount.user', 'user')
      .innerJoinAndSelect('account.pool', 'pool')
      .leftJoinAndSelect('account.epoch', 'epoch')
      .leftJoinAndSelect('pool.epoch', 'poolEpoch')
      .where('user.id = :userId')
      .andWhere('account.stakeAddress = :stakeAddress')
      .setParameters({ userId: userId, stakeAddress: stakeAddress })
      .getOne();
  }

  async findAllUserAccount(userId: number): Promise<UserAccount[]> {
    return this.createQueryBuilder('userAccount')
      .innerJoinAndSelect('userAccount.account', 'account')
      .innerJoinAndSelect('userAccount.user', 'user')
      .where('user.id = :userId')
      .setParameter('userId', userId)
      .getMany();
  }
}
