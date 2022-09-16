import { Injectable } from '@nestjs/common';
import { Account } from './entities/account.entity';
import { Epoch } from '../epoch/entities/epoch.entity';
import { TxSyncService } from './sync/tx-sync.service';
import { AccountSyncService } from './sync/account-sync.service';
import config from '../../config.json';
import { MirSyncService } from './sync/mir-sync.service';

@Injectable()
export class SyncService {
  private readonly ADDRESS_SYNC_RATE = config.sync.rateLimit.accountAddress;
  private readonly TX_SYNC_RATE = config.sync.rateLimit.accountTransaction;
  private readonly MIR_TX_SYNC_RATE =
    config.sync.rateLimit.accountMIRTransaction;

  constructor(
    private readonly accountSync: AccountSyncService,
    private readonly txSync: TxSyncService,
    private readonly mirSync: MirSyncService,
  ) {}

  async syncAccount(account: Account, lastEpoch: Epoch): Promise<void> {
    account = await this.accountSync.syncInfo(account, lastEpoch);
    if (account.pool?.isMember) {
      account = await this.accountSync.syncAccountWithdrawal(account);

      if (this.requireSync(account.addressesLastSync, this.ADDRESS_SYNC_RATE)) {
        account = await this.txSync.syncAddresses(account);
      }

      if (this.requireSync(account.transactionsLastSync, this.TX_SYNC_RATE)) {
        account = await this.txSync.syncTransactions(account);
      }

      if (
        this.requireSync(account.mirTransactionsLastSync, this.MIR_TX_SYNC_RATE)
      ) {
        account = await this.mirSync.syncTransactions(account);
      }

      await this.accountSync.syncHistory(account, lastEpoch);
    }
  }

  private requireSync(lastSync: Date | null, rateLimit: number): boolean {
    if (!lastSync) return true;
    const nextSync = new Date(lastSync.valueOf() + rateLimit);
    return new Date() >= nextSync;
  }
}
