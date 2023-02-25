import { Injectable, NotFoundException } from '@nestjs/common';
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
  toAda,
} from '../utils/utils';
import { CsvService } from './csv.service';
import config from '../../config.json';
import { Transaction } from './entities/transaction.entity';
import { CsvFileInfoType } from './types/csv-file-info.type';
import { UserService } from '../user/user.service';
import { AssetAmount } from '../utils/api/types/transaction-outputs.type';

@Injectable()
export class TransactionService {
  private readonly MAX_LIMIT = config.api.pageLimit;

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly csvService: CsvService,
    private readonly userService: UserService,
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
    merge = false,
  ): Promise<CsvFileInfoType> {
    const txs: Transaction[] = [...history];
    let _history: Transaction[] = [];

    if (merge) {
      while (txs.length) {
        const baseTx = txs.shift();
        if (!baseTx) break;

        let index = txs.findIndex((tx) => tx.txHash === baseTx.txHash);
        while (index >= 0) {
          const matchTx = txs.splice(index, 1)[0];

          const baseSent: AssetAmount[] = JSON.parse(baseTx.sent);
          const matchSent: AssetAmount[] = JSON.parse(matchTx.sent);
          const baseReceived: AssetAmount[] = JSON.parse(baseTx.received);
          const matchReceived: AssetAmount[] = JSON.parse(matchTx.received);

          for (const asset of matchSent) {
            const assetIndex = baseSent.findIndex((a) => a.unit === asset.unit);
            if (assetIndex >= 0) {
              baseSent[assetIndex].quantity = (
                BigInt(baseSent[assetIndex].quantity) + BigInt(asset.quantity)
              ).toString();
            } else {
              baseSent.push(asset);
            }
          }
          for (const asset of matchReceived) {
            const assetIndex = baseReceived.findIndex(
              (a) => a.unit === asset.unit,
            );
            if (assetIndex >= 0) {
              baseReceived[assetIndex].quantity = (
                BigInt(baseReceived[assetIndex].quantity) +
                BigInt(asset.quantity)
              ).toString();
            } else {
              baseReceived.push(asset);
            }
          }

          baseTx.txType = 'MX';
          baseTx.sent = JSON.stringify(baseSent);
          baseTx.received = JSON.stringify(baseReceived);
          if (matchTx.fees > baseTx.fees) {
            baseTx.fees = matchTx.fees;
          }

          index = txs.findIndex((tx) => tx.txHash === baseTx.txHash);
        }
        _history.push(baseTx);
      }
    } else {
      _history = history;
    }

    const data: CsvFieldsType[] = [];

    for (const record of _history) {
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
            row.sentAmount = BigInt(sent[0].quantity).toString();
            row.sentCurrency = sent[0].unit;
          }
        }
        if (received.length) {
          if (received[0].unit === 'lovelace') {
            row.receivedAmount = toAda(parseInt(received[0].quantity));
            row.receivedCurrency = 'ADA';
          } else {
            row.receivedAmount = BigInt(received[0].quantity).toString();
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

            if (merge) {
              const receivedIndex = received.findIndex(
                (a) => a.unit === tx.unit,
              );
              if (receivedIndex >= 0) {
                const rxAsset = received.splice(receivedIndex, 1)[0];
                row.receivedAmount = toAda(parseInt(rxAsset.quantity));
                row.receivedCurrency = 'ADA';
              }
            }
          } else {
            const unit = tx.unit;
            row.sentAmount = BigInt(tx.quantity).toString();
            row.sentCurrency = unit;
            row.description = `Subpart of txHash: ${row.txHash}`;
            row.txHash = `(${parseAssetHex(unit).name})${row.txHash}`;

            if (merge) {
              const receivedIndex = received.findIndex(
                (a) => a.unit === tx.unit,
              );
              if (receivedIndex >= 0) {
                const rxAsset = received.splice(receivedIndex, 1)[0];
                row.receivedAmount = BigInt(rxAsset.quantity).toString();
                row.receivedCurrency = unit;
              }
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
            row.receivedAmount = BigInt(rx.quantity).toString();
            row.receivedCurrency = unit;
            row.description = `Subpart of txHash: ${row.txHash}`;
            row.txHash = `(${parseAssetHex(unit).name})${row.txHash}`;
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
