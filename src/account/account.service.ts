import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { AccountRepository } from './repositories/account.repository';
import { Account } from './entities/account.entity';
import { AccountDto } from './dto/account.dto';
import { PoolDto } from '../pool/dto/pool.dto';
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

  async getAccountInfo(stakeAddress: string): Promise<AccountDto> {
    const account = await this.em
      .getCustomRepository(AccountRepository)
      .findOneWithJoin(stakeAddress);

    if (!account) {
      throw new NotFoundException(`Account ${stakeAddress} not found.`);
    }

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

    const dto = new AccountDto();
    dto.stakeAddress = account.stakeAddress;
    dto.epoch = account.epoch ? account.epoch.epoch : null;
    dto.pool = poolDto;
    dto.loyalty = account.loyalty;
    dto.rewardsSum = account.rewardsSum;

    return dto;
  }

  async getHistory(params: HistoryQueryType): Promise<AccountHistoryDto[]> {
    const history = await this.em
      .getCustomRepository(AccountHistoryRepository)
      .findAccountHistory(params);

    return history.map((h) => {
      return new AccountHistoryDto({
        account: h.account.stakeAddress,
        epoch: h.epoch.epoch,
        balance: h.balance,
        rewards: h.rewards,
        rewardsBalance: h.rewardsBalance,
        fullBalance: h.fullBalance,
        opRewards: h.opRewards,
        pool: h.pool ? h.pool.poolId : null,
        owner: h.owner,
      });
    });
  }
}
