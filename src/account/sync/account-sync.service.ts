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

    account.rewardsSum = accountUpdate.rewardsSum;

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
      // Combine leader and member rewards if needed
      const epochRHs = rewardsHistory.filter(
        (rh) => rh.epoch === history[i].epoch,
      );
      const rh = epochRHs.length
        ? epochRHs.reduce((result, next) => ({
            epoch: next.epoch,
            rewards: result.rewards + next.rewards,
            poolId: result.poolId,
          }))
        : null;

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

      if (!pool && history[i].poolId) {
        pool = new Pool();
        pool.poolId = history[i].poolId;
        pool.isMember = false;
        pool = await this.em.save(pool);
        await this.poolSyncService.syncPool(pool, lastEpoch);
      }

      // Fetch previous epoch ( Current epoch - 1 )
      const previousEpoch = await this.accountHistoryService.findOneRecord(
        account.stakeAddress,
        epoch.epoch - 1,
      );

      // Fetch snapshot epoch ( Current epoch - 3 )
      const snapshotEpoch = await this.accountHistoryService.findOneRecord(
        account.stakeAddress,
        epoch.epoch - 3,
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

      // Create new history
      newHistory = new AccountHistory();

      newHistory.account = account;
      newHistory.epoch = epoch;
      newHistory.activeStake = history[i].amount;
      newHistory.revisedRewards = 0;
      newHistory.rewards = rh ? rh.rewards : 0;
      newHistory.mir = totalMIR;
      newHistory.pool = pool;
      newHistory.withdrawable = previousEpoch
        ? previousEpoch.withdrawable -
          previousEpoch.withdrawn +
          newHistory.rewards +
          totalMIR
        : newHistory.rewards + totalMIR;
      newHistory.balance = snapshotEpoch
        ? newHistory.activeStake - snapshotEpoch.withdrawable
        : newHistory.activeStake;
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

      // Reset account loyalty score
      account.loyalty = 0;
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
        await this.syncHistory(account, account.epoch);
      }
    }
  }
}
