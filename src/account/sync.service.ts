import { Injectable, Logger } from '@nestjs/common';
import config from '../../sync-config.json';
import { BlockfrostService } from '../utils/api/blockfrost.service';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Account } from './entities/account.entity';
import { AccountHistory } from './entities/account-history.entity';
import { Epoch } from '../epoch/entities/epoch.entity';
import { Pool } from '../pool/entities/pool.entity';
import { AccountRepository } from './repositories/account.repository';
import { CurrencyRepository } from '../spot/repositories/currency.repository';
import { PoolRepository } from '../pool/repositories/pool.repository';
import { EpochRepository } from '../epoch/repositories/epoch.repository';
import { AccountHistoryRepository } from './repositories/account-history.repository';
import type { AccountHistoryType } from '../utils/api/types/account-history.type';
import type { AccountRewardsHistoryType } from '../utils/api/types/account-rewards-history.type';
import type { SyncConfigAccountsType } from '../sync/types/sync-config.type';
import { PoolService } from '../pool/pool.service';

@Injectable()
export class SyncService {
  private readonly PROVIDER_LIMIT = config.provider.blockfrost.limit;
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly source: BlockfrostService,
    private readonly poolService: PoolService,
  ) {}

  async init(): Promise<void> {
    const accounts: SyncConfigAccountsType = config.accounts;
    const accountRepository = this.em.getCustomRepository(AccountRepository);
    const currencyRepository = this.em.getCustomRepository(CurrencyRepository);

    for (const account of accounts) {
      const accountEntity = await accountRepository.findOne({
        stakeAddress: account.stakeAddress,
      });
      if (!accountEntity) {
        const newAccount = new Account();

        newAccount.stakeAddress = account.stakeAddress;
        newAccount.name = account.name;
        if (account.currency) {
          const currency = await currencyRepository.findOne({
            code: account.currency,
          });
          newAccount.currency = currency ? currency : null;
        }

        accountRepository.save(newAccount);
        this.logger.log(
          `Account Init - Creating account ${newAccount.stakeAddress}`,
        );
      } else {
        accountEntity.name = account.name;
        if (account.currency) {
          const currency = await currencyRepository.findOne({
            code: account.currency,
          });
          accountEntity.currency = currency ? currency : null;
        }
        await accountRepository.save(accountEntity);
        this.logger.log(
          `Account Init - Updating account ${accountEntity.stakeAddress}`,
        );
      }
    }
  }

  async syncAccount(account: Account, lastEpoch: Epoch): Promise<void> {
    account = await this.syncInfo(account, lastEpoch);
    if (account.pool?.isMember) {
      this.syncHistory(account, lastEpoch);
    }
  }

  async syncInfo(account: Account, lastEpoch: Epoch): Promise<Account> {
    if (account.epoch !== lastEpoch) {
      const accountUpdate = await this.source.getAccountInfo(
        account.stakeAddress,
      );

      if (!accountUpdate) {
        this.logger.log(
          `ERROR::AccountSync()->syncAccount()->source.getAccountInfo(${account.stakeAddress}) returned ${accountUpdate}.`,
        );
        return account;
      }

      account.rewardsSum = accountUpdate.rewardsSum;

      account.epoch = lastEpoch;
      if (account.pool?.poolId !== accountUpdate.poolId) {
        let pool = accountUpdate.poolId
          ? await this.em
              .getCustomRepository(PoolRepository)
              .findOne({ poolId: accountUpdate.poolId })
          : null;

        if (pool === undefined) {
          pool = new Pool();
          pool.poolId = accountUpdate.poolId;
          pool.isMember = false;
          pool = await this.em.save(pool);
        }

        account.pool = pool;
      }

      account = await this.em
        .getCustomRepository(AccountRepository)
        .save(account);
      this.logger.log(
        `Account Sync - Updating account ${account.stakeAddress}`,
      );
    }
    return account;
  }

  async syncHistory(account: Account, lastEpoch: Epoch): Promise<void> {
    const accountHistoryRepository = this.em.getCustomRepository(
      AccountHistoryRepository,
    );
    const lastStoredEpoch = await accountHistoryRepository.findLastEpoch(
      account.stakeAddress,
    );

    const epochToSync = lastStoredEpoch
      ? lastEpoch.epoch - lastStoredEpoch.epoch.epoch
      : lastEpoch.epoch - 207;
    const pages = Math.ceil(epochToSync / this.PROVIDER_LIMIT);

    let history: AccountHistoryType = [];
    let rewardsHistory: AccountRewardsHistoryType = [];

    for (let i = pages; i >= 1; i--) {
      const limit =
        i === pages ? epochToSync % this.PROVIDER_LIMIT : this.PROVIDER_LIMIT;
      const fetchUpstreamHistory = this.source.getAccountHistory(
        account.stakeAddress,
        i,
        this.PROVIDER_LIMIT,
      );
      const fetchUpstreamRewardsHistory = this.source.getAccountRewardsHistory(
        account.stakeAddress,
        i,
        this.PROVIDER_LIMIT,
      );

      let upstreamHistory = await fetchUpstreamHistory;

      if (!upstreamHistory) {
        this.logger.log(
          `ERROR::AccountSync()->syncHistory()->this.source.getAccountHistory(${account.stakeAddress},${i},${this.PROVIDER_LIMIT}) returned ${upstreamHistory}.`,
        );
        return;
      }

      let upstreamRewardsHistory = await fetchUpstreamRewardsHistory;

      if (!upstreamRewardsHistory) {
        this.logger.log(
          `ERROR::AccountSync()->syncHistory()->this.source.getAccountRewardsHistory(${account.stakeAddress},${i},${this.PROVIDER_LIMIT}) returned ${upstreamRewardsHistory}`,
        );
        return;
      }

      // Rewards are 2 epoch backwards, ignore 2 last history records
      upstreamHistory = upstreamHistory.slice(i === 1 ? 2 : 0, limit);
      upstreamHistory.reverse();
      history = history.concat(upstreamHistory);

      upstreamRewardsHistory = upstreamRewardsHistory.slice(0, limit);
      upstreamRewardsHistory.reverse();
      rewardsHistory = rewardsHistory.concat(upstreamRewardsHistory);
    }

    const epochRepository = this.em.getCustomRepository(EpochRepository);
    const poolRepository = this.em.getCustomRepository(PoolRepository);

    for (let i = 0; i < history.length; i++) {
      const rh = rewardsHistory.find((rh) => rh.epoch === history[i].epoch);
      const epoch = history[i].epoch
        ? await epochRepository.findOne({ epoch: history[i].epoch })
        : null;
      let pool = history[i].poolId
        ? await poolRepository.findOne({ poolId: history[i].poolId })
        : null;

      if (!epoch) {
        this.logger.log(
          `ERROR::AccountSync()->syncHistory()->this.epochRepository.findOne(${history[i].epoch})`,
        );
        continue;
      }

      if (pool === undefined) {
        pool = new Pool();
        pool.poolId = history[i].poolId;
        pool.isMember = false;
        pool = await this.em.save(pool);
      }

      const newHistory = new AccountHistory();

      newHistory.account = account;
      newHistory.epoch = epoch;
      newHistory.balance = history[i].balance;
      newHistory.rewards = rh ? rh.rewards : 0;
      newHistory.pool = pool;

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

      accountHistoryRepository.save(newHistory);
      this.logger.log(
        `Account History Sync - Creating Epoch ${newHistory.epoch.epoch} history record for account ${account.stakeAddress}`,
      );
    }
  }
}
