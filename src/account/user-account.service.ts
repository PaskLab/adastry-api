import {
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

@Injectable()
export class UserAccountService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly syncService: SyncService,
    private readonly accountService: AccountService,
  ) {}

  async create(
    userId: number,
    userAccountDto: AddUserAccountDto,
  ): Promise<UserAccount> {
    let userAccount = await this.em
      .getCustomRepository(UserAccountRepository)
      .findUserAccount(userId, userAccountDto.stakeAddress);

    if (userAccount) {
      throw new ConflictException(
        `Account ${userAccountDto.stakeAddress} already linked.`,
      );
    }

    let account = await this.em
      .getCustomRepository(AccountRepository)
      .findOne({ stakeAddress: userAccountDto.stakeAddress });

    if (!account) {
      account = await this.accountService.create(userAccountDto.stakeAddress);
    }

    userAccount = new UserAccount();
    userAccount.account = account;
    userAccount.name = userAccountDto.name;

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
