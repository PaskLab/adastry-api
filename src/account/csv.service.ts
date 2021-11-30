import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import config from '../../config.json';
import { Cron } from '@nestjs/schedule';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { CsvFileDto } from './dto/csv-file.dto';
import { AccountHistoryRepository } from './repositories/account-history.repository';
import {
  createTimestamp,
  dateFromUnix,
  generateUrl,
  roundTo,
  toAda,
} from '../utils/utils';
import crypto from 'crypto';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import csvWriter = require('csv-writer');
import { AccountHistory } from './entities/account-history.entity';
import { UserRepository } from '../user/repositories/user.repository';
import { SpotRepository } from '../spot/repositories/spot.repository';
import { RateRepository } from '../spot/repositories/rate.repository';

@Injectable()
export class CsvService {
  private readonly logger = new Logger(CsvService.name);
  private readonly TMP_PATH = config.app.tmpPath;
  private readonly TMP_TTL = config.app.tmpFileTTL;

  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async getRewardsCSV(
    request: Request,
    userId: number,
    stakeAddress: string,
    year: number,
    format?: string,
  ): Promise<CsvFileDto> {
    const history = await this.em
      .getCustomRepository(AccountHistoryRepository)
      .findByYear(stakeAddress, year);

    if (!history.length) {
      throw new NotFoundException(
        `No reward history found for ${stakeAddress} in year ${year}`,
      );
    }

    const user = await this.em
      .getCustomRepository(UserRepository)
      .findOneById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const baseCurrency = user.currency ? user.currency.code : 'USD';

    const filename = `${year}-${stakeAddress.slice(0, 15)}-${
      format ? format : 'full'
    }.csv`;

    switch (format) {
      case 'koinly':
        await this.writeKoinlyCSV(filename, history, baseCurrency);
        break;
      default:
        await this.writeFullCSV(filename, history, baseCurrency);
    }

    const expireAt = new Date();
    expireAt.setTime(expireAt.valueOf() + this.TMP_TTL * 1000);

    return new CsvFileDto({
      filename: filename,
      fileExpireAt: expireAt.toUTCString(),
      url: generateUrl(request, 'public/tmp', filename),
      format: 'full',
      stakeAddress: stakeAddress,
      year: year.toString(),
    });
  }

  private async writeFullCSV(
    filename: string,
    history: AccountHistory[],
    baseCurrency: string,
  ): Promise<void> {
    const writer = csvWriter.createObjectCsvWriter({
      path: path.join(__dirname, '../../..', this.TMP_PATH, filename),
      header: [
        { id: 'date', title: 'Date' }, // YYYY-MM-DD HH:mm:ss
        { id: 'sentAmount', title: 'Sent Amount' }, // 0.00
        { id: 'sentCurrency', title: 'Sent Currency' },
        { id: 'receivedAmount', title: 'Received Amount' },
        { id: 'receivedCurrency', title: 'Received Currency' }, // ADA
        { id: 'feeAmount', title: 'Fee Amount' },
        { id: 'feeCurrency', title: 'Fee Currency' },
        { id: 'netWorthAmount', title: 'Net Worth Amount' },
        { id: 'netWorthCurrency', title: 'Net Worth Currency' },
        { id: 'label', title: 'Label' }, // reward
        { id: 'description', title: 'Description' },
        { id: 'txHash', title: 'TxHash' },
        { id: 'accountBalance', title: 'Account Balance' },
        { id: 'realRewards', title: 'Real Rewards' },
        { id: 'revisedRewards', title: 'Revised Rewards' },
        { id: 'opRewards', title: 'Op Rewards' },
        { id: 'stakeShare', title: 'Stake Share' },
        { id: 'withdrawable', title: 'Withdrawable' },
        { id: 'withdrawn', title: 'Withdrawn' },
      ],
    });

    const records: any = [];

    for (const record of history) {
      if (
        record.rewards < 1 &&
        record.revisedRewards < 1 &&
        record.opRewards < 1
      )
        continue;

      const receivedAmount =
        record.revisedRewards || record.opRewards
          ? record.revisedRewards + record.opRewards
          : record.rewards;

      const netWorthAmount = await this.getNetWorth(
        toAda(receivedAmount),
        baseCurrency,
        record.epoch.epoch,
      );

      const line = {
        date: createTimestamp(dateFromUnix(record.epoch.startTime)),
        sentAmount: '',
        sentCurrency: '',
        receivedAmount: toAda(receivedAmount),
        receivedCurrency: 'ADA',
        feeAmount: 0,
        feeCurrency: 'ADA',
        netWorthAmount: netWorthAmount ? netWorthAmount : '',
        netWorthCurrency: baseCurrency,
        label: 'reward',
        description: `Epoch ${record.epoch.epoch} for ${record.account.stakeAddress}`,
        txHash: crypto
          .createHash('sha256')
          .update(record.epoch.epoch + record.account.stakeAddress)
          .digest('hex'),
        accountBalance: toAda(record.balance),
        realRewards: toAda(record.rewards),
        revisedRewards: toAda(record.revisedRewards),
        opRewards: toAda(record.opRewards),
        stakeShare: record.stakeShare,
        withdrawable: toAda(record.withdrawable),
        withdrawn: toAda(record.withdrawn),
      };
      records.push(line);
    }

    await writer
      .writeRecords(records)
      .then(() => this.logger.log(`Rewards CSV ${filename} generated`));
  }

