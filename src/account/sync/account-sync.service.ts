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
import { MirTransactionService } from '../mir-transaction.service';
import { SyncService } from '../../pool/sync.service';
import { AccountService } from '../account.service';
import { PoolHistoryService } from '../../pool/pool-history.service';
import { MirSyncService } from './mir-sync.service';

@Injectable()
export class AccountSyncService {
  private readonly PROVIDER_LIMIT = config.provider.blockfrost.limit;
  private readonly logger = new Logger(AccountSyncService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly source: BlockfrostService,
    @Inject(forwardRef(() => PoolService))
    private readonly poolService: PoolService,
    private readonly poolHistoryService: PoolHistoryService,
    private readonly poolSyncService: SyncService,
    private readonly mirSync: MirSyncService,
    @Inject(forwardRef(() => AccountService))
    private readonly accountService: AccountService,
    private readonly accountHistoryService: AccountHistoryService,
    private readonly accountWithdrawService: AccountWithdrawService,
    private readonly epochService: EpochService,
    private readonly mirTransactionService: MirTransactionService,
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

    account.active = accountUpdate.active;
    account.rewardsSum = accountUpdate.rewardsSum;
    account.withdrawable = accountUpdate.withdrawableAmount;

    account.epoch = lastEpoch;
    if (account.pool?.poolId !== accountUpdate.poolId) {
      let pool = accountUpdate.poolId
        ? await this.em
            .getRepository(Pool)
            .findOne({ where: { poolId: accountUpdate.poolId } })
        : null;

      if (!pool && accountUpdate.poolId) {
        pool = new Pool();
        pool.poolId = accountUpdate.poolId;
        pool.isMember = false;
        pool = await this.em.save(pool);
        await this.poolSyncService.syncPool(pool, lastEpoch);
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
    /**
     * NOTE on different LIMIT for history & rewards.
     *
     * Rewards history can have multiple different sources per epoch.
     * We fetch twice the amount of rewards history make sure the whole epoch
     * range is fetch.
     */
    const halfLimit = this.PROVIDER_LIMIT / 2;
    const pages = Math.ceil(epochToSync / halfLimit);

    let history: AccountHistoryType = [];
    let rewardsHistory: AccountRewardsHistoryType = [];

    for (let i = pages; i >= 1; i--) {
      const historyLimit = pages === 1 ? epochToSync % halfLimit : halfLimit;
      const fetchUpstreamHistory = this.source.getAccountHistory(
        account.stakeAddress,
        i,
        historyLimit,
      );

      const rewardsLimit =
        pages === 1 ? epochToSync % this.PROVIDER_LIMIT : this.PROVIDER_LIMIT;
      const fetchUpstreamRewardsHistory = this.source.getAccountRewardsHistory(
        account.stakeAddress,
        i,
        rewardsLimit,
      );

      let upstreamHistory = await fetchUpstreamHistory;

      if (!upstreamHistory) {
        this.logger.error(
          `AccountSync()->syncHistory()->this.source.getAccountHistory(${account.stakeAddress},${i},${halfLimit}) returned ${upstreamHistory}.`,
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

      // Events like MIR and Refunds affect current epoch, ignore current epoch
      upstreamHistory = upstreamHistory.slice(i === 1 ? 1 : 0);
      upstreamHistory.reverse();
      history = history.concat(upstreamHistory);

      upstreamRewardsHistory.reverse();
      rewardsHistory = rewardsHistory.concat(upstreamRewardsHistory);
    }

    for (let i = 0; i < history.length; i++) {
      if (lastStoredEpoch && history[i].epoch <= lastStoredEpoch.epoch.epoch) {
        continue;
      }

      const epoch = history[i].epoch
        ? await this.em
            .getRepository(Epoch)
            .findOne({ where: { epoch: history[i].epoch } })
        : null;

      if (!epoch) {
        this.logger.log(
          `NOT FOUND::AccountSync()->syncHistory()->this.epochRepository.findOne(${history[i].epoch})`,
        );
        continue;
      }

      // Safety unique constraint check
      let newHistory = await this.accountHistoryService.findOneRecord(
        account.stakeAddress,
        epoch.epoch,
      );

      if (newHistory) {
        this.logger.warn(
          `DUPLICATE::AccountSync()->syncHistory()->accountHistoryRepository.findOneRecord(${account.stakeAddress}, ${epoch.epoch})`,
        );
        continue;
      }

      let pool = history[i].poolId
        ? await this.em
            .getRepository(Pool)
            .findOne({ where: { poolId: history[i].poolId } })
        : null;

      // Filter leader & member rewards (2 epochs behind)
      const standardRewards = rewardsHistory.filter(
        (rh) =>
          rh.epoch === history[i].epoch - 2 &&
          (rh.type === 'leader' || rh.type === 'member'),
      );

      // Filter refunds (same epoch, like MIR)
      const depositRefunds = rewardsHistory.filter(
        (rh) =>
          rh.epoch === history[i].epoch && rh.type === 'pool_deposit_refund',
      );

      // Combine leader and member rewards if needed
      const rewardsHs = standardRewards.length
        ? standardRewards.reduce((result, next) => ({
            epoch: history[i].epoch, // Override source epoch with current
            rewards: result.rewards + next.rewards,
            poolId: result.poolId,
            type: 'rewards',
          }))
        : null;
      const rewardsAmount = rewardsHs ? rewardsHs.rewards : 0;

      // Combine pool deposit refunds
      const refundsHs = depositRefunds.length
        ? depositRefunds.reduce((result, next) => ({
            epoch: next.epoch,
            rewards: result.rewards + next.rewards,
            poolId: result.poolId,
            type: 'refunds',
          }))
        : null;
      const refundsAmount = refundsHs ? refundsHs.rewards : 0;

      if (!pool && history[i].poolId) {
        pool = new Pool();
        pool.poolId = history[i].poolId;
        pool.isMember = false;
        pool = await this.em.save(pool);
        await this.poolSyncService.syncPool(pool, lastEpoch);
      }

      // epochM1 : Fetch previous epoch ( Current epoch - 1 )
      const epochM1 = await this.accountHistoryService.findOneRecord(
        account.stakeAddress,
        epoch.epoch - 1,
      );

      // Epoch Withdrawals
      const withdrawals =
        await this.accountWithdrawService.findEpochWithdrawals(
          account.stakeAddress,
          epoch.epoch,
        );

      let totalWithdraw = 0;
      for (const withdraw of withdrawals) {
        totalWithdraw += withdraw.amount;
      }

      // Epoch MIR Transactions
      const mirTransactions =
        await this.mirTransactionService.findEpochMIRTransactions(
          account.stakeAddress,
          epoch.epoch,
        );

      let totalMIR = 0;
      for (const mir of mirTransactions) {
        totalMIR += mir.amount;
      }

      /**
       * epochM1.withdrawable - epochM1.withdrawn
       *   + epochM0.paidRewards + epochM0.MIRs + epochM0.refunds
       */
      const withdrawable = epochM1
        ? epochM1.withdrawable -
          epochM1.withdrawn +
          rewardsAmount +
          totalMIR +
          refundsAmount
        : rewardsAmount + totalMIR + refundsAmount;

      // Create new history
      newHistory = new AccountHistory();
      newHistory.account = account;
      newHistory.epoch = epoch;
      newHistory.activeStake = history[i].amount;
      newHistory.revisedRewards = 0;
      newHistory.rewards = rewardsAmount;
      newHistory.mir = totalMIR;
      newHistory.refund = refundsAmount;
      newHistory.pool = pool;
      newHistory.withdrawable =
        withdrawable - totalWithdraw >= 0 ? withdrawable : totalWithdraw;
      /**
       * epochM0.activeStake - (epochM1.withdrawable - epochM1.withdrawn)
       */
      newHistory.balance = newHistory.activeStake
        ? newHistory.activeStake -
          (epochM1 ? epochM1.withdrawable - epochM1.withdrawn : 0)
        : 0;
      newHistory.withdrawn = totalWithdraw;

      // Tracking user loyalty to configured pools
      account.loyalty = newHistory.pool?.isMember ? account.loyalty + 1 : 0;

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

  async clearNegativeBalance(): Promise<void> {
    const accounts = await this.accountService.findAllWithNegativeBalance();

    if (accounts.length === 0) {
      this.logger.log('Account History balance integrity check: OK');
      return;
    } else {
      this.logger.warn(
        `Account History balance integrity check: Failed with ${accounts.length} corrupted`,
      );
    }

    for (const account of accounts) {
      this.logger.warn(
        `Account History integrity check: Account ${account.stakeAddress} history corrupted!`,
      );

      const history = await this.em
        .getRepository(AccountHistory)
        .createQueryBuilder('history')
        .innerJoinAndSelect('history.pool', 'pool')
        .innerJoin('history.epoch', 'epoch')
        .where('history.account = :accountId', { accountId: account.id })
        .orderBy('epoch', 'ASC')
        .getMany();

      const poolToReset: number[] = [];

      // Add pool to reset list
      for (const h of history) {
        if (
          h.balance < 0 ||
          h.withdrawable < 0 ||
          h.opRewards < 0 ||
          h.revisedRewards < 0
        ) {
          if (h.pool?.id) poolToReset.push(h.pool.id);
        }

        // Delete record
        await this.em.remove(h);
      }

      // Remove account withdrawal
      const withdrawals =
        await this.accountWithdrawService.findAccountWithdrawals(
          account.stakeAddress,
        );
      for (const w of withdrawals) {
        this.logger.warn(
          `Account History integrity check: Removing withdrawal id: ${w.id}`,
        );
        await this.em.remove(w);
      }

      // Reset account loyalty score
      account.loyalty = 0;
      // Reset account MIR last sync
      account.mirTransactionsLastSync = null;
      // Remove account MIR
      const MIRs = await this.mirTransactionService.findAccountMIRs(
        account.stakeAddress,
      );
      for (const mir of MIRs) {
        this.logger.warn(
          `Account History integrity check: Removing MIR txHash: ${mir.txHash}#${mir.txIndex}`,
        );
        await this.em.remove(mir);
      }

      await this.em.save(account);

      // Reset pools calculation
      const uniqPoolToReset = new Set(poolToReset);

      for (const id of uniqPoolToReset) {
        await this.poolHistoryService.resetCalculation(id);
        this.logger.warn(
          `Account History integrity check: Pool id: ${id} calculation reset`,
        );
      }

      this.logger.warn(
        `Account History integrity check: Account ${account.stakeAddress} history deleted!`,
      );

      if (account.epoch) {
        this.logger.log(
          `Account History integrity check: Syncing Account ${account.stakeAddress} history ...`,
        );
        await this.syncAccountWithdrawal(account);
        await this.mirSync.syncTransactions(account);
        await this.syncHistory(account, account.epoch);
      }
    }
  }
}
