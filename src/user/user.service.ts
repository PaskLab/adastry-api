import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
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
import { CurrencyRepository } from '../spot/repositories/currency.repository';
import { UpdateUserDto } from './dto/update-user.dto';
import { decrypt, encrypt } from '../utils/utils';

@Injectable()
export class UserService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserDto> {
    let user = await this.em
      .getCustomRepository(UserRepository)
      .findOne({ username: createUserDto.username });

    if (user) {
      throw new ConflictException(
        `User with username "${createUserDto.username}" already exist.`,
      );
    }

    const saltRounds = 10;
    const pwdHash = await bcrypt.hash(createUserDto.password, saltRounds);

    const currency = await this.em
      .getCustomRepository(CurrencyRepository)
      .findOne({
        code: createUserDto.currency ? createUserDto.currency : 'USD',
      });

    if (!currency) {
      throw new BadRequestException(
        `Currency code [${createUserDto.currency}] not supported.`,
      );
    }

    user = new User();
    user.username = createUserDto.username;
    user.name = createUserDto.name;
    user.password = pwdHash;
    user.currency = currency;

    user = await this.em.save(user);

    return new UserDto({
      username: user.username,
      email: '',
      name: user.name,
      currency: user.currency.code,
    });
  }

  async updateUser(userId: number, updateDto: UpdateUserDto): Promise<User> {
    const user = await this.em
      .getCustomRepository(UserRepository)
      .findOne({ id: userId });

    if (!user) {
      throw new NotFoundException(`User not found.`);
    }

    if (updateDto.name) {
      user.name = updateDto.name;
    }

    if (updateDto.currency) {
      const currency = await this.em
        .getCustomRepository(CurrencyRepository)
        .findOne({ code: updateDto.currency });

      if (!currency) {
        throw new BadRequestException(
          `Currency code [${updateDto.currency}] not supported.`,
        );
      }

      user.currency = currency;
    }

    return this.em.save(user);
  }

  async updateEmail(userId: number, email: string): Promise<string> {
    const user = await this.em
      .getCustomRepository(UserRepository)
      .findOne({ id: userId });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (!process.env.DB_SECRET) {
      throw new InternalServerErrorException('DB encryption key missing');
    }

    const encryptedEmail = await encrypt(email, process.env.DB_SECRET);

    user.email = encryptedEmail.encrypted;

    const exp = new Date();
    exp.setHours(exp.getHours() + 24);
    user.expHash =
      exp.valueOf().toString() + crypto.randomBytes(20).toString('hex');

    await this.sendVerifyEmail(email, user.expHash);

    await this.em.save(user);

    return email;
  }

  async validatePWD(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  async verifyEmail(code: string): Promise<User> {
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
    const ejsTemplate = readFileSync('./views/user/verif-email.ejs').toString();

    const transporter = nodemailer.createTransport(process.env.MAILER_URL);
    const message = {
      from: process.env.MAILER_FROM,
      to: email,
      subject: 'Email Verification',
      html: ejs.render(ejsTemplate, { domain: process.env.DOMAIN, code: code }),
    };

    transporter.sendMail(message, function (err) {
      if (err) {
        throw new InternalServerErrorException(
          `Verification email for user ${email} could not be sent.`,
        );
      }
    });
    transporter.close();
  }

  async getActiveUser(username: string): Promise<User> {
    const user = await this.em
      .getCustomRepository(UserRepository)
      .findActiveUser(username);

    if (!user) {
      throw new InternalServerErrorException(`User ${username} not found.`);
    }

    return user;
  }

  async getUserEmail(userId: number): Promise<string> {
    const user = await this.em
      .getCustomRepository(UserRepository)
      .findOne(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    let email = '';

    if (user.expHash.length === 0) {
      if (!process.env.DB_SECRET) {
        throw new InternalServerErrorException('DB encryption key missing');
      }

      email = await decrypt(user.email, process.env.DB_SECRET);
    }

    return email;
  }

  async getUserInfo(userId: number): Promise<UserDto> {
    const user = await this.em
      .getCustomRepository(UserRepository)
      .findOne(userId, { relations: ['currency'] });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    let email = '';

    if (user.expHash.length === 0) {
      if (!process.env.DB_SECRET) {
        throw new InternalServerErrorException('DB encryption key missing');
      }

      email = await decrypt(user.email, process.env.DB_SECRET);
    }

    return new UserDto({
      username: user.username,
      name: user.name,
      email: email,
      currency: user.currency.code,
    });
  }
}
