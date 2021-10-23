import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { AccountRepository } from '../account/repositories/account.repository';
import { PoolRepository } from '../pool/repositories/pool.repository';
import { SyncService as AccountSyncService } from '../account/sync.service';
import { SyncService as PoolSyncService } from '../pool/sync.service';
import { SyncService as EpochSyncService } from '../epoch/sync.service';
import { SyncService as SpotSyncService } from '../spot/sync.service';
import { Epoch } from '../epoch/entities/epoch.entity';

@Injectable()
export class SyncService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly accountSyncService: AccountSyncService,
    private readonly poolSyncService: PoolSyncService,
    private readonly epochSyncService: EpochSyncService,
    private readonly spotSyncService: SpotSyncService,
  ) {}

  async start(): Promise<void> {
    this.accountSyncService.init();
    this.poolSyncService.init();
    this.spotSyncService.init();
    this.sync();
  }

  private async sync(): Promise<void> {
    const lastEpoch = await this.epochSyncService.syncEpoch();

    if (lastEpoch) {
      await this.syncPools(lastEpoch);
      await this.syncAccounts(lastEpoch);
      await this.syncSpotPrices(lastEpoch);
    }
  }

  private async syncPools(lastEpoch: Epoch): Promise<void> {
    const pools = await this.em.getCustomRepository(PoolRepository).findAll();
    for (const pool of pools) {
      await this.poolSyncService.syncPool(pool, lastEpoch);
    }
  }

  private async syncAccounts(lastEpoch: Epoch): Promise<void> {
    const accounts = await this.em
      .getCustomRepository(AccountRepository)
      .findAll();
    for (const account of accounts) {
      await this.accountSyncService.syncAccount(account, lastEpoch);
    }
  }

  private async syncSpotPrices(lastEpoch: Epoch): Promise<void> {
    this.spotSyncService.syncRates(lastEpoch);
    this.spotSyncService.syncSpotPrices(lastEpoch);
  }
}
