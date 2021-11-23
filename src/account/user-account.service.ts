import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AddUserAccountDto } from './dto/add-user-account.dto';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { AccountRepository } from './repositories/account.repository';
import { UpdateUserAccountDto } from './dto/update-user-account.dto';
import { UserAccountRepository } from './repositories/user-account.repository';
import { UserAccount } from './entities/user-account.entity';
import { SyncService } from './sync.service';
import { AccountService } from './account.service';
import { UserAccountDto } from './dto/user-account.dto';
import { PoolDto } from '../pool/dto/pool.dto';
import { AccountDto } from './dto/account.dto';
import { UserRepository } from '../user/repositories/user.repository';
import { BlockfrostService } from '../utils/api/blockfrost.service';

@Injectable()
export class UserAccountService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly syncService: SyncService,
    private readonly accountService: AccountService,
    private readonly source: BlockfrostService,
  ) {}

  async getAll(userId: number): Promise<UserAccountDto[]> {
    const userAccounts = await this.em
      .getCustomRepository(UserAccountRepository)
      .findAllUserAccount(userId);

    return userAccounts.map(
      (a) =>
        new UserAccountDto({
          stakeAddress: a.account.stakeAddress,
          name: a.name,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        }),
    );
  }

  async getAccountInfo(userId, stakeAddress: string): Promise<AccountDto> {
    const userAccount = await this.em
      .getCustomRepository(UserAccountRepository)
      .findUserAccountWithJoin(userId, stakeAddress);

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
      rewardsSum: account.rewardsSum,
      loyalty: account.loyalty,
      epoch: account.epoch ? account.epoch.epoch : null,
      pool: poolDto,
    });
  }

  async create(
    userId: number,
    userAccountDto: AddUserAccountDto,
  ): Promise<UserAccount> {
    const isStakeAddr = new RegExp('^stake[a-z0-9]{54}$');

    if (!isStakeAddr.test(userAccountDto.address)) {
      const addressInfo = await this.source.getAddressInfo(
        userAccountDto.address,
      );

      if (!addressInfo) {
        throw new BadRequestException(
          'Address invalid or service unavailable.',
        );
      }

      userAccountDto.address = addressInfo.stakeAddress;
    }

    let userAccount = await this.em
      .getCustomRepository(UserAccountRepository)
      .findUserAccount(userId, userAccountDto.address);

    if (userAccount) {
      throw new ConflictException(
        `Account ${userAccountDto.address} already linked.`,
      );
    }

    const user = await this.em
      .getCustomRepository(UserRepository)
      .findOne({ id: userId, active: true });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    let account = await this.em
      .getCustomRepository(AccountRepository)
      .findOne({ stakeAddress: userAccountDto.address });

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
    const userAccount = await this.em
      .getCustomRepository(UserAccountRepository)
      .findUserAccount(userId, updateUserAccountDto.stakeAddress);

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
    const userAccount = await this.em
      .getCustomRepository(UserAccountRepository)
      .findUserAccount(userId, stakeAddress);

    if (!userAccount) {
      throw new NotFoundException(`Account ${stakeAddress} not found.`);
    }

    try {
      await this.em.remove(userAccount);
    } catch (e) {
      throw new ConflictException(`Account ${stakeAddress} cannot be deleted.`);
    }
  }
}
