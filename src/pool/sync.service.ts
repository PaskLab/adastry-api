import { Injectable } from '@nestjs/common';
import config from '../../sync-config.json';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BlockfrostService } from '../utils/api/blockfrost.service';
import { Pool } from './entities/pool.entity';
import { Epoch } from '../epoch/entities/epoch.entity';
import { PoolHistory } from './entities/pool-history.entity';
import { PoolUpdate } from './entities/pool-update.entity';
import { PoolOwner } from './entities/pool-owner.entity';
import { Account } from '../account/entities/account.entity';
import { EntityManager } from 'typeorm';
import { PoolRepository } from './repositories/pool.repository';
import { PoolHistoryRepository } from './repositories/pool-history.repository';
import { PoolUpdateRepository } from './repositories/pool-update.repository';
import { EpochRepository } from '../epoch/repositories/epoch.repository';
import { AccountRepository } from '../account/repositories/account.repository';
import type { SyncConfigPools } from '../sync/types/sync-config.type';
import type { PoolHistoryType } from '../utils/api/types/pool-history.type';

@Injectable()
export class SyncService {
  private readonly PROVIDER_LIMIT = config.provider.limit;

  constructor(
    @InjectEntityManager()
    private readonly em: EntityManager,
    private readonly source: BlockfrostService,
  ) {
    this.init();
  }

  async init(): Promise<void> {
    const pools: SyncConfigPools = config.pools;
    const poolRepository = this.em.getCustomRepository(PoolRepository);

    pools.forEach(async (pool) => {
      let poolEntity = await poolRepository.findOne({ poolId: pool.id });
      if (!poolEntity) {
        poolEntity = new Pool();
        poolEntity.poolId = pool.id;
        poolEntity.name = pool.name;
        poolEntity.isMember = true;

        poolRepository.save(poolEntity);
        console.log(
          `[${new Date().toUTCString()}] Pool Init - Creating Pool ${
            poolEntity.poolId
          }`,
        );
      }
    });
  }

  async syncPool(pool: Pool, lastEpoch: Epoch) {
    await this.syncPoolUpdate(pool);
    this.syncPoolInfo(pool, lastEpoch);
    this.syncPoolHistory(pool, lastEpoch);
  }

  async syncPoolInfo(pool: Pool, lastEpoch: Epoch): Promise<void> {
    const poolUpdate = await this.source.getPoolInfo(pool.poolId);

    if (!poolUpdate) {
      console.log(
        `ERROR::PoolSync()->syncPoolInfo()->this.source.getPoolInfo(${pool.poolId}) returned ${poolUpdate}`,
      );
      return;
    }

    if (pool.epoch !== lastEpoch) {
      const lastRegistration = await this.em
        .getCustomRepository(PoolUpdateRepository)
        .findLastUpdate(pool.poolId);

      if (!lastRegistration) {
        console.log(
          `ERROR::PoolSync()->syncPoolInfo()->this.poolUpdateRepository.findLastUpdate() returned ${lastRegistration}`,
        );
        return;
      }

      pool.name = `${poolUpdate.name}[${poolUpdate.ticker}]`;
      pool.blocksMinted = poolUpdate.blocksMinted;
      pool.liveStake = poolUpdate.liveStake;
      pool.liveSaturation = poolUpdate.liveSaturation;
      pool.liveDelegators = poolUpdate.liveDelegators;
      pool.epoch = lastEpoch;
      pool.registration = lastRegistration;
      pool.isMember = config.pools.some(
        (memberPool) => memberPool.id === pool.poolId,
      );

      this.em.getCustomRepository(PoolRepository).save(pool);
      console.log(
        `[${new Date().toUTCString()}] Pool Sync - Updating Pool ${
          pool.poolId
        }`,
      );
    }
  }

