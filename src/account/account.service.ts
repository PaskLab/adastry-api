import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { AccountRepository } from './repositories/account.repository';
import { Account } from './entities/account.entity';
import { HistoryQueryType } from './types/history-query.type';
import { AccountHistoryRepository } from './repositories/account-history.repository';
import { AccountHistoryDto } from './dto/account-history.dto';
import { SyncService } from './sync.service';
import { EpochRepository } from '../epoch/repositories/epoch.repository';

@Injectable()
export class AccountService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly syncService: SyncService,
  ) {}

  async create(stakeAddress: string): Promise<Account> {
    let account = await this.em
      .getCustomRepository(AccountRepository)
      .findOne({ stakeAddress: stakeAddress });

    if (account) {
      throw new ConflictException('Stake account already exist.');
    }

    account = new Account();
    account.stakeAddress = stakeAddress;

    account = await this.em.save(account);

    const lastEpoch = await this.em
      .getCustomRepository(EpochRepository)
      .findLastEpoch();

    if (lastEpoch) {
      this.syncService.syncAccount(account, lastEpoch);
    }

    return account;
  }

  async remove(stakeAddress: string): Promise<void> {
    const account = await this.em
      .getCustomRepository(AccountRepository)
      .findOne({ stakeAddress: stakeAddress });

    if (!account) {
      throw new NotFoundException(`Account ${stakeAddress} not found.`);
    }

    try {
      await this.em.remove(account);
    } catch (e) {
      throw new ConflictException(`Account ${stakeAddress} cannot be deleted.`);
    }
  }

  async getHistory(params: HistoryQueryType): Promise<AccountHistoryDto[]> {
    const history = await this.em
      .getCustomRepository(AccountHistoryRepository)
      .findAccountHistory(params);

    return history.map((h) => {
      return new AccountHistoryDto({
        account: h.account.stakeAddress,
        epoch: h.epoch.epoch,
        rewards: h.rewards,
        fullBalance: h.fullBalance,
        opRewards: h.opRewards,
        pool: h.pool ? h.pool.poolId : null,
        owner: h.owner,
      });
    });
  }
}
