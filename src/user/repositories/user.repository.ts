import { EntityRepository, Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@EntityRepository(User)
export class UserRepository extends Repository<User> {
  findActiveUser(email: string): Promise<User | undefined> {
    return this.createQueryBuilder('user')
      .where('email = :email')
      .andWhere('expHash = :emptyString')
      .setParameters({ email: email, emptyString: '' })
      .getOne();
  }
}
