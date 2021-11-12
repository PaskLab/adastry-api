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
      .leftJoinAndSelect('account.currency', 'currency')
      .where('user.id = :userId')
      .andWhere('account.stakeAddress = :stakeAddress')
      .setParameters({ userId: userId, stakeAddress: stakeAddress })
      .getOne();
  }
}
