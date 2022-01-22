import { Injectable, Logger } from '@nestjs/common';
import config from '../../config.json';
import { Cron } from '@nestjs/schedule';
import path from 'path';
import fs from 'fs';
import csvWriter = require('csv-writer');
import { CsvFileInfoType } from './types/csv-file-info.type';
import { CsvFieldsType } from './types/csv-fields.type';
import { AssetRepository } from './repositories/asset.repository';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { parseAssetHex } from '../utils/utils';

@Injectable()
export class CsvService {
  private readonly logger = new Logger(CsvService.name);
  private readonly TMP_PATH = config.app.tmpPath;
  private readonly TMP_TTL = config.app.tmpFileTTL;

  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async writeFullCSV(
    filename: string,
    data: CsvFieldsType[],
  ): Promise<CsvFileInfoType> {
    const filePath = path.join(__dirname, '../../..', this.TMP_PATH, filename);
    const header = [
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
    ];
    const writer = csvWriter.createObjectCsvWriter({
      path: filePath,
      header:
        data[0]?.accountBalance !== undefined
          ? header.concat([
              // Extended fields
              { id: 'accountBalance', title: 'Account Balance' },
              { id: 'realRewards', title: 'Real Rewards' },
              { id: 'revisedRewards', title: 'Revised Rewards' },
              { id: 'opRewards', title: 'Op Rewards' },
              { id: 'stakeShare', title: 'Stake Share' },
              { id: 'withdrawable', title: 'Withdrawable' },
              { id: 'withdrawn', title: 'Withdrawn' },
            ])
          : header,
    });

    const records: any = [];

    for (const row of data) {
      let record = {
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

      if (row.accountBalance !== undefined) {
        // Extended fields
        record = Object.assign(record, {
          accountBalance: row.accountBalance,
          realRewards: row.realRewards,
          revisedRewards: row.revisedRewards,
          opRewards: row.opRewards,
          stakeShare: row.stakeShare,
          withdrawable: row.withdrawable,
          withdrawn: row.withdrawn,
        });
      }

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
          .getCustomRepository(AssetRepository)
          .findOne({ hexId: row.sentCurrency });

        if (!asset || BigInt(asset.quantity) !== BigInt(1)) {
          tokenCount[realTxHash] = tokenCount[realTxHash]
            ? tokenCount[realTxHash] + 1
            : 1;

          sentCurrency = 'NULL' + tokenCount[realTxHash];
          description = `(${sentCurrency} = ${
            parseAssetHex(row.sentCurrency).name
          }) ${description}`;
        } else {
          nftCount[realTxHash] = nftCount[realTxHash]
            ? nftCount[realTxHash] + 1
            : 1;

          sentCurrency = 'NFT' + nftCount[realTxHash];
          description = `(${sentCurrency} = ${
            parseAssetHex(row.sentCurrency).name
          }) ${description}`;
        }
      }

      if (row.receivedCurrency.length && row.receivedCurrency !== 'ADA') {
        const asset = await this.em
          .getCustomRepository(AssetRepository)
          .findOne({ hexId: row.receivedCurrency });

        if (!asset || BigInt(asset.quantity) !== BigInt(1)) {
          tokenCount[realTxHash] = tokenCount[realTxHash]
            ? tokenCount[realTxHash] + 1
            : 1;

          receivedCurrency = 'NULL' + tokenCount[realTxHash];
          description = `(${receivedCurrency} = ${
            parseAssetHex(row.receivedCurrency).name
          }) ${description}`;
        } else {
          nftCount[realTxHash] = nftCount[realTxHash]
            ? nftCount[realTxHash] + 1
            : 1;

          receivedCurrency = 'NFT' + nftCount[realTxHash];
          description = `(${receivedCurrency} = ${
            parseAssetHex(row.receivedCurrency).name
          }) ${description}`;
        }
      }

      const record = {
        date: row.date,
        sentAmount: row.sentAmount,
        sentCurrency: sentCurrency,
        receivedAmount: row.receivedAmount,
        receivedCurrency: receivedCurrency,
        feeAmount: row.feeAmount,
        feeCurrency: row.feeCurrency,
        netWorthAmount: row.netWorthAmount,
        netWorthCurrency: row.netWorthCurrency,
        label: row.label,
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
