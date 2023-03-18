import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
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
import type { PoolHistoryType } from '../utils/api/types/pool-history.type';
import { ArmadaService } from '../utils/api/armada.service';
import { SyncConfigPoolsType } from '../utils/types/config.type';
import { PoolService } from './pool.service';
import { PoolCertService } from './pool-cert.service';
import { PoolHistoryService } from './pool-history.service';
import { AccountHistoryService } from '../account/account-history.service';

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
    private readonly poolService: PoolService,
    private readonly poolHistoryService: PoolHistoryService,
    private readonly poolCertService: PoolCertService,
    @Inject(forwardRef(() => AccountHistoryService))
    private readonly accountHistoryService: AccountHistoryService,
  ) {}

  async syncMember(): Promise<void> {
    this.logger.log('Starting PoolSync:syncMember() ...');

    const pools = await this.armadaService.getPools();

    if (!pools) {
      this.logger.log(
        `ERROR::PoolSync()->init()->this.armadaService.getPools()`,
      );
      return;
    }

    this.memberPools = pools;

    this.processNonMember(pools).then();

    const poolRepository = this.em.getRepository(Pool);

    for (const pool of pools) {
      let action = 'Updating';
      let poolEntity = await poolRepository.findOne({
        where: { poolId: pool.id },
      });
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

    const optOutMembers = await this.poolService.findOptOutMembers(memberIds);

    for (const pool of optOutMembers) {
      pool.isMember = false;
      await this.em.save(pool);
      this.logger.log(`Removing membership for pool ID: ${pool.poolId}`);
    }
  }

  async syncPool(pool: Pool, lastEpoch: Epoch) {
    await this.syncPoolCert(pool, lastEpoch);
    await this.syncPoolInfo(pool, lastEpoch);
    await this.syncPoolHistory(pool, lastEpoch);
  }

  async syncPoolInfo(pool: Pool, lastEpoch: Epoch): Promise<void> {
    const poolCert = await this.source.getPoolInfo(pool.poolId);

    if (!poolCert) {
      this.logger.log(
        `ERROR::PoolSync()->syncPoolInfo()->this.source.getPoolInfo(${pool.poolId}) returned ${poolCert}`,
      );
      return;
    }

    if (!pool.epoch || pool.epoch.epoch !== lastEpoch.epoch) {
      const lastCert = await this.poolCertService.findLastCert(pool.poolId);

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

      await this.em.save(pool);
      this.logger.log(`Pool Sync - Updating Pool ${pool.poolId}`);
    }
  }

  async syncPoolCert(pool: Pool, lastEpoch: Epoch) {
    const lastCert = await this.source.getLastPoolCert(pool.poolId);

    if (!lastCert) {
      this.logger.error(
        `this.source.getLastPoolUpdate(${pool.poolId}) returned ${lastCert}`,
        'PoolSync()->syncPoolCert()',
      );
      return;
    }

    const lastStoredCert = await this.poolCertService.findLastCert(pool.poolId);

    const lastStoredHash = lastStoredCert ? lastStoredCert.txHash : '';
    const lastStoredBlock = lastStoredCert ? lastStoredCert.block : 0;

    // Check whether a sync is required or not
    if (lastStoredCert && lastCert.txHash === lastStoredCert.txHash) {
      return;
    }

    const poolCerts = await this.source.getAllPoolCert(
      pool.poolId,
      lastStoredCert?.txHash,
    );
    const epochRepository = this.em.getRepository(Epoch);
    const accountRepository = this.em.getRepository(Account);

    for (const poolCert of poolCerts) {
      if (
        poolCert.block >= lastStoredBlock &&
        poolCert.txHash !== lastStoredHash
      ) {
        if (poolCert.epoch > lastEpoch.epoch) {
          // Do not sync future certificate
          continue;
        }

        const epoch = poolCert.epoch
          ? await epochRepository.findOne({ where: { epoch: poolCert.epoch } })
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
        newCert.txHash = poolCert.txHash;
        newCert.block = poolCert.block;
        newCert.owners = [];

        // Add or create reward account
        if (poolCert.rewardAccount) {
          let rewardAccount = poolCert.rewardAccount
            ? await accountRepository.findOne({
                where: { stakeAddress: poolCert.rewardAccount },
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
          for (const certOwner of poolCert.owners) {
            let owner = await accountRepository.findOne({
              where: { stakeAddress: certOwner },
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
    const lastCert = await this.poolCertService.findLastCert(pool.poolId);

    if (!lastCert) {
      this.logger.warn(
        `Pool History Sync - No cert found for pool ${pool.poolId}`,
      );
      return;
    }

    const poolHistoryRepository = this.em.getRepository(PoolHistory);
    const lastStoredEpoch = await this.poolHistoryService.findLastEpoch(
      pool.poolId,
    );

    const lastActiveEpoch = lastCert.active
      ? lastEpoch.epoch
      : lastCert.epoch.epoch - 1;

    const epochToSync = lastStoredEpoch
      ? lastActiveEpoch - lastStoredEpoch.epoch.epoch - 1
      : lastActiveEpoch - 207;
    const pages = Math.ceil(epochToSync / this.PROVIDER_LIMIT);

    // Pool history on Blockfrost is  1 epoch behind current epoch
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

      // Rewards are updated 2 epoch backwards, ignore 2 last history records
      // Pool history on Blockfrost is already 1 epoch backwards, so slice 1
      upstreamHistory = upstreamHistory.slice(i === 1 ? 1 : 0);
      upstreamHistory.reverse();
      history = history.concat(upstreamHistory);
    }

    const epochRepository = this.em.getRepository(Epoch);

    for (const record of history) {
      const epoch = record.epoch
        ? await epochRepository.findOne({ where: { epoch: record.epoch } })
        : null;

      if (!epoch) {
        this.logger.log(
          `NOT FOUND::PoolSync()->syncPoolHistory()->this.epochRepository.findOne(${record.epoch}) returned ${epoch}.`,
        );
        continue;
      }

      let newHistory = await this.poolHistoryService.findOneRecord(
        pool.poolId,
        epoch.epoch,
      );

      if (newHistory) {
        this.logger.warn(
          `DUPLICATE::PoolSync()->syncPoolHistory()->poolHistoryRepository.findOneRecord(${pool.poolId}, ${epoch.epoch}).`,
        );
        continue;
      }

      const lastCert = await this.poolCertService.findLastCert(
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
      newHistory.rewards = record.rewards;
      newHistory.fees = record.fees;
      newHistory.blocks = record.blocks;
      newHistory.activeStake = record.activeStake;
      newHistory.cert = lastCert;

      await poolHistoryRepository.save(newHistory);
      this.logger.log(
        `Pool Update Sync - Creating Epoch ${newHistory.epoch.epoch} history record for Pool ${newHistory.pool.poolId}`,
      );
    }
  }

  async processPoolOwner(lastEpoch: Epoch) {
    this.logger.log(`*** Starting Multi-Owner calculation ***`);

    const pools = await this.poolService.findUserOwnedPools();

    for (const pool of pools) {
      /**
       * Find unprocessed records from lastEpoch - 3, which is epoch where last
       * account history paid rewards were minted. Last account history synchronized
       * being lastEpoch - 1.
       */
      const unprocessed = await this.poolHistoryService.findUnprocessed(
        pool.poolId,
        lastEpoch.epoch - 3,
      );

      for (const record of unprocessed) {
        const cert = record.cert;

        const pledgeStakeAddr = cert.owners.map(
          (owner) => owner.account.stakeAddress,
        );

        const rewardAccountHistoryM0 =
          await this.accountHistoryService.findOneRecord(
            cert.rewardAccount.stakeAddress,
            record.epoch.epoch,
          );

        const rewardAccountHistoryP2 =
          await this.accountHistoryService.findOneRecord(
            cert.rewardAccount.stakeAddress,
            record.epoch.epoch + 2,
          );

        if (!rewardAccountHistoryM0 || !rewardAccountHistoryP2) {
          this.logger.warn(
            `Epoch ${record.epoch.epoch} Reward account history M0 or P2 not found for pool cert ID: ${cert.id}`,
            'PoolSyncService.processMultiOwner()',
          );
          continue;
        }

        // Making sure pool reward account is part of the owners addresses
        const ownersStakeAddr = [
          ...new Set([cert.rewardAccount.stakeAddress, ...pledgeStakeAddr]),
        ];

        const ownersAccountHistoryM0 =
          await this.accountHistoryService.findEpochHistorySelection(
            ownersStakeAddr,
            record.epoch.epoch,
          );

        const ownersAccountHistoryP2 =
          await this.accountHistoryService.findEpochHistorySelection(
            ownersStakeAddr,
            record.epoch.epoch + 2,
          );

        if (
          ownersAccountHistoryM0.length !== ownersStakeAddr.length ||
          ownersAccountHistoryP2.length !== ownersStakeAddr.length
        ) {
          // Reward account already verified, any pledge account history could be missing.
          this.logger.warn(
            `Missing pledge account history M0 or P2 for epoch ${record.epoch.epoch}. (One or more.)`,
            'PoolSyncService.processMultiOwner()',
          );
          continue;
        }

        let totalStake = 0;

        for (const accountHistoryM0 of ownersAccountHistoryM0) {
          totalStake += accountHistoryM0.balance;
        }

        const netRewards = rewardAccountHistoryP2.rewards - record.fees;

        for (const accountHistoryM0 of ownersAccountHistoryM0) {
          const historyP2Index = ownersAccountHistoryP2.findIndex(
            (h) =>
              h.account.stakeAddress === accountHistoryM0.account.stakeAddress,
          );

          accountHistoryM0.stakeShare = totalStake
            ? accountHistoryM0.balance / totalStake
            : 0;

          // OpRewards equally shared among pledge addresses only
          if (pledgeStakeAddr.includes(accountHistoryM0.account.stakeAddress)) {
            ownersAccountHistoryP2[historyP2Index].opRewards = Math.floor(
              record.fees / pledgeStakeAddr.length,
            );
          }

          // RevisedRewards == netRewards * stakeShare
          ownersAccountHistoryP2[historyP2Index].revisedRewards = Math.floor(
            accountHistoryM0.stakeShare * netRewards,
          );
          accountHistoryM0.owner = true;
          ownersAccountHistoryP2[historyP2Index].owner = true;

          await this.em.save(accountHistoryM0);
          await this.em.save(ownersAccountHistoryP2[historyP2Index]);
          this.logger.log(
            `Epoch ${
              record.epoch.epoch + 2
            } Rewards revised for owner account ${
              accountHistoryM0.account.stakeAddress
            }`,
          );
        }

        record.rewardsRevised = true;

        await this.em.save(record);
        this.logger.log(
          `Epoch ${record.epoch.epoch + 2} Owners Rewards revised for pool ${
            record.pool.poolId
          }`,
        );
      }
    }
  }
}
