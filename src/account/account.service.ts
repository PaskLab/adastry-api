import {
  BadRequestException,
  Body,
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
import { EpochDto } from '../epoch/dto/epoch.dto';
import { PoolDto } from '../pool/dto/pool.dto';
import { CurrencyDto } from '../spot/dto/currency.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

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

    let epochDto: EpochDto | null = null;

    if (account.epoch) {
      let epochDto = new EpochDto();
      epochDto.epoch = account.epoch.epoch;
      epochDto.startTime = account.epoch.startTime;
      epochDto.endTime = account.epoch.endTime;
    }

    let poolDto: PoolDto | null = null;

    if (account.pool) {
      poolDto = new PoolDto();
      poolDto.poolId = account.pool.poolId;
      poolDto.name = account.pool.name;
      poolDto.blocksMinted = account.pool.blocksMinted;
      poolDto.liveStake = account.pool.liveStake;
      poolDto.liveSaturation = account.pool.liveSaturation;
      poolDto.liveDelegators = account.pool.liveDelegators;
      poolDto.epoch = account.pool.epoch;
      poolDto.isMember = account.pool.isMember;
    }

    let currencyDto: CurrencyDto | null = null;

    if (account.currency) {
      currencyDto = new CurrencyDto();
      currencyDto.code = account.currency.code;
      currencyDto.name = account.currency.name;
    }

    const dto = new AccountDto();
    dto.stakeAddress = account.stakeAddress;
    dto.name = account.name;
    dto.epoch = epochDto;
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

    await this.em.remove(account);
  }
}
