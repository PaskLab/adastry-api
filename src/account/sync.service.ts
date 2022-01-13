import { Injectable } from '@nestjs/common';
import { Account } from './entities/account.entity';
import { Epoch } from '../epoch/entities/epoch.entity';
import { TxSyncService } from './sync/tx-sync.service';
import { AccountSyncService } from './sync/account-sync.service';

@Injectable()
export class SyncService {
  constructor(
    private readonly accountSync: AccountSyncService,
    private readonly txSync: TxSyncService,
  ) {}

  async syncAccount(account: Account, lastEpoch: Epoch): Promise<void> {
    account = await this.accountSync.syncInfo(account, lastEpoch);
    if (account.pool?.isMember) {
      await this.accountSync.syncAccountWithdrawal(account);
      await this.txSync.syncAccount(account);
      await this.accountSync.syncHistory(account, lastEpoch);
    }
  }
}
