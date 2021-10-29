import { Injectable } from '@nestjs/common';
import config from '../../sync-config.json';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BlockfrostService } from '../utils/api/blockfrost.service';
import { Pool } from './entities/pool.entity';
import { Epoch } from '../epoch/entities/epoch.entity';
import { PoolHistory } from './entities/pool-history.entity';
import { PoolCert } from './entities/pool-cert.entity';
import { PoolOwner } from './entities/pool-owner.entity';
import { Account } from '../account/entities/account.entity';
import { EntityManager } from 'typeorm';
import { PoolRepository } from './repositories/pool.repository';
import { PoolHistoryRepository } from './repositories/pool-history.repository';
import { PoolCertRepository } from './repositories/pool-cert.repository';
import { EpochRepository } from '../epoch/repositories/epoch.repository';
import { AccountRepository } from '../account/repositories/account.repository';
import type { SyncConfigPoolsType } from '../sync/types/sync-config.type';
import type { PoolHistoryType } from '../utils/api/types/pool-history.type';

@Injectable()
export class SyncService {
  private readonly PROVIDER_LIMIT = config.provider.blockfrost.limit;

  constructor(
    @InjectEntityManager()
    private readonly em: EntityManager,
    private readonly source: BlockfrostService,
  ) {}

  async init(): Promise<void> {
    const pools: SyncConfigPoolsType = config.pools;
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
    if (pool.isMember) {
      await this.syncPoolCert(pool);
    }
    this.syncPoolInfo(pool, lastEpoch);
    if (pool.isMember) {
      this.syncPoolHistory(pool, lastEpoch);
    }
  }

  async syncPoolInfo(pool: Pool, lastEpoch: Epoch): Promise<void> {
    const poolCert = await this.source.getPoolInfo(pool.poolId);

    if (!poolCert) {
      console.log(
        `ERROR::PoolSync()->syncPoolInfo()->this.source.getPoolInfo(${pool.poolId}) returned ${poolCert}`,
      );
      return;
    }

    if (pool.epoch !== lastEpoch) {
      const lastCert = await this.em
        .getCustomRepository(PoolCertRepository)
        .findLastCert(pool.poolId);

      pool.name = `${poolCert.name}[${poolCert.ticker}]`;
      pool.blocksMinted = poolCert.blocksMinted;
      pool.liveStake = poolCert.liveStake;
      pool.liveSaturation = poolCert.liveSaturation;
      pool.liveDelegators = poolCert.liveDelegators;
      pool.epoch = lastEpoch;
      pool.lastCert = lastCert ? lastCert : null;
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

  async syncPoolCert(pool: Pool) {
    const lastCert = await this.source.getLastPoolCert(pool.poolId);

    if (!lastCert) {
      console.log(
        `ERROR::PoolSync()->syncPoolUpdate()->this.source.getLastPoolUpdate(${pool.poolId}) returned ${lastCert}`,
      );
      return;
    }

    const lastStoredCert = await this.em
      .getCustomRepository(PoolCertRepository)
      .findLastCert(pool.poolId);

    const lastStoredEpoch = lastStoredCert ? lastStoredCert.epoch : 0;

    // Check whether a sync is required or not
    if (lastStoredCert && lastCert.txHash === lastStoredCert.txHash) {
      return;
    }

    const poolCerts = await this.source.getAllPoolCert(pool.poolId);
    const epochRepository = this.em.getCustomRepository(EpochRepository);
    const accountRepository = this.em.getCustomRepository(AccountRepository);

    for (let i = 0; i < poolCerts.length; i++) {
      if (poolCerts[i].epoch > lastStoredEpoch) {
        const poolCert = poolCerts[i];

        const epoch = poolCert.epoch
          ? await epochRepository.findOne({ epoch: poolCert.epoch })
          : null;

        if (!epoch) {
          console.log(
            `ERROR::PoolSync()->syncPoolUpdate()->this.epochRepository.findOne(${poolCert.epoch}) returned ${epoch}`,
          );
          return;
        }

        const newCert = new PoolCert();
        newCert.pool = pool;
        newCert.epoch = epoch;
        newCert.active = poolCert.active;
        newCert.margin = poolCert.margin;
        newCert.fixed = poolCert.fixed;
        newCert.active = poolCert.active;
        newCert.txHash = poolCert.txHash;
        newCert.block = poolCert.block;
        newCert.owners = [];

        // Add or create reward account
        if (poolCert.rewardAccount) {
          let rewardAccount = poolCert.rewardAccount
            ? await accountRepository.findOne({
                stakeAddress: poolCert.rewardAccount,
              })
            : null;

          if (!rewardAccount) {
            rewardAccount = new Account();
            rewardAccount.stakeAddress = poolCert.rewardAccount;
            rewardAccount = await this.em.save(rewardAccount);
          }

          newCert.rewardAccount = rewardAccount;
        }

        // Add or create owner account
        if (poolCert.owners) {
          for (let j = 0; j < poolCert.owners.length; j++) {
            const certOwner = poolCert.owners[j];
            let owner = await accountRepository.findOne({
              stakeAddress: certOwner,
            });

            if (!owner) {
              owner = new Account();
              owner.stakeAddress = certOwner;
              owner = await this.em.save(owner);
            }

            const bindRecord = new PoolOwner();
            bindRecord.cert = newCert;
            bindRecord.account = owner;

            newCert.owners.push(bindRecord);
          }
        }

        await this.em.transaction(async (em) => {
          await em.save(newCert);
          console.log(
            `[${new Date().toUTCString()}] Pool Cert Sync - Adding new epoch ${
              newCert.epoch.epoch
            } certificate for Pool ${newCert.pool.poolId}`,
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
    const poolCertRepository = this.em.getCustomRepository(PoolCertRepository);

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

      const lastCert = await poolCertRepository.findLastCert(
        pool.poolId,
        epoch.epoch,
      );

      if (!lastCert) {
        console.log(
          `ERROR::PoolSync()->syncPoolHistory()->poolCertRepository.findLastCert(${pool.poolId}, ${epoch.epoch}) returned ${lastCert}.`,
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
      newHistory.cert = lastCert;

      poolHistoryRepository.save(newHistory);
      console.log(
        `[${new Date().toUTCString()}] Pool Update Sync - Creating Epoch ${
          newHistory.epoch.epoch
        } history record for Pool ${newHistory.pool.poolId}`,
      );
    }
  }
}
