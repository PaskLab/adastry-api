import config from '../../../config.json';
import { Injectable } from '@nestjs/common';
import { request as apiRequest } from './api.helper';
import type { AccountInfoType } from './types/account-info.type';
import type { AccountHistoryType } from './types/account-history.type';
import type { AccountRewardsHistoryType } from './types/account-rewards-history.type';
import type { EpochType } from './types/epoch.type';
import type { PoolInfoType } from './types/pool-info.type';
import type { PoolCertType } from './types/pool-cert.type';
import type { LastPoolCertType } from './types/last-pool-cert.type';
import type { PoolHistoryType } from './types/pool-history.type';

@Injectable()
export class BlockfrostService {
  private readonly PROVIDER_LIMIT: number = config.provider.blockfrost.limit;
  private readonly PROVIDER_URL: string = config.provider.blockfrost.url;
  private readonly PROVIDER_RATE: number = config.provider.blockfrost.rate;

  async getPoolHistory(
    poolId,
    page = 1,
    limit = 100,
  ): Promise<PoolHistoryType[] | null> {
    const result = await this.request(
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
    const cert = await this.request(`/pools/${poolId}`);
    const metadata = await this.request(`/pools/${poolId}/metadata`);

    return cert && metadata
      ? {
          poolId: cert.pool_id,
          hex: cert.hex,
          name: metadata.name,
          ticker: metadata.ticker,
          blocksMinted: cert.blocks_minted,
          liveStake: cert.live_stake,
          liveSaturation: cert.live_saturation,
          liveDelegators: cert.live_delegators,
          rewardAccount: cert.reward_account,
          owners: cert.owners,
          margin: cert.margin_cost,
          fixed: cert.fixed_cost,
        }
      : null;
  }

  async getAllPoolCert(poolId): Promise<PoolCertType[]> {
    let certs: { tx_hash: string; cert_index: string; action: string }[] = [];
    let page = 1;
    let result: { tx_hash: string; cert_index: string; action: string }[] = [];

    do {
      result = await this.request(`/pools/${poolId}/updates?page=${page}`);
      if (result) certs = certs.concat(result);
      page++;
    } while (result && result.length === this.PROVIDER_LIMIT);

    const infos: PoolCertType[] = [];

    for (const cert of certs) {
      const txInfo = await this.request(`/txs/${cert.tx_hash}`);
      if (cert.action === 'registered') {
        const info = await this.getRegistration(cert.tx_hash, cert.cert_index);
        if (info && txInfo) {
          info.txHash = cert.tx_hash;
          info.block = txInfo.block_height;
          infos.push(info);
        }
      } else {
        const info = await this.getRetirement(cert.tx_hash, cert.cert_index);
        if (info && txInfo) {
          info.txHash = cert.tx_hash;
          info.block = txInfo.block_height;
          infos.push(info);
        }
      }
    }

    return infos;
  }

  async getLastPoolCert(poolId): Promise<LastPoolCertType | null> {
    const result = await this.request(
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

  async getRegistration(hash, certIndex): Promise<PoolCertType | null> {
    let result = await this.request(`/txs/${hash}/pool_updates`);

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

  async getRetirement(hash, certIndex): Promise<PoolCertType | null> {
    let result = await this.request(`/txs/${hash}/pool_retires`);

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
    const result = await this.request(`/accounts/${stakeAddress}`);

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
    const result = await this.request(
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
    const result = await this.request(
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
    return await this.request(`/accounts/${stakeAddr}/addresses`);
  }

  async getAddressInfo(addr) {
    return await this.request(`/addresses/${addr}`);
  }

  async lastEpoch(): Promise<EpochType | null> {
    const result = await this.request(`/epochs/latest`);
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
    const result = await this.request(
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

  async request(
    endpoint: string,
    headers?: any,
    body?: any,
  ): Promise<any | null> {
    return new Promise<any>((resolve) => {
      setTimeout(
        () =>
          resolve(
            apiRequest(
              this.PROVIDER_URL,
              endpoint,
              {
                project_id: process.env.BLOCKFROST_API_KEY,
                ...headers,
              },
              body,
            ),
          ),
        this.PROVIDER_RATE,
      );
    });
  }
}
