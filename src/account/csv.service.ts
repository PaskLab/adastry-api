import { Injectable, Logger } from '@nestjs/common';
import config from '../../config.json';
import { Cron } from '@nestjs/schedule';
import path from 'path';
import fs from 'fs';
import csvWriter = require('csv-writer');
import { CsvFileInfoType } from './types/csv-file-info.type';
import { CsvFieldsType } from './types/csv-fields.type';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Asset } from './entities/asset.entity';

@Injectable()
export class CsvService {
  private readonly logger = new Logger(CsvService.name);
  private readonly TMP_PATH = config.app.tmpPath;
  private readonly TMP_TTL = config.app.tmpFileTTL;

  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  /**
   * Use with "Rewards Export" only
   */
  async writeHistoryCSV(
    filename: string,
    data: CsvFieldsType[],
  ): Promise<CsvFileInfoType> {
    const filePath = path.join(__dirname, '../../..', this.TMP_PATH, filename);

    const writer = csvWriter.createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'date', title: 'Date' }, // YYYY-MM-DD HH:mm:ss
        { id: 'epoch', title: 'Epoch' },
        { id: 'rewards', title: 'Rewards' },
        { id: 'netWorthAmount', title: 'Net Worth Amount' },
        { id: 'netWorthCurrency', title: 'Net Worth Currency' },
        { id: 'activeStake', title: 'Active Stake' },
        { id: 'withdrawable', title: 'Withdrawable' },
        { id: 'withdrawn', title: 'Withdrawn' },
        { id: 'description', title: 'Description' },
      ],
    });

    const records: any = [];

    for (const row of data) {
      const record = {
        date: row.date,
        epoch: row.epoch,
        rewards: row.receivedAmount,
        netWorthAmount: row.netWorthAmount,
        netWorthCurrency: row.netWorthCurrency,
        activeStake: row.activeStake,
        withdrawable: row.withdrawable,
        withdrawn: row.withdrawn,
        description: row.description,
      };

      records.push(record);
    }

    await writer
      .writeRecords(records)
      .then(() => this.logger.log(`CSV ${filename} generated`));

    return {
      filename: filename,
      path: filePath,
      expireAt: this.getExpire(),
    };
  }

  /**
   * Use with "Rewards & Transaction Export"
   */
  async writeTransactionCSV(
    filename: string,
    data: CsvFieldsType[],
  ): Promise<CsvFileInfoType> {
    const filePath = path.join(__dirname, '../../..', this.TMP_PATH, filename);

    const writer = csvWriter.createObjectCsvWriter({
      path: filePath,
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

    for (const row of data) {
      const record = {
        date: row.date,
        sentAmount: row.sentAmount,
        sentCurrency: row.sentCurrency,
        receivedAmount: row.receivedAmount,
        receivedCurrency: row.receivedCurrency,
        feeAmount: row.feeAmount,
        feeCurrency: row.feeCurrency,
        netWorthAmount: row.netWorthAmount,
        netWorthCurrency: row.netWorthCurrency,
        label: row.label,
        description: row.description,
        txHash: row.txHash,
      };

      records.push(record);
    }

    await writer
      .writeRecords(records)
      .then(() => this.logger.log(`CSV ${filename} generated`));

    return {
      filename: filename,
      path: filePath,
      expireAt: this.getExpire(),
    };
  }

  /**
   * Use with "Rewards Export" Only
   */
  async writeSpoCSV(
    filename: string,
    data: CsvFieldsType[],
  ): Promise<CsvFileInfoType> {
    const filePath = path.join(__dirname, '../../..', this.TMP_PATH, filename);

    const writer = csvWriter.createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'date', title: 'Date' }, // YYYY-MM-DD HH:mm:ss
        { id: 'epoch', title: 'Epoch' },
        { id: 'rewards', title: 'Rewards' },
        { id: 'netWorthAmount', title: 'Net Worth Amount' },
        { id: 'netWorthCurrency', title: 'Net Worth Currency' },
        { id: 'activeStake', title: 'Active Stake' },
        { id: 'accountBalance', title: 'Account Balance' },
        { id: 'netRewards', title: 'Net Rewards' },
        { id: 'opRewards', title: 'Op Rewards' },
        { id: 'withdrawable', title: 'Withdrawable' },
        { id: 'withdrawn', title: 'Withdrawn' },
        { id: 'description', title: 'Description' },
      ],
    });

    const records: any = [];

    for (const row of data) {
      const record = {
        date: row.date,
        epoch: row.epoch,
        rewards: row.receivedAmount,
        netWorthAmount: row.netWorthAmount,
        netWorthCurrency: row.netWorthCurrency,
        activeStake: row.activeStake,
        accountBalance: row.accountBalance,
        netRewards: row.revisedRewards,
        opRewards: row.opRewards,
        stakeShare: row.stakeShare,
        withdrawable: row.withdrawable,
        withdrawn: row.withdrawn,
        description: row.description,
      };

      records.push(record);
    }

    await writer
      .writeRecords(records)
      .then(() => this.logger.log(`CSV ${filename} generated`));

    return {
      filename: filename,
      path: filePath,
      expireAt: this.getExpire(),
    };
  }

  /**
   * Use with "Rewards Export" Only
   */
  async writeMultiOwnerCSV(
    filename: string,
    data: CsvFieldsType[],
  ): Promise<CsvFileInfoType> {
    const filePath = path.join(__dirname, '../../..', this.TMP_PATH, filename);

    const writer = csvWriter.createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'date', title: 'Date' }, // YYYY-MM-DD HH:mm:ss
        { id: 'epoch', title: 'Epoch' },
        { id: 'rewards', title: 'Rewards' },
        { id: 'netWorthAmount', title: 'Net Worth Amount' },
        { id: 'netWorthCurrency', title: 'Net Worth Currency' },
        { id: 'activeStake', title: 'Active Stake' },
        { id: 'accountBalance', title: 'Account Balance' },
        { id: 'realRewards', title: 'Real Rewards' },
        { id: 'netRewards', title: 'Net Rewards' },
        { id: 'opRewards', title: 'Op Rewards' },
        { id: 'stakeShare', title: 'Stake Share' },
        { id: 'withdrawable', title: 'Withdrawable' },
        { id: 'withdrawn', title: 'Withdrawn' },
        { id: 'description', title: 'Description' },
      ],
    });

    const records: any = [];

    for (const row of data) {
      const record = {
        date: row.date,
        epoch: row.epoch,
        rewards: row.receivedAmount,
        netWorthAmount: row.netWorthAmount,
        netWorthCurrency: row.netWorthCurrency,
        activeStake: row.activeStake,
        accountBalance: row.accountBalance,
        realRewards: row.realRewards,
        netRewards: row.revisedRewards,
        opRewards: row.opRewards,
        stakeShare: row.stakeShare,
        withdrawable: row.withdrawable,
        withdrawn: row.withdrawn,
        description: row.description,
      };

      records.push(record);
    }

    await writer
      .writeRecords(records)
      .then(() => this.logger.log(`CSV ${filename} generated`));

    return {
      filename: filename,
      path: filePath,
      expireAt: this.getExpire(),
    };
  }

  async writeKoinlyCSV(
    filename: string,
    data: CsvFieldsType[],
  ): Promise<CsvFileInfoType> {
    const filePath = path.join(__dirname, '../../..', this.TMP_PATH, filename);

    const writer = csvWriter.createObjectCsvWriter({
      path: filePath,
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
    const nftCount: { [key: string]: number } = {};
    const tokenCount: { [key: string]: number } = {};

    for (const row of data) {
      // Koinly doesn't support native assets, replace for wildcards
      let sentCurrency = row.sentCurrency;
      let receivedCurrency = row.receivedCurrency;
      let description = row.description;
      const realTxHash = row.txHash.slice(-64);

      if (row.sentCurrency.length && row.sentCurrency !== 'ADA') {
        const asset = await this.em
          .getRepository(Asset)
          .findOne({ where: { hexId: row.sentCurrency } });

        if (!asset || BigInt(asset.quantity) !== BigInt(1)) {
          tokenCount[realTxHash] = tokenCount[realTxHash]
            ? tokenCount[realTxHash] + 1
            : 1;

          sentCurrency = 'NULL' + tokenCount[realTxHash];
          description = `(${sentCurrency} = ${row.sentCurrency}) ${description}`;
        } else {
          nftCount[realTxHash] = nftCount[realTxHash]
            ? nftCount[realTxHash] + 1
            : 1;

          sentCurrency = 'NFT' + nftCount[realTxHash];
          description = `(${sentCurrency} = ${row.sentCurrency}) ${description}`;
        }
      }

      if (row.receivedCurrency.length && row.receivedCurrency !== 'ADA') {
        const asset = await this.em
          .getRepository(Asset)
          .findOne({ where: { hexId: row.receivedCurrency } });

        if (!asset || BigInt(asset.quantity) !== BigInt(1)) {
          tokenCount[realTxHash] = tokenCount[realTxHash]
            ? tokenCount[realTxHash] + 1
            : 1;

          receivedCurrency = 'NULL' + tokenCount[realTxHash];
          description = `(${receivedCurrency} = ${row.receivedCurrency}) ${description}`;
        } else {
          nftCount[realTxHash] = nftCount[realTxHash]
            ? nftCount[realTxHash] + 1
            : 1;

          receivedCurrency = 'NFT' + nftCount[realTxHash];
          description = `(${receivedCurrency} = ${row.receivedCurrency}) ${description}`;
        }
      }

      const record = {
        date: row.date,
        sentAmount:
          row.sentAmount.toString() === '0' && row.feeAmount != ''
            ? row.feeAmount
            : row.sentAmount, // Handle self transaction
        sentCurrency: sentCurrency,
        receivedAmount: row.receivedAmount,
        receivedCurrency: receivedCurrency,
        feeAmount: row.feeAmount,
        feeCurrency:
          row.sentAmount.toString() === '0' && row.feeAmount != ''
            ? ''
            : row.feeCurrency, // Handle self transaction
        netWorthAmount: row.netWorthAmount,
        netWorthCurrency: row.netWorthCurrency,
        label:
          row.sentAmount.toString() === '0' && row.feeAmount != ''
            ? 'Cost'
            : row.label, // Handle self transaction
        description: description,
        txHash: row.txHash,
      };
      records.push(record);
    }

    await writer
      .writeRecords(records)
      .then(() => this.logger.log(`CSV ${filename} generated`));

    return {
      filename: filename,
      path: filePath,
      expireAt: this.getExpire(),
    };
  }

  private getExpire(): Date {
    const expireAt = new Date();
    expireAt.setTime(expireAt.valueOf() + this.TMP_TTL * 1000);
    return expireAt;
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
