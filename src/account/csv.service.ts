import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import config from '../../config.json';
import { Cron } from '@nestjs/schedule';
import path from 'path';
import fs from 'fs';
import csvWriter = require('csv-writer');
import { CsvFileInfoType } from './types/csv-file-info.type';
import { CsvFieldsType } from './types/csv-fields.type';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import AssetFingerprint from '@emurgo/cip14-js';
import { parseAssetHex } from '../utils/utils';
import { Asset } from './entities/asset.entity';
import { TxSyncService } from './sync/tx-sync.service';
import { AssetMappingService } from './asset-mapping.service';
import { UserMapping } from './entities/user-mapping.entity';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class CsvService {
  private readonly logger = new Logger(CsvService.name);
  private readonly TMP_PATH = config.app.tmpPath;
  private readonly TMP_TTL = config.app.tmpFileTTL;

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    @Inject(forwardRef(() => TxSyncService))
    private readonly txSyncService: TxSyncService,
    private readonly assetMappingService: AssetMappingService,
    private readonly userService: UserService,
  ) {}

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
        { id: 'mir', title: 'MIR' },
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
        rewards: row.calculatedRewards,
        mir: row.mirRewards,
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
        { id: 'metadata', title: 'Metadata' },
      ],
    });

    const records: any = [];

    for (const row of data) {
      let sentCurrency = row.sentCurrency;
      let receivedCurrency = row.receivedCurrency;
      let description = row.description;

      if (row.sentCurrency.length && row.sentCurrency !== 'ADA') {
        const asset = parseAssetHex(row.sentCurrency);
        const fingerprint = AssetFingerprint.fromParts(
          Buffer.from(asset.policy, 'hex'),
          Buffer.from(asset.hexName, 'hex'),
        );

        sentCurrency = asset.name;
        description = `${
          asset.name
        } - ${fingerprint.fingerprint()} (${description})`;
      }

      if (row.receivedCurrency.length && row.receivedCurrency !== 'ADA') {
        const asset = parseAssetHex(row.receivedCurrency);
        const fingerprint = AssetFingerprint.fromParts(
          Buffer.from(asset.policy, 'hex'),
          Buffer.from(asset.hexName, 'hex'),
        );

        receivedCurrency = asset.name;
        description = `${
          asset.name
        } - ${fingerprint.fingerprint()} (${description})`;
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
        metadata: row.metadata ? row.metadata : '',
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
        { id: 'mir', title: 'MIR' },
        { id: 'netWorthAmount', title: 'Net Worth Amount' },
        { id: 'netWorthCurrency', title: 'Net Worth Currency' },
        { id: 'activeStake', title: 'Active Stake' },
        { id: 'accountBalance', title: 'Account Balance' },
        { id: 'stakeRewards', title: 'Stake Rewards' },
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
        rewards: row.calculatedRewards,
        mir: row.mirRewards,
        netWorthAmount: row.netWorthAmount,
        netWorthCurrency: row.netWorthCurrency,
        activeStake: row.activeStake,
        accountBalance: row.accountBalance,
        stakeRewards: row.revisedRewards,
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
        { id: 'mir', title: 'MIR' },
        { id: 'netWorthAmount', title: 'Net Worth Amount' },
        { id: 'netWorthCurrency', title: 'Net Worth Currency' },
        { id: 'activeStake', title: 'Active Stake' },
        { id: 'accountBalance', title: 'Account Balance' },
        { id: 'realRewards', title: 'Real Rewards' },
        { id: 'stakeRewards', title: 'Stake Rewards' },
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
        rewards: row.calculatedRewards,
        mir: row.mirRewards,
        netWorthAmount: row.netWorthAmount,
        netWorthCurrency: row.netWorthCurrency,
        activeStake: row.activeStake,
        accountBalance: row.accountBalance,
        realRewards: row.realRewards,
        stakeRewards: row.revisedRewards,
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
    userId: number,
    filename: string,
    data: CsvFieldsType[],
  ): Promise<CsvFileInfoType> {
    const user = await this.userService.findOneById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

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
        const mapping = await this.mapAssetKoinly(
          user,
          row.sentCurrency,
          row.sentAmount,
          description,
          realTxHash,
          nftCount,
          tokenCount,
        );
        sentCurrency = mapping.id;
        description = mapping.description;
      }

      if (row.receivedCurrency.length && row.receivedCurrency !== 'ADA') {
        const mapping = await this.mapAssetKoinly(
          user,
          row.receivedCurrency,
          row.receivedAmount,
          description,
          realTxHash,
          nftCount,
          tokenCount,
        );
        receivedCurrency = mapping.id;
        description = mapping.description;
      }

      const record = {
        date: row.date,
        sentAmount:
          row.sentAmount.toString() === '0' && row.feeAmount != ''
            ? row.feeAmount
            : row.sentAmount, // Handle self transaction for Koinly
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

  private async mapAssetKoinly(
    user: User,
    assetHex: string,
    assetAmount: string | number,
    description: string,
    realTxHash: string,
    nftCount: { [key: string]: number },
    tokenCount: { [key: string]: number },
  ): Promise<{ id: string; description: string }> {
    let assetId: string;
    let rowDescription: string;
    const parsedAsset = parseAssetHex(assetHex);
    const fingerprint = AssetFingerprint.fromParts(
      Buffer.from(parsedAsset.policy, 'hex'),
      Buffer.from(parsedAsset.hexName, 'hex'),
    );

    let asset = await this.em
      .getRepository(Asset)
      .findOne({ where: { hexId: assetHex } });

    if (!asset) {
      // Try to sync Asset Info
      await this.txSyncService.syncAsset(assetHex);
      asset = await this.em
        .getRepository(Asset)
        .findOne({ where: { hexId: assetHex } });
    }

    let userMapping = await this.assetMappingService.findUserMapping(
      user.id,
      assetHex,
    );

    const globalMapping = await this.assetMappingService.findKoinlyMapping(
      assetHex,
      true,
    );

    // Create or update 'userMapping' if no 'globalMapping' for 'asset'
    if (
      asset &&
      (!userMapping || !userMapping.koinlyId.length) &&
      !globalMapping
    ) {
      const nextId = await this.assetMappingService.findUserNextKoinlyId(
        user.id,
        asset.quantity === '1' ? 'NFT' : 'NULL',
      );

      let newUserMapping: UserMapping;

      if (userMapping) {
        // User mapping can exist for multiple services, ie: koinly, cointracker
        newUserMapping = userMapping;
      } else {
        newUserMapping = new UserMapping();
        newUserMapping.asset = asset;
        newUserMapping.user = user;
      }

      newUserMapping.koinlyId = nextId;

      userMapping = await this.em.save(newUserMapping);
    }

    if (
      (asset && asset.quantity === '1') ||
      BigInt(assetAmount) !== BigInt(1)
    ) {
      if (userMapping) {
        assetId = userMapping.koinlyId;
      } else if (globalMapping) {
        assetId = globalMapping.koinlyId;
      } else {
        tokenCount[realTxHash] = tokenCount[realTxHash]
          ? tokenCount[realTxHash] + 1
          : 1;

        assetId = 'NULL' + tokenCount[realTxHash];
      }

      rowDescription = `${assetId} = ${
        parsedAsset.name
      } [${fingerprint.fingerprint()}] | ${description}`;
    } else {
      if (userMapping) {
        assetId = userMapping.koinlyId;
      } else if (globalMapping) {
        assetId = globalMapping.koinlyId;
      } else {
        nftCount[realTxHash] = nftCount[realTxHash]
          ? nftCount[realTxHash] + 1
          : 1;

        assetId = 'NFT' + nftCount[realTxHash];
      }

      rowDescription = `${assetId} = ${
        parsedAsset.name
      } [${fingerprint.fingerprint()}] | ${description}`;
    }

    return { id: assetId, description: rowDescription };
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
