import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { BlockfrostService } from '../../utils/api/blockfrost.service';
import { Account } from '../entities/account.entity';
import { AccountAddressService } from '../account-address.service';
import { TransactionService } from '../transaction.service';
import { TransactionAddressService } from '../transaction-address.service';
import { AccountWithdrawService } from '../account-withdraw.service';
import { MirTransactionService } from '../mir-transaction.service';
import { MirTransaction } from '../entities/mir-transaction.entity';
import { EpochService } from '../../epoch/epoch.service';

@Injectable()
export class MirSyncService {
  private readonly logger = new Logger(MirSyncService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly source: BlockfrostService,
    private readonly accountAddressService: AccountAddressService,
    private readonly transactionService: TransactionService,
    private readonly transactionAddressService: TransactionAddressService,
    private readonly accountWithdrawService: AccountWithdrawService,
    private readonly mirTransactionService: MirTransactionService,
    private readonly epochService: EpochService,
  ) {}

  async syncTransactions(account: Account): Promise<Account> {
    const lastTransaction = await this.mirTransactionService.findLastTx(
      account,
    );

    const mirTransactions = await this.source.getAllAccountMIRs(
      account.stakeAddress,
      lastTransaction?.txHash,
    );

    for (const tx of mirTransactions) {
      const storedMIR = await this.mirTransactionService.findMIRTransaction(
        account.stakeAddress,
        tx.txHash,
      );

      if (storedMIR) {
        continue;
      }

      const epoch = await this.epochService.findOneFromTime(tx.blockTime);

      if (!epoch) {
        this.logger.error(
          `Could not find Epoch for time ${tx.blockTime}`,
          'MIRSync()->syncTransactions()',
        );
        continue;
      }

      const newMIR = new MirTransaction();
      newMIR.account = account;
      newMIR.epoch = epoch;
      newMIR.block = tx.blockHeight;
      newMIR.txIndex = tx.txIndex;
      newMIR.amount = tx.amount;
      newMIR.txHash = tx.txHash;

      await this.em.save(newMIR);
      this.logger.log(
        `Account MIR Sync - Adding epoch ${newMIR.epoch.epoch} MIR record for account ${account.stakeAddress}`,
      );
    }

    account.mirTransactionsLastSync = new Date();
    return this.em.save(account);
  }
}
