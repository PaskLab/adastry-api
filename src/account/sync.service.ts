import { Injectable } from '@nestjs/common';
import { Account } from './entities/account.entity';
import { Epoch } from '../epoch/entities/epoch.entity';
import { TxSyncService } from './sync/tx-sync.service';
import { AccountSyncService } from './sync/account-sync.service';
import config from '../../config.json';

@Injectable()
export class SyncService {
  private readonly WITHDRAW_SYNC_RATE = config.sync.rateLimit.accountWithdraw;
  private readonly ADDRESS_SYNC_RATE = config.sync.rateLimit.accountAddress;
  private readonly TX_SYNC_RATE = config.sync.rateLimit.accountTransaction;

  constructor(
    private readonly accountSync: AccountSyncService,
    private readonly txSync: TxSyncService,
  ) {}

  async syncAccount(account: Account, lastEpoch: Epoch): Promise<void> {
    account = await this.accountSync.syncInfo(account, lastEpoch);
    if (account.pool?.isMember) {
      if (this.requireSync(account.withdrawLastSync, this.WITHDRAW_SYNC_RATE)) {
        account = await this.accountSync.syncAccountWithdrawal(account);
      }

      if (this.requireSync(account.addressesLastSync, this.ADDRESS_SYNC_RATE)) {
        account = await this.txSync.syncAddresses(account);
      }

      if (this.requireSync(account.transactionsLastSync, this.TX_SYNC_RATE)) {
        account = await this.txSync.syncTransactions(account);
      }

      await this.accountSync.syncHistory(account, lastEpoch);
    }
  }

  private requireSync(lastSync: Date, rateLimit: number): boolean {
    const nextSync = new Date(lastSync.valueOf() + rateLimit);
    return new Date() >= nextSync;
  }
}
