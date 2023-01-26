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
  dateToUnix,
  generateUrl,
  parseAssetHex,
  toAda,
} from '../utils/utils';
import { CsvService } from './csv.service';
import config from '../../config.json';
import { Transaction } from './entities/transaction.entity';
import { CsvFileInfoType } from './types/csv-file-info.type';

@Injectable()
export class TransactionService {
  private readonly MAX_LIMIT = config.api.pageLimit;

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly csvService: CsvService,
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
    stakeAddress: string,
    year: number,
    format?: string,
    quarter?: number,
  ): Promise<CsvFileDto> {
    const history = await this.findByYear(stakeAddress, year, quarter);

    if (!history.length) {
      throw new NotFoundException(
        `No transaction history found for ${stakeAddress} in year ${year}`,
      );
    }

    const filename = `${year}${
      quarter ? '-Q' + quarter : ''
    }-txs-${stakeAddress.slice(0, 15)}-${format ? format : 'default'}.csv`;

    const fileInfo = await this.generateTransactionsCSV(
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
        if (received.length) {
          if (received[0].unit === 'lovelace') {
            row.receivedAmount = toAda(parseInt(received[0].quantity));
            row.receivedCurrency = 'ADA';
          } else {
            row.receivedAmount = BigInt(received[0].quantity).toString();
            row.receivedCurrency = received[0].unit;
          }
        }
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

        data.push(row);
      } else {
        // Complex transactions are exploded in multiples records
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
        for (const tx of sent) {
          const row = JSON.parse(JSON.stringify(template));
          if (tx.unit === 'lovelace') {
            row.sentAmount = toAda(parseInt(tx.quantity) - record.fees);
            row.sentCurrency = 'ADA';
            row.feeAmount = toAda(record.fees);
            row.feeCurrency = 'ADA';
          } else {
            const unit = tx.unit;
            row.sentAmount = BigInt(tx.quantity).toString();
            row.sentCurrency = unit;
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
        fileInfo = await this.csvService.writeKoinlyCSV(filename, data);
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

  findByYear(
    stakeAddress: string,
    year: number,
    quarter?: number,
  ): Promise<Transaction[]> {
    let startMonth = '01';
    let endMonth = '12';
    let endDay = '31';

    if (quarter) {
      const zeroLead = (str) => ('0' + str).slice(-2);
      startMonth = zeroLead((quarter - 1) * 3 + 1);
      endMonth = zeroLead((quarter - 1) * 3 + 3);
      endDay = quarter < 2 || quarter > 3 ? '31' : '30';
    }

    const firstDay = dateToUnix(new Date(`${year}-${startMonth}-01T00:00:00Z`));
    const lastDay = dateToUnix(
      new Date(`${year}-${endMonth}-${endDay}T23:59:59Z`),
    );

    return this.em
      .getRepository(Transaction)
      .createQueryBuilder('transaction')
      .innerJoin('transaction.account', 'account')
      .where('account.stakeAddress = :stakeAddress', {
        stakeAddress: stakeAddress,
      })
      .andWhere(
        'transaction.blockTime >= :startTime AND transaction.blockTime <= :endTime',
        {
          startTime: firstDay,
          endTime: lastDay,
        },
      )
      .orderBy('transaction.blockTime', 'ASC')
      .addOrderBy('transaction.txIndex', 'ASC')
      .getMany();
  }

  async findByYearSelection(
    stakeAddresses: string[],
    year: number,
    quarter?: number,
  ): Promise<Transaction[]> {
    if (!stakeAddresses.length) return [];

    let startMonth = '01';
    let endMonth = '12';
    let endDay = '31';

    if (quarter) {
      const zeroLead = (str) => ('0' + str).slice(-2);
      startMonth = zeroLead((quarter - 1) * 3 + 1);
      endMonth = zeroLead((quarter - 1) * 3 + 3);
      endDay = quarter < 2 || quarter > 3 ? '31' : '30';
    }

    const firstDay = dateToUnix(new Date(`${year}-${startMonth}-01T00:00:00Z`));
    const lastDay = dateToUnix(
      new Date(`${year}-${endMonth}-${endDay}T23:59:59Z`),
    );

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
          {
            startTime: firstDay,
            endTime: lastDay,
          },
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
