import config from '../../../sync-config.json';
import { Injectable } from '@nestjs/common';
import { request as apiRequest } from './api.helper';
import type { AccountInfoType } from './types/account-info.type';
import type { AccountHistoryType } from './types/account-history.type';
import type { AccountRewardsHistoryType } from './types/account-rewards-history.type';
import type { EpochType } from './types/epoch.type';
import type { PoolInfoType } from './types/pool-info.type';
import type { PoolUpdateType } from './types/pool-update.type';
import type { LastPoolUpdateType } from './types/last-pool-update.type';
import type { PoolHistoryType } from './types/pool-history.type';

const PROVIDER_LIMIT: number = config.provider.blockfrost.limit;
const PROVIDER_URL: string = config.provider.blockfrost.url;

@Injectable()
export class BlockfrostService {
  async getPoolHistory(
    poolId,
    page = 1,
    limit = 100,
  ): Promise<PoolHistoryType[] | null> {
    const result = await BlockfrostService.request(
      `/pools/${poolId}/history?order=desc&page=${page}&count=${limit}`,
    );

    return result
      ? result.map((res) => ({
          epoch: res.epoch,
          rewards: res.rewards,
          fees: res.fees,
          blocks: res.blocks,
          activeStake: res.active_stake,
        }))
      : null;
  }

  async getPoolInfo(poolId): Promise<PoolInfoType | null> {
    const registration = BlockfrostService.request(`/pools/${poolId}`);
    const metadata = BlockfrostService.request(`/pools/${poolId}/metadata`);
    return registration
      ? {
          poolId: (await registration).pool_id,
          hex: (await registration).hex,
          name: (await metadata).name,
          ticker: (await metadata).ticker,
          blocksMinted: (await registration).blocks_minted,
          liveStake: (await registration).live_stake,
          liveSaturation: (await registration).live_saturation,
          liveDelegators: (await registration).live_delegators,
          rewardAccount: (await registration).reward_account,
          owners: (await registration).owners,
          margin: (await registration).margin_cost,
          fixed: (await registration).fixed_cost,
        }
      : null;
  }

  async getAllPoolUpdate(poolId): Promise<PoolUpdateType[]> {
    let updates: { tx_hash: string; cert_index: string; action: string }[] = [];
    let page = 1;
    let result: { tx_hash: string; cert_index: string; action: string }[] = [];

    do {
      result = await BlockfrostService.request(
        `/pools/${poolId}/updates?page=${page}`,
      );
      if (result) updates = updates.concat(result);
      page++;
    } while (result && result.length === PROVIDER_LIMIT);

    const infos: PoolUpdateType[] = [];

    for (const update of updates) {
      const txInfo = await BlockfrostService.request(`/txs/${update.tx_hash}`);
      if (update.action === 'registered') {
        const info = await this.getRegistration(
          update.tx_hash,
          update.cert_index,
        );
        if (info && txInfo) {
          info.txHash = update.tx_hash;
          info.block = txInfo.block_height;
          infos.push(info);
        }
      } else {
        const info = await this.getRetirement(
          update.tx_hash,
          update.cert_index,
        );
        if (info && txInfo) {
          info.txHash = update.tx_hash;
          info.block = txInfo.block_height;
          infos.push(info);
        }
      }
    }

    return infos;
  }

  async getLastPoolUpdate(poolId): Promise<LastPoolUpdateType | null> {
    const result = await BlockfrostService.request(
      `/pools/${poolId}/updates?order=desc&count=1`,
    );

    return result
      ? {
          txHash: result[0].tx_hash,
          certIndex: result[0].cert_index,
          action: result[0].action,
        }
      : null;
  }

  async getRegistration(hash, certIndex): Promise<PoolUpdateType | null> {
    let result = await BlockfrostService.request(`/txs/${hash}/pool_updates`);

    if (result) {
      result = result.find((el) => el.cert_index === certIndex);
      if (result)
        return {
          txHash: '',
          block: 0,
          active: true,
          epoch: result.active_epoch,
          margin: result.margin_cost,
          fixed: result.fixed_cost,
          rewardAccount: result.reward_account,
          owners: result.owners,
        };
    }

    return null;
  }

  async getRetirement(hash, certIndex): Promise<PoolUpdateType | null> {
    let result = await BlockfrostService.request(`/txs/${hash}/pool_retires`);

    if (result) {
      result = result.find((el) => (el.cert_index = certIndex));
      if (result)
        return {
          txHash: '',
          block: 0,
          active: false,
          epoch: result.retiring_epoch,
          margin: null,
          fixed: null,
          rewardAccount: null,
          owners: null,
        };
    }

    return null;
  }

  async getAccountInfo(stakeAddress): Promise<AccountInfoType | null> {
    const result = await BlockfrostService.request(`/accounts/${stakeAddress}`);

    return result
      ? {
          stakeAddress: result.stake_address,
          controlledAmount: result.controlled_amount,
          withdrawalsSum: result.withdrawals_sum,
          rewardsSum: result.rewards_sum,
          withdrawableAmount: result.withdrawable_amount,
          poolId: result.pool_id,
        }
      : null;
  }

  async getAccountHistory(
    stakeAddr,
    page = 1,
    limit = 100,
  ): Promise<AccountHistoryType | null> {
    const result = await BlockfrostService.request(
      `/accounts/${stakeAddr}/history?order=desc&page=${page}&count=${limit}`,
    );
    return result
      ? result.map((r) => {
          return {
            epoch: r.active_epoch,
            balance: r.amount,
            poolId: r.pool_id,
          };
        })
      : null;
  }

  async getAccountRewardsHistory(
    stakeAddr,
    page = 1,
    limit = 100,
  ): Promise<AccountRewardsHistoryType | null> {
    const result = await BlockfrostService.request(
      `/accounts/${stakeAddr}/rewards?order=desc&page=${page}&count=${limit}`,
    );
    return result
      ? result.map((r) => {
          return {
            epoch: r.epoch,
            rewards: r.amount,
            poolId: r.pool_id,
          };
        })
      : null;
  }

  async getAccountAddresses(stakeAddr) {
    return await BlockfrostService.request(`/accounts/${stakeAddr}/addresses`);
  }

  async getAddressInfo(addr) {
    return await BlockfrostService.request(`/addresses/${addr}`);
  }

  async lastEpoch(): Promise<EpochType | null> {
    const result = await BlockfrostService.request(`/epochs/latest`);
    return result
      ? {
          epoch: result.epoch,
          startTime: result.start_time,
          endTime: result.end_time,
        }
      : null;
  }

  async getEpochHistory(
    beforeEpoch,
    page = 1,
    limit = 100,
  ): Promise<EpochType[] | null> {
    const result = await BlockfrostService.request(
      `/epochs/${beforeEpoch}/previous?page=${page}&count=${limit}`,
    );
    return result
      ? result.map((r) => {
          return {
            epoch: r.epoch,
            startTime: r.start_time,
            endTime: r.end_time,
          };
        })
      : null;
  }

  static async request(
    endpoint: string,
    headers?: any,
    body?: any,
  ): Promise<any | null> {
    return await apiRequest(
      PROVIDER_URL,
      endpoint,
      {
        project_id: process.env.BLOCKFROST_API_KEY,
        ...headers,
      },
      body,
    );
  }
}
