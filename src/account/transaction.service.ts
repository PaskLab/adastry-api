import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import {
  BlockfrostAmountDto,
  TransactionDto,
  TransactionListDto,
} from './dto/transaction.dto';
import { TxHistoryParam } from './params/tx-history.param';
import { Request } from 'express';
import { CsvFileDto } from './dto/csv-file.dto';
import { CsvFieldsType } from './types/csv-fields.type';
import {
  createTimestamp,
  dateFromUnix,
  generateUnixTimeRange,
  generateUrl,
  parseAssetHex,
  requireSync,
  toAda,
  toDecimals,
} from '../utils/utils';
import { CsvService } from './csv.service';
import config from '../../config.json';
import { Transaction } from './entities/transaction.entity';
import { CsvFileInfoType } from './types/csv-file-info.type';
import { UserService } from '../user/user.service';
import { Asset } from './entities/asset.entity';
import { BlockfrostService } from '../utils/api/blockfrost.service';
import { isInt } from 'class-validator';
import isValidUTF8 from 'utf-8-validate';
import AssetFingerprint from '@emurgo/cip14-js';

@Injectable()
export class TransactionService {
  private readonly MAX_LIMIT = config.api.pageLimit;
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly csvService: CsvService,
    private readonly userService: UserService,
    private readonly source: BlockfrostService,
  ) {}

  async getHistory(
    stakeAddress: string,
    params: TxHistoryParam,
  ): Promise<TransactionListDto> {
    const history = await this.findHistory(stakeAddress, params);

    return new TransactionListDto({
      count: history[1],
      data: history[0].map((h) => {
        return new TransactionDto({
          addresses: h.addresses.map((a) => a.address.address),
          txHash: h.txHash,
          txIndex: h.txIndex,
          blockHeight: h.blockHeight,
          blockTime: h.blockTime,
          txType: h.txType,
          received: JSON.parse(h.received).map(
            (v) =>
              new BlockfrostAmountDto({ unit: v.unit, quantity: v.quantity }),
          ),
          sent: JSON.parse(h.sent).map(
            (v) =>
              new BlockfrostAmountDto({ unit: v.unit, quantity: v.quantity }),
          ),
          fees: h.fees,
          deposit: h.deposit,
          withdrawalCount: h.withdrawalCount,
          mirCertCount: h.mirCertCount,
          delegationCount: h.delegationCount,
          stakeCertCount: h.stakeCertCount,
          poolUpdateCount: h.poolUpdateCount,
          poolRetireCount: h.poolRetireCount,
          assetMintCount: h.assetMintCount,
          redeemerCount: h.redeemerCount,
          validContract: h.validContract,
          tags: JSON.parse(h.tags),
          metadata: h.metadata,
          needReview: h.needReview,
        });
      }),
    });
  }

  async getTransactionsCSV(
    request: Request,
    userId: number,
    stakeAddress: string,
    year: number,
    month?: number,
    format?: string,
    quarter?: number,
  ): Promise<CsvFileDto> {
    const user = await this.userService.findOneById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const history = await this.findByYear(stakeAddress, year, month, quarter);

    if (!history.length) {
      throw new NotFoundException(
        `No transaction history found for ${stakeAddress} in the selected date range.`,
      );
    }

    const filename = `${year}${
      quarter ? '-Q' + quarter : ''
    }-txs-${stakeAddress.slice(0, 15)}-${format ? format : 'default'}.csv`;

    const fileInfo = await this.generateTransactionsCSV(
      userId,
      filename,
      history,
      format,
    );

    return new CsvFileDto({
      filename: filename,
      fileExpireAt: fileInfo.expireAt.toUTCString(),
      url: generateUrl(request, 'public/tmp', filename),
      format: format ? format : 'default',
      stakeAddress: stakeAddress,
      year: year.toString(),
    });
  }

  async generateTransactionsCSV(
    userId: number,
    filename: string,
    history: Transaction[],
    format?: string,
  ): Promise<CsvFileInfoType> {
    const data: CsvFieldsType[] = [];

    for (const record of history) {
      const received = JSON.parse(record.received);
      const sent = JSON.parse(record.sent);

      const template = {
        date: createTimestamp(dateFromUnix(record.blockTime)),
        sentAmount: '',
        sentCurrency: '',
        receivedAmount: '',
        receivedCurrency: '',
        feeAmount: '',
        feeCurrency: '',
        netWorthAmount: '',
        netWorthCurrency: '',
        label: '',
        description: JSON.parse(record.tags).join(', '),
        txHash: record.txHash,
        metadata: record.metadata,
      };

      if (received.length < 2 && sent.length < 2) {
        // Simple transaction & trade
        const row = JSON.parse(JSON.stringify(template));

        if (sent.length) {
          if (sent[0].unit === 'lovelace') {
            row.sentAmount = toAda(parseInt(sent[0].quantity) - record.fees);
            row.sentCurrency = 'ADA';
            row.feeAmount = toAda(record.fees);
            row.feeCurrency = 'ADA';
          } else {
            const asset = await this.updatedAsset(sent[0].unit);
            if (asset && asset.decimals) {
              row.sentAmount = toDecimals(
                sent[0].quantity,
                asset.decimals,
              ).toString();
            } else {
              row.sentAmount = BigInt(sent[0].quantity).toString();
            }
            row.sentCurrency = sent[0].unit;
          }
        }
        if (received.length) {
          if (received[0].unit === 'lovelace') {
            row.receivedAmount = toAda(parseInt(received[0].quantity));
            row.receivedCurrency = 'ADA';
          } else {
            const asset = await this.updatedAsset(received[0].unit);
            if (asset && asset.decimals) {
              row.receivedAmount = toDecimals(
                received[0].quantity,
                asset.decimals,
              );
            } else {
              row.receivedAmount = BigInt(received[0].quantity).toString();
            }
            row.receivedCurrency = received[0].unit;
          }
        }

        data.push(row);
      } else {
        // Complex transactions are exploded in multiples records

        for (const tx of sent) {
          const row = JSON.parse(JSON.stringify(template));
          if (tx.unit === 'lovelace') {
            row.sentAmount = toAda(parseInt(tx.quantity) - record.fees);
            row.sentCurrency = 'ADA';
            row.feeAmount = toAda(record.fees);
            row.feeCurrency = 'ADA';
          } else {
            const unit = tx.unit;
            const parsedAsset = parseAssetHex(unit);
            const asset = await this.updatedAsset(unit);
            if (asset && asset.decimals) {
              row.sentAmount = toDecimals(
                tx.quantity,
                asset.decimals,
              ).toString();
            } else {
              row.sentAmount = BigInt(tx.quantity).toString();
            }
            row.sentCurrency = unit;
            row.description = `Subpart of txHash: ${row.txHash}`;
            if (isValidUTF8(Buffer.from(parsedAsset.hexName, 'hex'))) {
              row.txHash = `(${parsedAsset.name})${row.txHash}`;
            } else {
              const fingerprint = AssetFingerprint.fromParts(
                Buffer.from(parsedAsset.policy, 'hex'),
                Buffer.from(parsedAsset.hexName, 'hex'),
              );
              row.txHash = `(${fingerprint.fingerprint()})${row.txHash}`;
            }
          }
          data.push(row);
        }

        for (const rx of received) {
          const row = JSON.parse(JSON.stringify(template));
          if (rx.unit === 'lovelace') {
            row.receivedAmount = toAda(parseInt(rx.quantity));
            row.receivedCurrency = 'ADA';
          } else {
            const unit = rx.unit;
            const parsedAsset = parseAssetHex(unit);
            const asset = await this.updatedAsset(unit);
            if (asset && asset.decimals) {
              row.receivedAmount = toDecimals(
                rx.quantity,
                asset.decimals,
              ).toString();
            } else {
              row.receivedAmount = BigInt(rx.quantity).toString();
            }
            row.receivedCurrency = unit;
            row.description = `Subpart of txHash: ${row.txHash}`;
            if (isValidUTF8(Buffer.from(parsedAsset.hexName, 'hex'))) {
              row.txHash = `(${parsedAsset.name})${row.txHash}`;
            } else {
              const fingerprint = AssetFingerprint.fromParts(
                Buffer.from(parsedAsset.policy, 'hex'),
                Buffer.from(parsedAsset.hexName, 'hex'),
              );
              row.txHash = `(${fingerprint.fingerprint()})${row.txHash}`;
            }
          }
          data.push(row);
        }
      }
    }

    let fileInfo;

    switch (format) {
      case 'koinly':
        fileInfo = await this.csvService.writeKoinlyCSV(userId, filename, data);
        break;
      default:
        fileInfo = await this.csvService.writeTransactionCSV(filename, data);
    }

    return fileInfo;
  }

  private async updatedAsset(hexId: string): Promise<Asset | null> {
    let asset = await this.em
      .getRepository(Asset)
      .findOne({ where: { hexId: hexId } });

    if (!asset) return null;

    // Update asset off chain metadata every 90 days
    if (requireSync(asset.metadataLastSync, 7776000000)) {
      const assetInfo = await this.source.getAssetInfo(hexId);

      if (assetInfo) {
        if (assetInfo.metadata !== asset.metadata) {
          asset.metadata = assetInfo.metadata;
        }
      } else {
        this.logger.error(
          `getAssetInfo returned ${assetInfo}`,
          `TxSync()->syncAsset()->this.source.getAssetInfo(${hexId})`,
        );
      }

      if (asset.metadata && asset.metadata !== 'null') {
        const metadata = JSON.parse(asset.metadata);

        if (metadata && isInt(metadata.decimals)) {
          asset.decimals = metadata.decimals;
        }
      }

      asset.metadataLastSync = new Date();

      asset = await this.em.save(asset);
    }

    return asset;
  }

  // REPOSITORY

  findLastAddressTx(address: string): Promise<Transaction | null> {
    return this.em
      .getRepository(Transaction)
      .createQueryBuilder('transaction')
      .innerJoin('transaction.addresses', 'addresses')
      .innerJoin('addresses.address', 'address')
      .where('address.address = :address', { address: address })
      .orderBy('transaction.blockHeight', 'DESC')
      .addOrderBy('transaction.txIndex', 'DESC')
      .getOne();
  }

  async findHistory(
    stakeAddress: string,
    params: TxHistoryParam,
  ): Promise<[Transaction[], number]> {
    const qb = this.em
      .getRepository(Transaction)
      .createQueryBuilder('transaction')
      .innerJoin('transaction.account', 'account')
      .innerJoinAndSelect('transaction.addresses', 'addresses')
      .innerJoinAndSelect('addresses.address', 'address')
      .innerJoin(
        'address.account',
        'addressAccount',
        'addressAccount.stakeAddress = :stakeAddress',
        { stakeAddress: stakeAddress },
      )
      .where('account.stakeAddress = :stakeAddress', {
        stakeAddress: stakeAddress,
      })
      .orderBy({
        'transaction.blockTime': 'DESC',
        'transaction.txIndex': 'DESC',
      });

    if (params.order) {
      qb.orderBy({
        'transaction.blockTime': params.order,
        'transaction.txIndex': params.order,
      });
    }

    if (params.from) {
      qb.andWhere('transaction.blockTime >= :from', { from: params.from });
    }

    if (params.to) {
      qb.andWhere('transaction.blockTime <= :to', { to: params.to });
    }

    qb.take(params.limit ? params.limit : this.MAX_LIMIT);

    if (params.page) {
      qb.skip(
        (params.page - 1) * (params.limit ? params.limit : this.MAX_LIMIT),
      );
    }

    return qb.getManyAndCount();
  }

  async findByYear(
    stakeAddress: string,
    year: number,
    month?: number,
    quarter?: number,
  ): Promise<Transaction[]> {
    const range = generateUnixTimeRange(year, month, quarter);

    return this.em
      .getRepository(Transaction)
      .createQueryBuilder('transaction')
      .innerJoin('transaction.account', 'account')
      .where('account.stakeAddress = :stakeAddress', {
        stakeAddress: stakeAddress,
      })
      .andWhere(
        'transaction.blockTime >= :startTime AND transaction.blockTime <= :endTime',
        range,
      )
      .orderBy('transaction.blockTime', 'ASC')
      .addOrderBy('transaction.txIndex', 'ASC')
      .getMany();
  }

  async findByYearSelection(
    stakeAddresses: string[],
    year: number,
    month?: number,
    quarter?: number,
  ): Promise<Transaction[]> {
    if (!stakeAddresses.length) return [];

    const range = generateUnixTimeRange(year, month, quarter);

    return (
      this.em
        .getRepository(Transaction)
        .createQueryBuilder('transaction')
        .innerJoin('transaction.account', 'account')
        .where('account.stakeAddress IN (:...stakeAddresses)', {
          stakeAddresses: stakeAddresses,
        })
        .andWhere(
          'transaction.blockTime >= :startTime AND transaction.blockTime <= :endTime',
          range,
        )
        .orderBy('transaction.blockTime', 'ASC')
        .addOrderBy('transaction.txIndex', 'ASC')
        .addOrderBy('transaction.txType', 'DESC')
        // Help to return sent transaction before received transaction for the same time
        .addOrderBy('transaction.received', 'ASC')
        .getMany()
    );
  }

  findOneForAccount(
    txHash: string,
    stakeAddress: string,
  ): Promise<Transaction | null> {
    return this.em
      .getRepository(Transaction)
      .createQueryBuilder('transaction')
      .innerJoin('transaction.account', 'account')
      .where(
        'transaction.txHash = :txHash AND account.stakeAddress = :stakeAddress',
        {
          txHash: txHash,
          stakeAddress: stakeAddress,
        },
      )
      .getOne();
  }

  findAllMissingMetadata(): Promise<Transaction[]> {
    return this.em
      .getRepository(Transaction)
      .createQueryBuilder('transaction')
      .where('transaction.metadata = :empty', { empty: '' })
      .getMany();
  }
}
