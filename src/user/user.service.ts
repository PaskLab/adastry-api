import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserDto } from './dto/user.dto';
import * as crypto from 'crypto';
import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import ejs = require('ejs');
import { UpdateUserDto } from './dto/update-user.dto';
import { decrypt, encrypt, hexToBech32, randNumber } from '../utils/utils';
import { SignatureDto } from '../auth/dto/signature.dto';
import { AuthService } from '../auth/auth.service';
import { VerifiedAddress } from './entities/verified-address.entity';
import { Currency } from '../spot/entities/currency.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserDto> {
    let user = await this.findByUsername(createUserDto.username);

    if (user) {
      throw new ConflictException(
        `User with username "${createUserDto.username}" already exist.`,
      );
    }

    const saltRounds = 10;
    const pwdHash = await bcrypt.hash(createUserDto.password, saltRounds);

    const currency = await this.em.getRepository(Currency).findOne({
      where: { code: createUserDto.currency ? createUserDto.currency : 'USD' },
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

  async createUserSignature(signatureDto: SignatureDto): Promise<UserDto> {
    let stakeAddress = await this.authService.verify(
      signatureDto.key,
      signatureDto.signature,
    );

    if (!stakeAddress) throw new BadRequestException('Invalid signature');

    stakeAddress = hexToBech32(stakeAddress, 'reward');

    const address = await this.em
      .getRepository(VerifiedAddress)
      .findOne({ where: { stakeAddress: stakeAddress } });

    if (address) {
      throw new ConflictException(
        `User with verified address "${address.stakeAddress}" already exist.`,
      );
    }

    const saltRounds = 10;
    const pwdHash = await bcrypt.hash(randNumber().toString(), saltRounds);

    const currency = await this.em
      .getRepository(Currency)
      .findOne({ where: { code: 'USD' } });

    if (!currency) {
      throw new BadRequestException(`Currency code [USD] not supported.`);
    }

    const username = 'User-' + randNumber();
    const user = new User();
    user.username = username;
    user.name = username;
    user.password = pwdHash;
    user.currency = currency;

    let verifiedAddress = new VerifiedAddress();
    verifiedAddress.stakeAddress = stakeAddress;
    verifiedAddress.user = user;

    verifiedAddress = await this.em.save(verifiedAddress);

    return new UserDto({
      username: verifiedAddress.user.username,
      email: '',
      name: verifiedAddress.user.name,
      currency: verifiedAddress.user.currency.code,
    });
  }

  async updateUser(userId: number, updateDto: UpdateUserDto): Promise<User> {
    const user = await this.em
      .getRepository(User)
      .findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User not found.`);
    }

    if (updateDto.name) {
      user.name = updateDto.name;
    }

    if (updateDto.currency) {
      const currency = await this.em
        .getRepository(Currency)
        .findOne({ where: { code: updateDto.currency } });

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
      .getRepository(User)
      .findOne({ where: { id: userId } });

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
      .getRepository(User)
      .findOne({ where: { expHash: code } });

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

    const logger = this.logger;

    transporter.sendMail(message, function (err) {
      if (err) {
        logger.error(`Verification email for user ${email} could not be sent.`);
      }
    });
    transporter.close();
  }

  async getActiveUser(username: string): Promise<User> {
    const user = await this.findActiveUser(username);

    if (!user) {
      throw new NotFoundException(`User ${username} not found.`);
    }

    return user;
  }

  async getUserEmail(userId: number): Promise<string> {
    const user = await this.em
      .getRepository(User)
      .findOne({ where: { id: userId } });

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
      .getRepository(User)
      .findOne({ where: { id: userId }, relations: { currency: true } });

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

  async updateCurrency(userId: number, code: string): Promise<string> {
    const user = await this.em
      .getRepository(User)
      .findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const currency = await this.em
      .getRepository(Currency)
      .findOne({ where: { code: code } });

    if (!currency) {
      throw new BadRequestException(`Currency ${code} doesn't exist.`);
    }

    user.currency = currency;

    await this.em.save(user);

    return currency.code;
  }

  // REPOSITORY

  findByUsername(username: string): Promise<User | null> {
    return this.em
      .getRepository(User)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.currency', 'currency')
      .where('LOWER(user.username) = LOWER(:username)')
      .setParameter('username', username)
      .getOne();
  }

  findActiveUser(username: string): Promise<User | null> {
    return this.em
      .getRepository(User)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.currency', 'currency')
      .where('LOWER(user.username) = LOWER(:username)')
      .andWhere('active = TRUE')
      .setParameter('username', username)
      .getOne();
  }

  findOneById(id: number): Promise<User | null> {
    return this.em
      .getRepository(User)
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.currency', 'currency')
      .where('user.id = :id', { id: id })
      .andWhere('user.active = TRUE')
      .getOne();
  }
}
