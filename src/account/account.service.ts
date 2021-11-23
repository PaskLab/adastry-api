import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
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
import csvWriter = require('csv-writer');
import config from '../../config.json';
import path from 'path';
import { createTimestamp, dateFromUnix, generateUrl } from '../utils/utils';
import * as crypto from 'crypto';
import { CsvFileDto } from './dto/csv-file.dto';
import { Request } from 'express';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(SyncService.name);
  private readonly MIN_LOYALTY = config.app.minLoyalty;
  private readonly TMP_PATH = config.app.tmpPath;
  private readonly TMP_TTL = config.app.tmpFileTTL;

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

  async getRewardsCSV(
    request: Request,
    stakeAddress: string,
    year: number,
    format?: string,
  ): Promise<CsvFileDto> {
    const account = await this.em
      .getCustomRepository(AccountRepository)
      .findOne({ stakeAddress: stakeAddress });

    if (account && account.loyalty < this.MIN_LOYALTY) {
      throw new BadRequestException(
        `Account must be delegated to Armada-Alliance for at least ${this.MIN_LOYALTY} epoch.`,
      );
    }

    const history = await this.em
      .getCustomRepository(AccountHistoryRepository)
      .findByYear(stakeAddress, year);

    if (!history.length) {
      throw new NotFoundException(
        `No reward history found for ${stakeAddress} in year ${year}`,
      );
    }

    const filename = `${year}-${stakeAddress.slice(0, 15)}.csv`;
    const writer = csvWriter.createObjectCsvWriter({
      path: path.join(__dirname, '../../..', this.TMP_PATH, filename),
      header: [
        { id: 'date', title: 'Date' }, // YYYY-MM-DD HH:mm:ss
        { id: 'sentAmount', title: 'Sent Amount' }, // 0.00
        { id: 'sentCurrency', title: 'Sent Currency' },
        { id: 'receivedAmount', title: 'Received Amount' },
        { id: 'receivedCurrency', title: 'Received Currency' }, // ADA
        { id: 'label', title: 'Label' }, // reward
        { id: 'description', title: 'Description' },
        { id: 'txHash', title: 'TxHash' },
      ],
    });

    const records: any = [];

    for (const record of history) {
      if (record.rewards < 1) continue;

      const line = {
        date: createTimestamp(dateFromUnix(record.epoch.startTime)),
        sentAmount: '',
        sentCurrency: '',
        receivedAmount: record.rewards.toString(),
        receivedCurrency: 'ADA',
        label: 'reward',
        description: `Epoch ${record.epoch.epoch} for ${stakeAddress}`,
        txHash: crypto
          .createHash('sha256')
          .update(record.epoch.epoch + stakeAddress)
          .digest('hex'),
      };
      records.push(line);
    }

    await writer
      .writeRecords(records)
      .then(() => this.logger.log(`Rewards CSV ${filename} generated`));

    const expireAt = new Date();
    expireAt.setTime(expireAt.valueOf() + this.TMP_TTL * 1000);

    return new CsvFileDto({
      filename: filename,
      fileExpireAt: expireAt.toUTCString(),
      url: generateUrl(request, 'public/tmp', filename),
      format: format ? format : 'koinly',
      stakeAddress: stakeAddress,
      year: year.toString(),
    });
  }
}
