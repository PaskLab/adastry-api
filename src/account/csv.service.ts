import { Injectable, Logger } from '@nestjs/common';
import config from '../../config.json';
import { Cron } from '@nestjs/schedule';
import path from 'path';
import fs from 'fs';
import csvWriter = require('csv-writer');
import { CsvFileInfoType } from './types/csv-file-info.type';
import { CsvFieldsType } from './types/csv-fields.type';

@Injectable()
export class CsvService {
  private readonly logger = new Logger(CsvService.name);
  private readonly TMP_PATH = config.app.tmpPath;
  private readonly TMP_TTL = config.app.tmpFileTTL;

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
        data[0].accountBalance !== undefined
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
