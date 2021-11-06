import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
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
import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import ejs = require('ejs');

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

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
      if (timestamp.valueOf() < Date.now()) {
        await this.em.delete(User, user.id);
        user = undefined;
      }
    }

    const saltRounds = 10;
    const pwdHash = await bcrypt.hash(createUserDto.password, saltRounds);

    if (!user) {
      user = new User();
      user.email = createUserDto.email;
      user.name = createUserDto.name;
      user.password = pwdHash;
    }

    const exp = new Date();
    exp.setHours(exp.getHours() + 24);
    user.expHash =
      exp.valueOf().toString() + crypto.randomBytes(20).toString('hex');

    user = await this.em.save(user);

    this.sendVerifyEmail(user.email, user.expHash);

    return new UserDto({ id: user.id, email: user.email, name: user.name });
  }

  async validatePWD(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  async verifyAccount(code: string): Promise<User> {
    const user = await this.em
      .getCustomRepository(UserRepository)
      .findOne({ expHash: code });

    if (!user) {
      throw new BadRequestException('Verification code invalid.');
    }

    const timestamp = new Date(parseInt(code.slice(0, 13)));
    if (timestamp.valueOf() < Date.now()) {
      throw new BadRequestException(`Verification code expired.`);
    }

    user.expHash = '';
    return this.em.save(user);
  }

  async sendVerifyEmail(email: string, code: string): Promise<void> {
    const ejsTemplate = await readFileSync(
      './views/user/verif-email.ejs',
    ).toString();

    const transporter = nodemailer.createTransport(process.env.MAILER_URL);
    const message = {
      from: process.env.MAILER_FROM,
      to: email,
      subject: 'Email Verification',
      html: ejs.render(ejsTemplate, { domain: process.env.DOMAIN, code: code }),
    };

    const logger = this.logger;

    transporter.sendMail(message, function (err) {
      if (err) {
        logger.error(
          `Verification email for user ${email} could not be sent.`,
          err,
        );
      }
    });
    transporter.close();
  }

  async getActiveUser(email: string): Promise<User> {
    const user = await this.em
      .getCustomRepository(UserRepository)
      .findActiveUser(email);

    if (!user) {
      throw new NotFoundException(`User ${email} not found.`);
    }

    return user;
  }
}
