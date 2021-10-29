import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAccountDto } from './dto/create-account.dto';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { AccountRepository } from './repositories/account.repository';
import { Account } from './entities/account.entity';
import { CurrencyRepository } from '../spot/repositories/currency.repository';
import { AccountDto } from './dto/account.dto';
import { PoolDto } from '../pool/dto/pool.dto';
import { CurrencyDto } from '../spot/dto/currency.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { HistoryQueryType } from './types/history-query.type';
import { AccountHistoryRepository } from './repositories/account-history.repository';
import { AccountHistoryDto } from './dto/account-history.dto';

@Injectable()
export class AccountService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async create(createAccountDto: CreateAccountDto): Promise<Account> {
    let account = await this.em
      .getCustomRepository(AccountRepository)
      .findOne({ stakeAddress: createAccountDto.stakeAddress });

    if (account) {
      throw new ConflictException('Stake account already exist.');
    }

    const currency = await this.em
      .getCustomRepository(CurrencyRepository)
      .findOne({
        code: createAccountDto.currency ? createAccountDto.currency : 'USD',
      });

    if (!currency) {
      throw new BadRequestException(
        `Currency code [${createAccountDto.currency}] not supported.`,
      );
    }

    account = new Account();
    account.stakeAddress = createAccountDto.stakeAddress;
    account.name = createAccountDto.name;
    account.currency = currency;

    return this.em.save(account);
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

    let currencyDto: CurrencyDto | null = null;

    if (account.currency) {
      currencyDto = new CurrencyDto({
        code: account.currency.code,
        name: account.currency.name,
      });
    }

    const dto = new AccountDto();
    dto.stakeAddress = account.stakeAddress;
    dto.name = account.name;
    dto.epoch = account.epoch ? account.epoch.epoch : null;
    dto.currency = currencyDto;
    dto.pool = poolDto;
    dto.loyalty = account.loyalty;
    dto.rewardsSum = account.rewardsSum;

    return dto;
  }

  async update(
    stakeAddress: string,
    updateAccountDto: UpdateAccountDto,
  ): Promise<Account> {
    const account = await this.em
      .getCustomRepository(AccountRepository)
      .findOne({ stakeAddress: stakeAddress });

    if (!account) {
      throw new NotFoundException(`Account ${stakeAddress} not found.`);
    }

    if (updateAccountDto.name) {
      account.name = updateAccountDto.name;
    }

    if (updateAccountDto.currency) {
      const currency = await this.em
        .getCustomRepository(CurrencyRepository)
        .findOne({ code: updateAccountDto.currency });

      if (!currency) {
        throw new BadRequestException(
          `Currency code [${updateAccountDto.currency}] not supported.`,
        );
      }

      account.currency = currency;
    }

    return this.em.save(account);
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

  async getAccountHistory(
    params: HistoryQueryType,
  ): Promise<AccountHistoryDto[]> {
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
