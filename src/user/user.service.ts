import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRepository } from './repositories/user.repository';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserDto } from './dto/user.dto';
import * as crypto from 'crypto';

@Injectable()
export class UserService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserDto> {
    let user = await this.em
      .getCustomRepository(UserRepository)
      .findOne({ email: createUserDto.email });

    if (user) {
      if (user.expHash === '') {
        throw new ConflictException(
          `User with email ${createUserDto.email} already exist.`,
        );
      }
      const timestamp = new Date(parseInt(user.expHash.slice(0, 13)));
      if (timestamp.valueOf() > Date.now()) {
        // todo: Refresh & resend email verification
        throw new ConflictException(
          `Verification email sent. Expire on ${timestamp.toISOString()}`,
        );
      }
      await this.em.delete(User, user.id);
    }

    const saltRounds = 10;
    const pwdHash = await bcrypt.hash(createUserDto.password, saltRounds);

    user = new User();
    user.email = createUserDto.email;
    user.name = createUserDto.name;
    user.password = pwdHash;

    const exp = new Date();
    exp.setHours(exp.getHours() + 24);
    user.expHash =
      exp.valueOf().toString() + crypto.randomBytes(20).toString('hex');

    user = await this.em.save(user);

    return new UserDto({ id: user.id, email: user.email, name: user.name });
  }

  async validatePWD(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  async getUserEntity(email: string): Promise<User> {
    const user = await this.em
      .getCustomRepository(UserRepository)
      .findOne({ email: email });

    if (!user) {
      throw new NotFoundException(`User ${email} not found.`);
    }

    return user;
  }
}
