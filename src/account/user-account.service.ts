import {
  ConflictException,
  forwardRef,
  Inject,
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
import { TransactionService } from './transaction.service';
import { UserPoolDto } from './dto/user-pool.dto';
import { Pool } from '../pool/entities/pool.entity';
import { BillingService } from '../billing/billing.service';
import { AccountCategoryService } from './account-category.service';

@Injectable()
export class UserAccountService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly syncService: SyncService,
    private readonly accountService: AccountService,
    private readonly accountHistoryService: AccountHistoryService,
    private readonly transactionService: TransactionService,
    private readonly userService: UserService,
    @Inject(forwardRef(() => BillingService))
    private readonly billingService: BillingService,
    @Inject(forwardRef(() => AccountCategoryService))
    private readonly categoryService: AccountCategoryService,
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

  async getUserDelegatedPools(userId: number): Promise<UserPoolDto[]> {
    const userAccounts = await this.findAllUserAccountWithPool(userId);

    const pools: Pool[] = [];

    for (const uA of userAccounts) {
      if (
        uA.account.pool &&
        !pools.some((p) => p.poolId === uA.account.pool?.poolId)
      ) {
        pools.push(uA.account.pool);
      }
    }

    const activePools = pools.length
      ? await this.billingService.findActivePools(
          pools.map((p) => p.poolId),
          true,
        )
      : [];

    const userPools: UserPoolDto[] = [];

    for (const pool of pools) {
      const subscription = activePools.find(
        (aP) => aP.pool.poolId === pool.poolId,
      );

      const userPoolDto = new UserPoolDto({
        poolId: pool.poolId,
        name: pool.name,
        isMember: pool.isMember,
        isSubscribed: subscription ? subscription.invoice.confirmed : false,
        pending: subscription ? !subscription.invoice.confirmed : false,
      });

      userPools.push(userPoolDto);
    }

    return userPools;
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

    // Get premium state
    const accountState = await this.billingService.getUserAccountState(
      userId,
      stakeAddress,
    );

    return new AccountDto({
      name: userAccount.name,
      stakeAddress: account.stakeAddress,
      active: account.active,
      premiumPlan: accountState.type,
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
    month?: number,
    format?: string,
    quarter?: number,
    slug?: string,
  ): Promise<CsvFileDto> {
    const user = await this.userService.findOneById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const userAccountsState = await this.billingService.getAllUserAccountsState(
      userId,
    );

    let stakeAddresses: string[] = [];

    // PREMIUM CHECK
    for (const state of userAccountsState) {
      if (state.active) {
        stakeAddresses.push(state.stakeAddress);
      }
    }

    if (!stakeAddresses.length) {
      throw new NotFoundException('No account subscribed to premium plan.');
    }

    if (slug) {
      const categoryAccounts =
        await this.categoryService.findCategoryAccountsBySlug(userId, slug);
      stakeAddresses = stakeAddresses.filter((stakeAddress) =>
        categoryAccounts.some(
          (cA) => cA.account.account.stakeAddress === stakeAddress,
        ),
      );
    }

    const history = await this.accountHistoryService.findByYearSelection(
      stakeAddresses,
      year,
      month,
      quarter,
    );

    if (!history.length) {
      throw new NotFoundException(
        `No reward history found for this user in the selected date range.`,
      );
    }

    const baseCurrency = user.currency ? user.currency.code : 'USD';

    const filename = `${year}${quarter ? '-Q' + quarter : ''}-bulk-rewards-${
      format ? format : 'default'
    }.csv`;

    const fileInfo = await this.accountService.generateRewardCSV(
      userId,
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
    month?: number,
    format?: string,
    quarter?: number,
    slug?: string,
  ): Promise<CsvFileDto> {
    const user = await this.userService.findOneById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const userAccountsState = await this.billingService.getAllUserAccountsState(
      userId,
    );

    let stakeAddresses: string[] = [];

    // PREMIUM CHECK
    for (const state of userAccountsState) {
      if (state.active) {
        stakeAddresses.push(state.stakeAddress);
      }
    }

    if (!stakeAddresses.length) {
      throw new NotFoundException('No account subscribed to premium plan.');
    }

    if (slug) {
      const categoryAccounts =
        await this.categoryService.findCategoryAccountsBySlug(userId, slug);
      stakeAddresses = stakeAddresses.filter((stakeAddress) =>
        categoryAccounts.some(
          (cA) => cA.account.account.stakeAddress === stakeAddress,
        ),
      );
    }

    const history = await this.transactionService.findByYearSelection(
      stakeAddresses,
      year,
      month,
      quarter,
    );

    if (!history.length) {
      throw new NotFoundException(
        `No transaction history found for this user in the selected date range.`,
      );
    }

    const filename = `${year}${quarter ? '-Q' + quarter : ''}-bulk-txs-${
      format ? format : 'default'
    }.csv`;

    const fileInfo = await this.transactionService.generateTransactionsCSV(
      userId,
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
      .leftJoinAndSelect('account.pool', 'pool')
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
      .leftJoinAndSelect('account.pool', 'pool')
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
      .leftJoinAndSelect('account.pool', 'pool')
      .where('user.id = :userId')
      .setParameter('userId', userId)
      .orderBy('userAccount.name', 'ASC')
      .getMany();
  }

  async findAllUserAccountWithPool(userId: number): Promise<UserAccount[]> {
    return this.em
      .getRepository(UserAccount)
      .createQueryBuilder('userAccount')
      .innerJoinAndSelect('userAccount.account', 'account')
      .innerJoinAndSelect('account.pool', 'pool')
      .innerJoin('userAccount.user', 'user')
      .where('user.id = :userId')
      .setParameter('userId', userId)
      .orderBy('userAccount.name', 'ASC')
      .getMany();
  }
}
