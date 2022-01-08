import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { TransactionDto } from './dto/transaction.dto';
import { TxHistoryParam } from './params/tx-history.param';
import { TransactionRepository } from './repositories/transaction.repository';

@Injectable()
export class TransactionService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async getHistory(
    stakeAddress: string,
    params: TxHistoryParam,
  ): Promise<TransactionDto[]> {
    const result = await this.em
      .getCustomRepository(TransactionRepository)
      .findHistory(stakeAddress, params);

    return result.map((r) => {
      return new TransactionDto({
        address: r.address.address,
        txHash: r.txHash,
        txIndex: r.txIndex,
        blockHeight: r.blockHeight,
        blockTime: r.blockTime,
        received: JSON.parse(r.received),
        sent: JSON.parse(r.sent),
        fees: r.fees,
        deposit: r.deposit,
        withdrawalCount: r.withdrawalCount,
        mirCertCount: r.mirCertCount,
        delegationCount: r.delegationCount,
        stakeCertCount: r.stakeCertCount,
        poolUpdateCount: r.poolUpdateCount,
        poolRetireCount: r.poolRetireCount,
        assetMintCount: r.assetMintCount,
        redeemerCount: r.redeemerCount,
        validContract: r.validContract,
        tags: JSON.parse(r.tags),
      });
    });
  }
}
