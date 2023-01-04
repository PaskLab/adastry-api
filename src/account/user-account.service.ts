import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AddUserAccountDto } from './dto/add-user-account.dto';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { UpdateUserAccountDto } from './dto/update-user-account.dto';
import { UserAccount } from './entities/user-account.entity';
import { SyncService } from './sync.service';
import { AccountService } from './account.service';
import { UserAccountDto } from './dto/user-account.dto';
import { PoolDto } from '../pool/dto/pool.dto';
import { AccountDto } from './dto/account.dto';
import * as Cardano from '@emurgo/cardano-serialization-lib-nodejs';
import { extractStakeAddress, generateUrl } from '../utils/utils';
import { User } from '../user/entities/user.entity';
import { Account } from './entities/account.entity';
import { Request } from 'express';
import { CsvFileDto } from './dto/csv-file.dto';
import { AccountHistoryService } from './account-history.service';
import { UserService } from '../user/user.service';
import config from '../../config.json';
import { TransactionService } from './transaction.service';

@Injectable()
export class UserAccountService {
  private readonly MIN_LOYALTY = config.app.minLoyalty;

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly syncService: SyncService,
    private readonly accountService: AccountService,
    private readonly accountHistoryService: AccountHistoryService,
    private readonly transactionService: TransactionService,
    private readonly userService: UserService,
  ) {}

  async getAll(userId: number): Promise<UserAccountDto[]> {
    const userAccounts = await this.findAllUserAccount(userId);

    return userAccounts.map(
      (a) =>
        new UserAccountDto({
          stakeAddress: a.account.stakeAddress,
          name: a.name,
          syncing: a.account.syncing,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        }),
    );
  }

  async getAccountInfo(userId, stakeAddress: string): Promise<AccountDto> {
    const userAccount = await this.findUserAccountWithJoin(
      userId,
      stakeAddress,
    );

    if (!userAccount) {
      throw new NotFoundException(`Account ${stakeAddress} not found.`);
    }

    const account = userAccount.account;

    let poolDto: PoolDto | null = null;
    const pool = account.pool;

    if (pool) {
      poolDto = new PoolDto({
        poolId: pool.poolId,
        name: pool.name,
        blocksMinted: pool.blocksMinted,
        liveStake: pool.liveStake,
        liveSaturation: pool.liveSaturation,
        liveDelegators: pool.liveDelegators,
        epoch: pool.epoch ? pool.epoch.epoch : null,
        isMember: pool.isMember,
      });
    }

    return new AccountDto({
      name: userAccount.name,
      stakeAddress: account.stakeAddress,
      active: account.active,
      rewardsSum: account.rewardsSum,
      withdrawable: account.withdrawable,
      loyalty: account.loyalty,
      epoch: account.epoch ? account.epoch.epoch : null,
      pool: poolDto,
      syncing: account.syncing,
    });
  }

  async create(
    userId: number,
    userAccountDto: AddUserAccountDto,
  ): Promise<UserAccount> {
    const isStakeAddr = new RegExp('^stake[a-z0-9]{54}$');

    if (!isStakeAddr.test(userAccountDto.address)) {
      const address = Cardano.Address.from_bech32(userAccountDto.address);

      const stakeAddress = extractStakeAddress(
        Buffer.from(address.to_bytes()).toString('hex'),
      );

      userAccountDto.address = stakeAddress.to_bech32();
    }

    let userAccount = await this.findUserAccount(
      userId,
      userAccountDto.address,
    );

    if (userAccount) {
      throw new ConflictException(
        `Account ${userAccountDto.address} already linked.`,
      );
    }

    const user = await this.em
      .getRepository(User)
      .findOne({ where: { id: userId, active: true } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    let account = await this.em
      .getRepository(Account)
      .findOne({ where: { stakeAddress: userAccountDto.address } });

    if (!account) {
      account = await this.accountService.create(userAccountDto.address);
    }

    userAccount = new UserAccount();
    userAccount.account = account;
    userAccount.name = userAccountDto.name;
    userAccount.user = user;

    return this.em.save(userAccount);
  }

  async update(
    userId: number,
    updateUserAccountDto: UpdateUserAccountDto,
  ): Promise<UserAccount> {
    const userAccount = await this.findUserAccount(
      userId,
      updateUserAccountDto.stakeAddress,
    );

    if (!userAccount) {
      throw new NotFoundException(
        `Account ${updateUserAccountDto.stakeAddress} not found.`,
      );
    }

    if (updateUserAccountDto.name) {
      userAccount.name = updateUserAccountDto.name;
    }

    return this.em.save(userAccount);
  }

  async remove(userId: number, stakeAddress: string): Promise<void> {
    const userAccount = await this.findUserAccount(userId, stakeAddress);

    if (!userAccount) {
      throw new NotFoundException(`Account ${stakeAddress} not found.`);
    }

    try {
      await this.em.remove(userAccount);
    } catch (e) {
      throw new ConflictException(`Account ${stakeAddress} cannot be deleted.`);
    }
  }

  async getBulkRewardsCSV(
    request: Request,
    userId: number,
    year: number,
    format?: string,
    quarter?: number,
  ): Promise<CsvFileDto> {
    const user = await this.userService.findOneById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const userAccounts = await this.getAll(userId);

    if (!userAccounts.length) {
      throw new NotFoundException(`No accounts found for this user.`);
    }

    const stakeAddresses: string[] = [];

    // LOYALTY CHECK
    for (const account of userAccounts) {
      if (
        await this.accountService.loyaltyCheck(
          account.stakeAddress,
          this.MIN_LOYALTY,
        )
      ) {
        stakeAddresses.push(account.stakeAddress);
      }
    }

    if (!stakeAddresses.length) {
      throw new NotFoundException(
        'No accounts meet the Armada loyalty requirement for export.',
      );
    }

    const history = await this.accountHistoryService.findByYearSelection(
      stakeAddresses,
      year,
      quarter,
    );

    if (!history.length) {
      throw new NotFoundException(
        `No reward history found for this user in year ${year}`,
      );
    }

    const baseCurrency = user.currency ? user.currency.code : 'USD';

    const filename = `${year}${quarter ? '-Q' + quarter : ''}-bulk-rewards-${
      format ? format : 'default'
    }.csv`;

    const fileInfo = await this.accountService.generateRewardCSV(
      filename,
      history,
      baseCurrency,
      format,
    );

    return new CsvFileDto({
      filename: filename,
      fileExpireAt: fileInfo.expireAt.toUTCString(),
      url: generateUrl(request, 'public/tmp', filename),
      format: format ? format : 'default',
      stakeAddress: stakeAddresses.join(', '),
      year: year.toString(),
    });
  }

  async getBulkTransactionsCSV(
    request: Request,
    userId: number,
    year: number,
    format?: string,
    quarter?: number,
  ): Promise<CsvFileDto> {
    const user = await this.userService.findOneById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const userAccounts = await this.getAll(userId);

    if (!userAccounts.length) {
      throw new NotFoundException(`No accounts found for this user.`);
    }

    const stakeAddresses: string[] = [];

    // LOYALTY CHECK
    for (const account of userAccounts) {
      if (
        await this.accountService.loyaltyCheck(
          account.stakeAddress,
          this.MIN_LOYALTY,
        )
      ) {
        stakeAddresses.push(account.stakeAddress);
      }
    }

    if (!stakeAddresses.length) {
      throw new NotFoundException(
        'No accounts meet the Armada loyalty requirement for export.',
      );
    }

    const history = await this.transactionService.findByYearSelection(
      stakeAddresses,
      year,
      quarter,
    );

    if (!history.length) {
      throw new NotFoundException(
        `No transaction history found for this user in year ${year}`,
      );
    }

    const filename = `${year}${quarter ? '-Q' + quarter : ''}-bulk-txs-${
      format ? format : 'default'
    }.csv`;

    const fileInfo = await this.transactionService.generateTransactionsCSV(
      filename,
      history,
      format,
    );

    return new CsvFileDto({
      filename: filename,
      fileExpireAt: fileInfo.expireAt.toUTCString(),
      url: generateUrl(request, 'public/tmp', filename),
      format: format ? format : 'default',
      stakeAddress: stakeAddresses.join(', '),
      year: year.toString(),
    });
  }

  // REPOSITORY

  async findUserAccount(
    userId: number,
    stakeAddress: string,
  ): Promise<UserAccount | null> {
    return this.em
      .getRepository(UserAccount)
      .createQueryBuilder('userAccount')
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
  ): Promise<UserAccount | null> {
    return this.em
      .getRepository(UserAccount)
      .createQueryBuilder('userAccount')
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
    return this.em
      .getRepository(UserAccount)
      .createQueryBuilder('userAccount')
      .innerJoinAndSelect('userAccount.account', 'account')
      .innerJoinAndSelect('userAccount.user', 'user')
      .where('user.id = :userId')
      .setParameter('userId', userId)
      .orderBy('userAccount.name', 'ASC')
      .getMany();
  }
}
