import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import config from '../../../config.json';
import { BlockfrostService } from '../../utils/api/blockfrost.service';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Account } from '../entities/account.entity';
import { AccountHistory } from '../entities/account-history.entity';
import { Epoch } from '../../epoch/entities/epoch.entity';
import { Pool } from '../../pool/entities/pool.entity';
import type { AccountHistoryType } from '../../utils/api/types/account-history.type';
import type { AccountRewardsHistoryType } from '../../utils/api/types/account-rewards-history.type';
import { PoolService } from '../../pool/pool.service';
import { AccountWithdraw } from '../entities/account-withdraw.entity';
import { AccountHistoryService } from '../account-history.service';
import { AccountWithdrawService } from '../account-withdraw.service';
import { EpochService } from '../../epoch/epoch.service';

@Injectable()
export class AccountSyncService {
  private readonly PROVIDER_LIMIT = config.provider.blockfrost.limit;
  private readonly logger = new Logger(AccountSyncService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly source: BlockfrostService,
    @Inject(forwardRef(() => PoolService))
    private readonly poolService: PoolService,
    private readonly accountHistoryService: AccountHistoryService,
    private readonly accountWithdrawService: AccountWithdrawService,
    private readonly epochService: EpochService,
  ) {}

  async syncInfo(account: Account, lastEpoch: Epoch): Promise<Account> {
    if (account.epoch?.epoch === lastEpoch.epoch) return account;

    const accountUpdate = await this.source.getAccountInfo(
      account.stakeAddress,
    );

    if (!accountUpdate) {
      this.logger.log(
        `NOT FOUND::AccountSync()->syncAccount()->source.getAccountInfo(${account.stakeAddress}) returned ${accountUpdate}.`,
      );
      return account;
    }

    account.rewardsSum = accountUpdate.rewardsSum;

    account.epoch = lastEpoch;
    if (account.pool?.poolId !== accountUpdate.poolId) {
      let pool = accountUpdate.poolId
        ? await this.em
            .getRepository(Pool)
            .findOne({ where: { poolId: accountUpdate.poolId } })
        : null;

      if (pool === undefined) {
        pool = new Pool();
        pool.poolId = accountUpdate.poolId;
        pool.isMember = false;
        pool = await this.em.save(pool);
      }

      account.pool = pool;
    }

    account = await this.em.save(account);

    this.logger.log(`Account Sync - Updating account ${account.stakeAddress}`);

    return account;
  }

