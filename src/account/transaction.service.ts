import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import {
  BlockfrostAmountDto,
  TransactionDto,
  TransactionListDto,
} from './dto/transaction.dto';
import { TxHistoryParam } from './params/tx-history.param';
import { TransactionRepository } from './repositories/transaction.repository';
import { Request } from 'express';
import { CsvFileDto } from './dto/csv-file.dto';
import { CsvFieldsType } from './types/csv-fields.type';
import {
  createTimestamp,
  dateFromUnix,
  generateUrl,
  parseAssetHex,
  toAda,
} from '../utils/utils';
import { CsvService } from './csv.service';

@Injectable()
export class TransactionService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly csvService: CsvService,
  ) {}

  async getHistory(
    stakeAddress: string,
    params: TxHistoryParam,
  ): Promise<TransactionListDto> {
    const history = await this.em
      .getCustomRepository(TransactionRepository)
      .findHistory(stakeAddress, params);

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
  ): Promise<CsvFileDto> {
    const history = await this.em
      .getCustomRepository(TransactionRepository)
      .findByYear(stakeAddress, year);

    if (!history.length) {
      throw new NotFoundException(
        `No transaction history found for ${stakeAddress} in year ${year}`,
      );
    }

    const filename = `${year}-txs-${stakeAddress.slice(0, 15)}-${
      format ? format : 'default'
    }.csv`;

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

    return new CsvFileDto({
      filename: filename,
      fileExpireAt: fileInfo.expireAt.toUTCString(),
      url: generateUrl(request, 'public/tmp', filename),
      format: format ? format : 'default',
      stakeAddress: stakeAddress,
      year: year.toString(),
    });
  }
}
