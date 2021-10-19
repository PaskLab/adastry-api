import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Account } from '../account/entities/account.entity';
import { AccountRepository } from '../account/repositories/account.repository';
import { Pool } from '../pool/entities/pool.entity';
import { PoolRepository } from '../pool/repositories/pool.repository';
import { SyncService as AccountSyncService } from '../account/sync.service';
import { SyncService as PoolSyncService } from '../pool/sync.service';
import { SyncService as EpochSyncService } from '../epoch/sync.service';
import { Epoch } from '../epoch/entities/epoch.entity';

@Injectable()
export class SyncService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly accountSyncService: AccountSyncService,
    private readonly poolSyncService: PoolSyncService,
    private readonly epochSyncService: EpochSyncService,
  ) {}

  async start(): Promise<void> {
    this.sync();
  }

  private async sync(): Promise<void> {
    const lastEpoch = await this.epochSyncService.syncEpoch();

    if (lastEpoch) {
      await this.syncPools(lastEpoch);
      await this.syncAccounts(lastEpoch);
    }
  }

  private async syncPools(lastEpoch: Epoch): Promise<void> {
    const pools = await this.em.getCustomRepository(PoolRepository).find();
    for (let i = 0; i < pools.length; i++) {
      await this.poolSyncService.syncPool(pools[i], lastEpoch);
    }
  }

  private async syncAccounts(lastEpoch: Epoch): Promise<void> {
    const accounts = await this.em
      .getCustomRepository(AccountRepository)
      .find();
    for (let i = 0; i < accounts.length; i++) {
      await this.accountSyncService.syncAccount(accounts[i], lastEpoch);
    }
  }
}
