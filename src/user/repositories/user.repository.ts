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

  findOneById(id: number): Promise<User | undefined> {
    return this.createQueryBuilder('user')
      .innerJoinAndSelect('user.currency', 'currency')
      .where('user.id = :id', { id: id })
      .andWhere('user.active = TRUE')
      .getOne();
  }
}
