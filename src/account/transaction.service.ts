import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { TransactionDto } from './dto/transaction.dto';
import { TxHistoryParam } from './params/tx-history.param';
import { TransactionRepository } from './repositories/transaction.repository';
import { Request } from 'express';
import { CsvFileDto } from './dto/csv-file.dto';
import { CsvFieldsType } from './types/csv-fields.type';
import {
  createTimestamp,
  dateFromUnix,
  generateUrl,
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
  ): Promise<TransactionDto[]> {
    const history = await this.em
      .getCustomRepository(TransactionRepository)
      .findHistory(stakeAddress, params);

    return history.map((h) => {
      return new TransactionDto({
        address: h.address.address,
        txHash: h.txHash,
        txIndex: h.txIndex,
        blockHeight: h.blockHeight,
        blockTime: h.blockTime,
        received: JSON.parse(h.received),
        sent: JSON.parse(h.sent),
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
      format ? format : 'full'
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
        feeCurrency: 'ADA',
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
            row.receivedAmount = parseInt(received[0].quantity);
            row.receivedCurrency = received[0].unit;
          }
        }
        if (sent.length) {
          if (sent[0].unit === 'lovelace') {
            row.sentAmount = toAda(parseInt(sent[0].quantity));
            row.sentCurrency = 'ADA';
            row.feeAmount = toAda(record.fees);
          } else {
            row.sentAmount = parseInt(sent[0].quantity);
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
            row.receivedAmount = parseInt(rx.quantity);
            row.receivedCurrency = rx.unit;
            row.description = `Subpart of txHash: ${row.txHash}`;
            row.txHash = `(${rx.unit})${row.txHash}`;
          }
          data.push(row);
        }
        for (const tx of sent) {
          const row = JSON.parse(JSON.stringify(template));
          if (tx.unit === 'lovelace') {
            row.receivedAmount = toAda(parseInt(tx.quantity));
            row.receivedCurrency = 'ADA';
            row.feeAmount = toAda(record.fees);
          } else {
            row.receivedAmount = parseInt(tx.quantity);
            row.receivedCurrency = tx.unit;
            row.description = `Subpart of txHash: ${row.txHash}`;
            row.txHash = `(${tx.unit})${row.txHash}`;
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
        fileInfo = await this.csvService.writeFullCSV(filename, data);
    }

    return new CsvFileDto({
      filename: filename,
      fileExpireAt: fileInfo.expireAt.toUTCString(),
      url: generateUrl(request, 'public/tmp', filename),
      format: format ? format : 'full',
      stakeAddress: stakeAddress,
      year: year.toString(),
    });
  }
}
