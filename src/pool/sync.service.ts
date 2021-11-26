import { Injectable, Logger } from '@nestjs/common';
import config from '../../config.json';
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
import type { PoolHistoryType } from '../utils/api/types/pool-history.type';
import { ArmadaService } from '../utils/api/armada.service';
import { SyncConfigPoolsType } from '../utils/types/config.type';
import { AccountHistoryRepository } from '../account/repositories/account-history.repository';

@Injectable()
export class SyncService {
  private readonly PROVIDER_LIMIT = config.provider.blockfrost.limit;
  private readonly logger = new Logger(SyncService.name);
  private memberPools: SyncConfigPoolsType = [];

  constructor(
    @InjectEntityManager()
    private readonly em: EntityManager,
    private readonly source: BlockfrostService,
    private readonly armadaService: ArmadaService,
  ) {}

  async syncMember(): Promise<void> {
    const pools = await this.armadaService.getPools();

    if (!pools) {
      this.logger.log(
        `ERROR::PoolSync()->init()->this.armadaService.getPools()`,
      );
      return;
    }

    this.memberPools = pools;

    this.processNonMember(pools);

    const poolRepository = this.em.getCustomRepository(PoolRepository);

    for (const pool of pools) {
      let action = 'Updating';
      let poolEntity = await poolRepository.findOne({ poolId: pool.id });
      if (!poolEntity) {
        action = 'Creating';
        poolEntity = new Pool();
        poolEntity.poolId = pool.id;
        poolEntity.name = pool.name;
      }

      poolEntity.isMember = true;
      await poolRepository.save(poolEntity);
      this.logger.log(`Pool Init - ${action} Pool ${poolEntity.poolId}`);
    }
  }

  async processNonMember(pools: SyncConfigPoolsType) {
    const memberIds: string[] = [];

    for (const pool of pools) {
      memberIds.push(pool.id);
    }

    const optOutMembers = await this.em
      .getCustomRepository(PoolRepository)
      .findOptOutMembers(memberIds);

    for (const pool of optOutMembers) {
      pool.isMember = false;
      await this.em.save(pool);
      this.logger.log(`Removing membership for pool ID: ${pool.poolId}`);
    }
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
      this.logger.log(
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
      pool.isMember = this.memberPools.some(
        (memberPool) => memberPool.id === pool.poolId,
      );

      await this.em.getCustomRepository(PoolRepository).save(pool);
      this.logger.log(`Pool Sync - Updating Pool ${pool.poolId}`);
    }
  }