  async syncHistory(account: Account, lastEpoch: Epoch): Promise<void> {
    const lastStoredEpoch = await this.accountHistoryService.findLastEpoch(
      account.stakeAddress,
    );

    if (lastStoredEpoch?.epoch.epoch === lastEpoch.epoch) return;

    const epochToSync = lastStoredEpoch
      ? lastEpoch.epoch - lastStoredEpoch.epoch.epoch
      : lastEpoch.epoch - 207;
    const pages = Math.ceil(epochToSync / this.PROVIDER_LIMIT);

    let history: AccountHistoryType = [];
    let rewardsHistory: AccountRewardsHistoryType = [];

    for (let i = pages; i >= 1; i--) {
      const limit =
        pages === 1 ? epochToSync % this.PROVIDER_LIMIT : this.PROVIDER_LIMIT;
      const fetchUpstreamHistory = this.source.getAccountHistory(
        account.stakeAddress,
        i,
        limit,
      );
      const fetchUpstreamRewardsHistory = this.source.getAccountRewardsHistory(
        account.stakeAddress,
        i,
        limit,
      );

      let upstreamHistory = await fetchUpstreamHistory;

      if (!upstreamHistory) {
        this.logger.error(
          `AccountSync()->syncHistory()->this.source.getAccountHistory(${account.stakeAddress},${i},${this.PROVIDER_LIMIT}) returned ${upstreamHistory}.`,
        );
        return;
      }

      const upstreamRewardsHistory = await fetchUpstreamRewardsHistory;

      if (!upstreamRewardsHistory) {
        this.logger.error(
          `AccountSync()->syncHistory()->this.source.getAccountRewardsHistory(${account.stakeAddress},${i},${this.PROVIDER_LIMIT}) returned ${upstreamRewardsHistory}`,
        );
        return;
      }

      // Rewards are 2 epoch backwards, ignore 2 last history records
      upstreamHistory = upstreamHistory.slice(i === 1 ? 2 : 0);
      upstreamHistory.reverse();
      history = history.concat(upstreamHistory);

      upstreamRewardsHistory.reverse();
      rewardsHistory = rewardsHistory.concat(upstreamRewardsHistory);
    }

    const epochRepository = this.em.getRepository(Epoch);
    const poolRepository = this.em.getRepository(Pool);

    for (let i = 0; i < history.length; i++) {
      const rh = rewardsHistory.find((rh) => rh.epoch === history[i].epoch);
      const epoch = history[i].epoch
        ? await epochRepository.findOne({ where: { epoch: history[i].epoch } })
        : null;
      let pool = history[i].poolId
        ? await poolRepository.findOne({ where: { poolId: history[i].poolId } })
        : null;

      if (!epoch) {
        this.logger.log(
          `NOT FOUND::AccountSync()->syncHistory()->this.epochRepository.findOne(${history[i].epoch})`,
        );
        continue;
      }

      let newHistory = await this.accountHistoryService.findOneRecord(
        account.stakeAddress,
        epoch.epoch,
      );

      if (newHistory) {
        this.logger.log(
          `DUPLICATE::AccountSync()->syncHistory()->accountHistoryRepository.findOneRecord(${account.stakeAddress}, ${epoch.epoch})`,
        );
        continue;
      }

      if (pool === undefined) {
        pool = new Pool();
        pool.poolId = history[i].poolId;
        pool.isMember = false;
        pool = await this.em.save(pool);
      }

      const previousEpoch = await this.accountHistoryService.findOneRecord(
        account.stakeAddress,
        epoch.epoch - 1,
      );
      const snapshotEpoch = await this.accountHistoryService.findOneRecord(
        account.stakeAddress,
        epoch.epoch - 3,
      );
      const withdrawals =
        await this.accountWithdrawService.findEpochWithdrawals(
          account.stakeAddress,
          epoch.epoch,
        );

      let totalWithdraw = 0;
      for (const withdraw of withdrawals) {
        totalWithdraw += withdraw.amount;
      }

      newHistory = new AccountHistory();

      newHistory.account = account;
      newHistory.epoch = epoch;
      newHistory.activeStake = history[i].amount;
      newHistory.revisedRewards = 0;
      newHistory.rewards = rh ? rh.rewards : 0;
      newHistory.pool = pool;
      newHistory.withdrawable = previousEpoch
        ? previousEpoch.withdrawable -
          previousEpoch.withdrawn +
          newHistory.rewards
        : newHistory.rewards;
      newHistory.balance = snapshotEpoch
        ? newHistory.activeStake - snapshotEpoch.withdrawable
        : newHistory.activeStake;
      newHistory.withdrawn = totalWithdraw;

      // Tracking user loyalty to configured pools
      account.loyalty = account.pool?.isMember ? account.loyalty + 1 : 0;

      if (pool) {
        newHistory.owner = await this.poolService.isOwner(
          account.stakeAddress,
          pool,
          epoch,
        );
      } else {
        newHistory.owner = false;
      }

      await this.em.save(newHistory);
      this.logger.log(
        `Account History Sync - Creating Epoch ${newHistory.epoch.epoch} history record for account ${account.stakeAddress}`,
      );
    }
  }

  async syncAccountWithdrawal(account: Account): Promise<Account> {
    const lastWithdraw = await this.accountWithdrawService.findLastWithdraw();

    const withdrawals = await this.source.getAllAccountWithdrawal(
      account.stakeAddress,
      lastWithdraw?.txHash,
    );

    for (const withdraw of withdrawals) {
      const storedWithdrawal = await this.em
        .getRepository(AccountWithdraw)
        .findOne({ where: { txHash: withdraw.txHash } });

      if (storedWithdrawal) {
        continue;
      }

      const epoch = await this.epochService.findOneFromTime(withdraw.blockTime);

      if (!epoch) {
        this.logger.error(
          `Could not find Epoch for time ${withdraw.blockTime}`,
          'AccountSync()->syncAccountWithdrawal()',
        );
        continue;
      }

      const newWithdrawal = new AccountWithdraw();
      newWithdrawal.account = account;
      newWithdrawal.epoch = epoch;
      newWithdrawal.txHash = withdraw.txHash;
      newWithdrawal.block = withdraw.block;
      newWithdrawal.amount = withdraw.amount;

      await this.em.save(newWithdrawal);
      this.logger.log(
        `Account Withdrawal Sync - Adding epoch ${newWithdrawal.epoch.epoch} withdrawal record for account ${account.stakeAddress}`,
      );
    }

    return account;
  }
}
