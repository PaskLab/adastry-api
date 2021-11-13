import { EntityRepository, Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@EntityRepository(User)
export class UserRepository extends Repository<User> {
  findActiveUser(username: string): Promise<User | undefined> {
    return this.createQueryBuilder('user')
      .leftJoinAndSelect('user.currency', 'currency')
      .where('username = :username')
      .andWhere('active = TRUE')
      .setParameter('username', username)
      .getOne();
  }
}
