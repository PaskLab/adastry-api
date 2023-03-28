import { Injectable } from '@nestjs/common';
import { Account } from './entities/account.entity';
import { Epoch } from '../epoch/entities/epoch.entity';
import { TxSyncService } from './sync/tx-sync.service';
import { AccountSyncService } from './sync/account-sync.service';
import config from '../../config.json';
import { MirSyncService } from './sync/mir-sync.service';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { requireSync } from '../utils/utils';

@Injectable()
export class SyncService {
  private readonly ADDRESS_SYNC_RATE = config.sync.rateLimit.accountAddress;
  private readonly TX_SYNC_RATE = config.sync.rateLimit.accountTransaction;
  private readonly MIR_TX_SYNC_RATE =
    config.sync.rateLimit.accountMIRTransaction;

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly accountSync: AccountSyncService,
    private readonly txSync: TxSyncService,
    private readonly mirSync: MirSyncService,
  ) {}

  async syncAccount(account: Account, lastEpoch: Epoch): Promise<void> {
    account.syncing = true;
    account = await this.em.save(account);

    account = await this.accountSync.syncInfo(account, lastEpoch);

    account = await this.accountSync.syncAccountWithdrawal(account);

    if (requireSync(account.addressesLastSync, this.ADDRESS_SYNC_RATE)) {
      account = await this.txSync.syncAddresses(account);
    }

    if (requireSync(account.transactionsLastSync, this.TX_SYNC_RATE)) {
      account = await this.txSync.syncTransactions(account);
    }

    if (requireSync(account.mirTransactionsLastSync, this.MIR_TX_SYNC_RATE)) {
      account = await this.mirSync.syncTransactions(account);
    }

    await this.accountSync.syncHistory(account, lastEpoch);

    account.syncing = false;
    this.em.save(account);
  }

  async integrityCheck(): Promise<void> {
    await this.txSync.fetchMissingMetadata();
    await this.accountSync.clearNegativeBalance();
  }
}
