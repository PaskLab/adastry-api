import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { SyncService as AccountSyncService } from '../account/sync.service';
import { SyncService as PoolSyncService } from '../pool/sync.service';
import { SyncService as EpochSyncService } from '../epoch/sync.service';
import { SyncService as SpotSyncService } from '../spot/sync.service';
import { Epoch } from '../epoch/entities/epoch.entity';
import { Cron } from '@nestjs/schedule';
import { PoolService } from '../pool/pool.service';
import { AccountService } from '../account/account.service';
import { PoolCertService } from '../pool/pool-cert.service';
import { Account } from '../account/entities/account.entity';
import * as process from 'process';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly accountSyncService: AccountSyncService,
    private readonly poolSyncService: PoolSyncService,
    private readonly epochSyncService: EpochSyncService,
    private readonly spotSyncService: SpotSyncService,
    private readonly poolService: PoolService,
    private readonly poolCertService: PoolCertService,
    private readonly accountService: AccountService,
  ) {
    this.init().then();
  }

  async init(): Promise<void> {
    if (process.env.SKIP_INTEGRITY_CHECK === 'yes') {
      this.logger.warn(
        'SKIP_INTEGRITY_CHECK enabled, skipping integrity checks ...',
      );
    } else {
      await this.integrityCheck();
    }

    if (process.env.SKIP_INIT_SYNC === 'yes') {
      this.logger.warn('SKIP_INIT_SYNC enabled, skipping initial sync ...');
    } else {
      this.logger.log('Init sync data ...');
      await this.spotSyncService.init();
      this.sync().then();
    }
  }

  private async integrityCheck(): Promise<void> {
    this.logger.log('Starting integrity check ...');
    await this.accountSyncService.integrityCheck();
  }

  @Cron('0 20 * * *', { name: 'Daily Sync', timeZone: 'America/Toronto' })
  private async sync(): Promise<void> {
    if (process.env.SKIP_SYNC === 'yes') {
      this.logger.warn('SKIP_SYNC enabled, skipping daily sync ...');
      return;
    }

    this.logger.log('*** Starting daily sync ... ***');
    await this.poolSyncService.syncMember();
    const lastEpoch = await this.epochSyncService.syncEpoch();

    if (lastEpoch) {
      await this.syncPools(lastEpoch);
      await this.syncAccounts(lastEpoch);
      await this.syncSpotPrices(lastEpoch);
      await this.poolSyncService.processPoolOwner(lastEpoch);
    }

    this.logger.log('*** Daily sync completed! ***');
  }

  private async syncPools(lastEpoch: Epoch): Promise<void> {
    this.logger.log('Starting Sync:syncPools() ...');

    const pools = await this.poolService.findAll();
    for (const pool of pools) {
      await this.poolSyncService.syncPool(pool, lastEpoch);
    }
  }

  private async syncAccounts(lastEpoch: Epoch): Promise<void> {
    this.logger.log('Starting Sync:syncAccounts() ...');
    const accounts = await this.getAccountsToSync();
    for (const account of accounts) {
      await this.accountSyncService.syncAccount(account, lastEpoch);
    }
  }

  private async syncSpotPrices(lastEpoch: Epoch): Promise<void> {
    this.logger.log('Starting Sync:syncSpotPrices() ...');
    this.spotSyncService.syncRates(lastEpoch).then();
    this.spotSyncService.syncSpotPrices(lastEpoch).then();
  }

  /**
   * Sync only user linked accounts,
   * along with related shared pool owner accounts.
   */
  async getAccountsToSync(): Promise<Account[]> {
    const accountIds = await this.accountService.findUniqueLinkedAccountIds();
    const certIds = await this.poolCertService.findOwnersUniqueCertIds(
      accountIds,
    );

    return await this.accountService.findAccountsToSync(accountIds, certIds);
  }
}
