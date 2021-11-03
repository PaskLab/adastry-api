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

@Injectable()
export class UserService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserDto> {
    let user = await this.em
      .getCustomRepository(UserRepository)
      .findOne({ email: createUserDto.email });

    if (user) {
      throw new ConflictException(
        `User with email ${createUserDto.email} already exist.`,
      );
    }

    const saltRounds = 10;
    const hash = await bcrypt.hash(createUserDto.password, saltRounds);

    user = new User();
    user.email = createUserDto.email;
    user.name = createUserDto.name;
    user.password = hash;

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