  private async writeKoinlyCSV(
    filename: string,
    history: AccountHistory[],
    baseCurrency: string,
  ): Promise<void> {
    const writer = csvWriter.createObjectCsvWriter({
      path: path.join(__dirname, '../../..', this.TMP_PATH, filename),
      header: [
        { id: 'date', title: 'Date' }, // YYYY-MM-DD HH:mm:ss
        { id: 'sentAmount', title: 'Sent Amount' }, // 0.00
        { id: 'sentCurrency', title: 'Sent Currency' },
        { id: 'receivedAmount', title: 'Received Amount' },
        { id: 'receivedCurrency', title: 'Received Currency' }, // ADA
        { id: 'feeAmount', title: 'Fee Amount' },
        { id: 'feeCurrency', title: 'Fee Currency' },
        { id: 'netWorthAmount', title: 'Net Worth Amount' },
        { id: 'netWorthCurrency', title: 'Net Worth Currency' },
        { id: 'label', title: 'Label' }, // reward
        { id: 'description', title: 'Description' },
        { id: 'txHash', title: 'TxHash' },
      ],
    });

    const records: any = [];

    for (const record of history) {
      if (
        record.rewards < 1 &&
        record.revisedRewards < 1 &&
        record.opRewards < 1
      )
        continue;

      const receivedAmount =
        record.revisedRewards || record.opRewards
          ? record.revisedRewards + record.opRewards
          : record.rewards;

      const netWorthAmount = await this.getNetWorth(
        toAda(receivedAmount),
        baseCurrency,
        record.epoch.epoch,
      );

      const line = {
        date: createTimestamp(dateFromUnix(record.epoch.startTime)),
        sentAmount: '',
        sentCurrency: '',
        receivedAmount: toAda(receivedAmount),
        receivedCurrency: 'ADA',
        feeAmount: 0,
        feeCurrency: 'ADA',
        netWorthAmount: netWorthAmount ? netWorthAmount : '',
        netWorthCurrency: baseCurrency,
        label: 'reward',
        description: `Epoch ${record.epoch.epoch} for ${record.account.stakeAddress}`,
        txHash: crypto
          .createHash('sha256')
          .update(record.epoch.epoch + record.account.stakeAddress)
          .digest('hex'),
      };
      records.push(line);
    }

    await writer
      .writeRecords(records)
      .then(() => this.logger.log(`Rewards CSV ${filename} generated`));
  }

  private async getNetWorth(
    amount: number,
    baseCurrency: string,
    epoch: number,
  ): Promise<number> {
    const spotPrice = await this.em
      .getCustomRepository(SpotRepository)
      .findEpoch(epoch);
    const baseCurrencyRate = await this.em
      .getCustomRepository(RateRepository)
      .findRateEpoch(baseCurrency, epoch);

    let netWorthAmount = 0;

    if (spotPrice && baseCurrencyRate) {
      netWorthAmount = amount * spotPrice.price * baseCurrencyRate.rate;
      netWorthAmount = roundTo(netWorthAmount, 2);
    }

    return netWorthAmount;
  }

  @Cron('*/2 * * * *', { name: 'Temporary folder cleanup' })
  private async cleanTMPFiles(): Promise<void> {
    const tmpFileTTL = config.app.tmpFileTTL;
    const absolutePath = path.join(__dirname, '../../..', this.TMP_PATH);

    const files = fs.readdirSync(absolutePath);
    const result: string[] = [];

    files.forEach((fileName) => {
      if ('.gitignore' !== fileName) {
        const filePath = `${absolutePath}/${fileName}`;
        const fileStat = fs.lstatSync(filePath);
        const now = new Date(Date.now());
        const expireAt = new Date(
          new Date(fileStat.mtime).getTime() + tmpFileTTL * 1000,
        );

        if (expireAt < now) {
          fs.unlinkSync(filePath);
          result.push(fileName);
        }
      }
    });

    const count = result.length;

    if (count) {
      this.logger.log(`Deleted ${count} expired file(s) in /${this.TMP_PATH}`);
      this.logger.log(result);
    }
  }
}