  async syncPoolCert(pool: Pool) {
    const lastCert = await this.source.getLastPoolCert(pool.poolId);

    if (!lastCert) {
      this.logger.error(
        `this.source.getLastPoolUpdate(${pool.poolId}) returned ${lastCert}`,
        'PoolSync()->syncPoolCert()',
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
          this.logger.warn(
            `this.epochRepository.findOne(${poolCert.epoch}) returned ${epoch}`,
            'PoolSync()->syncPoolCert()',
          );
          continue;
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
          this.logger.log(
            `Pool Cert Sync - Adding new epoch ${newCert.epoch.epoch} certificate for Pool ${newCert.pool.poolId}`,
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
        pages === 1 ? epochToSync % this.PROVIDER_LIMIT : this.PROVIDER_LIMIT;
      let upstreamHistory = await this.source.getPoolHistory(
        pool.poolId,
        i,
        limit,
      );

      if (!upstreamHistory) {
        this.logger.log(
          `ERROR::PoolSync()->syncPoolHistory()->this.source.getPoolHistory(${pool.poolId},${i},${this.PROVIDER_LIMIT},) returned ${upstreamHistory}`,
        );
        continue;
      }

      // Rewards are 2 epoch backwards, ignore 2 last history records
      upstreamHistory = upstreamHistory.slice(i === 1 ? 2 : 0);
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
        this.logger.log(
          `NOT FOUND::PoolSync()->syncPoolHistory()->this.epochRepository.findOne(${history[i].epoch}) returned ${epoch}.`,
        );
        continue;
      }

      let newHistory = await poolHistoryRepository.findOneRecord(
        pool.poolId,
        epoch.epoch,
      );

      if (newHistory) {
        this.logger.log(
          `DUPLICATE::PoolSync()->syncPoolHistory()->poolHistoryRepository.findOneRecord(${pool.poolId}, ${epoch.epoch}).`,
        );
        continue;
      }

      const lastCert = await poolCertRepository.findLastCert(
        pool.poolId,
        epoch.epoch,
      );

      if (!lastCert) {
        this.logger.log(
          `NOT FOUND::PoolSync()->syncPoolHistory()->poolCertRepository.findLastCert(${pool.poolId}, ${epoch.epoch}) returned ${lastCert}.`,
        );
        continue;
      }

      newHistory = new PoolHistory();
      newHistory.epoch = epoch;
      newHistory.pool = pool;
      newHistory.rewards = history[i].rewards;
      newHistory.fees = history[i].fees;
      newHistory.blocks = history[i].blocks;
      newHistory.activeStake = history[i].activeStake;
      newHistory.cert = lastCert;

      await poolHistoryRepository.save(newHistory);
      this.logger.log(
        `Pool Update Sync - Creating Epoch ${newHistory.epoch.epoch} history record for Pool ${newHistory.pool.poolId}`,
      );
    }
  }

  async processMultiOwner() {
    const accountHistoryRepository = this.em.getCustomRepository(
      AccountHistoryRepository,
    );

    const memberPools = await this.em
      .getCustomRepository(PoolRepository)
      .findAllMembers();

    for (const member of memberPools) {
      const unprocessed = await this.em
        .getCustomRepository(PoolHistoryRepository)
        .findUnprocessed(member.poolId);

      for (const record of unprocessed) {
        const cert = record.cert;

        // if (cert.epoch.epoch + 3 > record.epoch.epoch) {
        //   const previousCert = await this.em
        //     .getCustomRepository(PoolCertRepository)
        //     .findLastCert(record.pool.poolId, cert.epoch.epoch - 3);
        //
        //   if (!previousCert) {
        //     this.logger.error(
        //       `Certificate of epoch ${
        //         record.epoch.epoch - 3
        //       } not found for pool ${record.pool.poolId}`,
        //       'PoolSyncService.processMultiOwner()',
        //     );
        //     continue;
        //   }
        //   cert = previousCert;
        // }

        const ownersStakeAddr = cert.owners.map(
          (owner) => owner.account.stakeAddress,
        );

        const ownersAccountHistory =
          await accountHistoryRepository.findAccountSelection(
            ownersStakeAddr,
            record.epoch.epoch,
          );

        let totalStake = 0;

        for (const accountHistory of ownersAccountHistory) {
          totalStake += accountHistory.balance;
        }

        const rewardAccountHistory =
          await accountHistoryRepository.findOneRecord(
            cert.rewardAccount.stakeAddress,
            record.epoch.epoch,
          );

        if (!rewardAccountHistory) {
          this.logger.warn(
            `Epoch ${record.epoch.epoch} Reward account history not found for pool cert ID: ${cert.id}`,
            'PoolSyncService.processMultiOwner()',
          );
          continue;
        }

        const netRewards = rewardAccountHistory.rewards - record.fees;

        for (const accountHistory of ownersAccountHistory) {
          accountHistory.stakeShare = totalStake
            ? accountHistory.balance / totalStake
            : 0;
          accountHistory.opRewards = Math.floor(
            record.fees / ownersAccountHistory.length,
          );
          accountHistory.revisedRewards = Math.floor(
            accountHistory.stakeShare * netRewards,
          );
          accountHistory.owner = true;

          await this.em.save(accountHistory);
          this.logger.log(
            `Epoch ${record.epoch.epoch} Rewards revised for owner account ${accountHistory.account.stakeAddress}`,
          );
        }

        record.rewardsRevised = true;

        await this.em.save(record);
        this.logger.log(
          `Epoch ${record.epoch.epoch} Owners Rewards revised for pool ${record.pool.poolId}`,
        );
      }
    }
  }
}