  async syncPoolUpdate(pool: Pool) {
    const lastUpdate = await this.source.getLastPoolUpdate(pool.poolId);

    if (!lastUpdate) {
      console.log(
        `ERROR::PoolSync()->syncPoolUpdate()->this.source.getLastPoolUpdate(${pool.poolId}) returned ${lastUpdate}`,
      );
      return;
    }

    const lastStoredUpdate = await this.em
      .getCustomRepository(PoolUpdateRepository)
      .findLastUpdate(pool.poolId);

    const lastStoredEpoch = lastStoredUpdate ? lastStoredUpdate.epoch : 0;

    // Check whether a sync is required or not
    if (lastStoredUpdate && lastUpdate.txHash === lastStoredUpdate.txHash) {
      return;
    }

    const poolUpdates = await this.source.getAllPoolUpdate(pool.poolId);
    const epochRepository = this.em.getCustomRepository(EpochRepository);
    const accountRepository = this.em.getCustomRepository(AccountRepository);

    for (let i = 0; i < poolUpdates.length; i++) {
      if (poolUpdates[i].epoch > lastStoredEpoch) {
        const poolUpdate = poolUpdates[i];

        const epoch = poolUpdate.epoch
          ? await epochRepository.findOne({ epoch: poolUpdate.epoch })
          : null;

        if (!epoch) {
          console.log(
            `ERROR::PoolSync()->syncPoolUpdate()->this.epochRepository.findOne(${poolUpdate.epoch}) returned ${epoch}`,
          );
          return;
        }

        const newUpdate = new PoolUpdate();
        newUpdate.pool = pool;
        newUpdate.epoch = epoch;
        newUpdate.active = poolUpdate.active;
        newUpdate.margin = poolUpdate.margin;
        newUpdate.fixed = poolUpdate.fixed;
        newUpdate.active = poolUpdate.active;
        newUpdate.txHash = poolUpdate.txHash;
        newUpdate.owners = [];

        // Add or create reward account
        if (poolUpdate.rewardAccount) {
          let rewardAccount = poolUpdate.rewardAccount
            ? await accountRepository.findOne({
                stakeAddress: poolUpdate.rewardAccount,
              })
            : null;

          if (!rewardAccount) {
            rewardAccount = new Account();
            rewardAccount.stakeAddress = poolUpdate.rewardAccount;
          }

          newUpdate.rewardAccount = rewardAccount;
        }

        // Add or create owner account
        if (poolUpdate.owners) {
          for (let j = 0; j < poolUpdate.owners.length; j++) {
            const updateOwner = poolUpdate.owners[j];
            let owner = await accountRepository.findOne({
              stakeAddress: updateOwner,
            });

            if (!owner) {
              owner = new Account();
              owner.stakeAddress = updateOwner;
            }

            const bindRecord = new PoolOwner();
            bindRecord.own = newUpdate;
            bindRecord.account = owner;

            newUpdate.owners.push(bindRecord);
          }
        }

        await this.em.transaction(async (em) => {
          await em.save(newUpdate);
          console.log(
            `[${new Date().toUTCString()}] Pool Update Sync - Adding new epoch ${
              newUpdate.epoch.epoch
            } registration for Pool ${newUpdate.pool.poolId}`,
          );
        });
      }
    }
  }

  async syncPoolHistory(pool: Pool, lastEpoch: Epoch) {
    const poolHistoryRepository = this.em.getCustomRepository(
      PoolHistoryRepository,
    );
    const lastStoredEpoch = await poolHistoryRepository.findLastEpoch(
      pool.poolId,
    );

    const epochToSync = lastStoredEpoch
      ? lastEpoch.epoch - lastStoredEpoch.epoch.epoch
      : lastEpoch.epoch - 207;
    const pages = Math.ceil(epochToSync / this.PROVIDER_LIMIT);

    let history: PoolHistoryType[] = [];

    for (let i = pages; i >= 1; i--) {
      const limit =
        i === pages ? epochToSync % this.PROVIDER_LIMIT : this.PROVIDER_LIMIT;
      let upstreamHistory = await this.source.getPoolHistory(
        pool.poolId,
        i,
        this.PROVIDER_LIMIT,
      );

      if (!upstreamHistory) {
        console.log(
          `ERROR::PoolSync()->syncPoolHistory()->this.source.getPoolHistory(${pool.poolId},${i},${this.PROVIDER_LIMIT},) returned ${upstreamHistory}`,
        );
        continue;
      }

      // Rewards are 2 epoch backwards, ignore 2 last history records
      upstreamHistory = upstreamHistory.slice(i === 1 ? 2 : 0, limit);
      upstreamHistory.reverse();
      history = history.concat(upstreamHistory);
    }

    const epochRepository = this.em.getCustomRepository(EpochRepository);
    const poolUpdateRepository =
      this.em.getCustomRepository(PoolUpdateRepository);

    for (let i = 0; i < history.length; i++) {
      const epoch = history[i].epoch
        ? await epochRepository.findOne({ epoch: history[i].epoch })
        : null;

      if (!epoch) {
        console.log(
          `ERROR::PoolSync()->syncPoolHistory()->this.epochRepository.findOne(${history[i].epoch}) returned ${epoch}.`,
        );
        continue;
      }

      const registration = await poolUpdateRepository.findLastUpdate(
        pool.poolId,
        epoch.epoch,
      );

      if (!registration) {
        console.log(
          `ERROR::PoolSync()->syncPoolHistory()->this.poolUpdateRepository.findLastUpdate(${pool.poolId}, ${epoch.epoch}) returned ${registration}.`,
        );
        continue;
      }

      const newHistory = new PoolHistory();
      newHistory.epoch = epoch;
      newHistory.pool = pool;
      newHistory.rewards = history[i].rewards;
      newHistory.fees = history[i].fees;
      newHistory.blocks = history[i].blocks;
      newHistory.activeStake = history[i].activeStake;
      newHistory.registration = registration;

      poolHistoryRepository.save(newHistory);
      console.log(
        `[${new Date().toUTCString()}] Pool Update Sync - Creating Epoch ${
          newHistory.epoch.epoch
        } history record for Pool ${newHistory.pool.poolId}`,
      );
    }
  }
}
