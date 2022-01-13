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
import { AddressInfoType } from './types/address-info.type';
import { AccountWithdrawType } from './types/account-withdraw.type';
import { AddressTransactionType } from './types/address-transaction.type';
import { TransactionType } from './types/transaction.type';
import { TransactionOutputsType } from './types/transaction-outputs.type';
import { AssetInfoType } from './types/asset-info.type';

@Injectable()
export class BlockfrostService {
  private readonly PROVIDER_LIMIT: number = config.provider.blockfrost.limit;
  private readonly PROVIDER_URL: string = config.provider.blockfrost.url;
  private readonly PROVIDER_RATE: number = config.provider.blockfrost.rate;
  private nextCallTime = new Date();

  async getPoolHistory(
    poolId: string,
    page = 1,
    limit = 100,
  ): Promise<PoolHistoryType[] | null> {
    const result = await this.request(
      `/pools/${poolId}/history?order=desc&page=${page}&count=${limit}`,
    );

    return result
      ? result.map((res) => ({
          epoch: parseInt(res.epoch),
          rewards: parseInt(res.rewards),
          fees: parseInt(res.fees),
          blocks: parseInt(res.blocks),
          activeStake: parseInt(res.active_stake),
        }))
      : null;
  }

  async getPoolInfo(poolId: string): Promise<PoolInfoType | null> {
    const cert = await this.request(`/pools/${poolId}`);
    const metadata = await this.request(`/pools/${poolId}/metadata`);

    return cert && metadata
      ? {
          poolId: cert.pool_id,
          hex: cert.hex,
          name: metadata.name,
          ticker: metadata.ticker,
          blocksMinted: parseInt(cert.blocks_minted),
          liveStake: parseInt(cert.live_stake),
          liveSaturation: parseFloat(cert.live_saturation),
          liveDelegators: parseInt(cert.live_delegators),
          rewardAccount: cert.reward_account,
          owners: cert.owners,
          margin: parseFloat(cert.margin_cost),
          fixed: parseInt(cert.fixed_cost),
        }
      : null;
  }

  async getAllPoolCert(poolId: string): Promise<PoolCertType[]> {
    let certs: { tx_hash: string; cert_index: number; action: string }[] = [];
    let page = 1;
    let result: { tx_hash: string; cert_index: number; action: string }[] = [];

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
          info.block = parseInt(txInfo.block_height);
          infos.push(info);
        }
      } else {
        const info = await this.getRetirement(cert.tx_hash, cert.cert_index);
        if (info && txInfo) {
          info.txHash = cert.tx_hash;
          info.block = parseInt(txInfo.block_height);
          infos.push(info);
        }
      }
    }

    return infos;
  }

  async getLastPoolCert(poolId: string): Promise<LastPoolCertType | null> {
    const result = await this.request(
      `/pools/${poolId}/updates?order=desc&count=1`,
    );

    return result
      ? {
          txHash: result[0].tx_hash,
          certIndex: parseInt(result[0].cert_index),
          action: result[0].action,
        }
      : null;
  }

  async getRegistration(
    hash: string,
    certIndex: number,
  ): Promise<PoolCertType | null> {
    let result = await this.request(`/txs/${hash}/pool_updates`);

    if (result) {
      result = result.find((el) => el.cert_index === certIndex);
      if (result)
        return {
          txHash: '',
          block: 0,
          active: true,
          epoch: parseInt(result.active_epoch),
          margin: parseFloat(result.margin_cost),
          fixed: parseInt(result.fixed_cost),
          rewardAccount: result.reward_account,
          owners: result.owners,
        };
    }

    return null;
  }

  async getRetirement(
    hash: string,
    certIndex: number,
  ): Promise<PoolCertType | null> {
    let result = await this.request(`/txs/${hash}/pool_retires`);

    if (result) {
      result = result.find((el) => el.cert_index == certIndex);
      if (result)
        return {
          txHash: '',
          block: 0,
          active: false,
          epoch: parseInt(result.retiring_epoch),
          margin: null,
          fixed: null,
          rewardAccount: null,
          owners: null,
        };
    }

    return null;
  }

  async getAccountInfo(stakeAddress: string): Promise<AccountInfoType | null> {
    const result = await this.request(`/accounts/${stakeAddress}`);

    return result
      ? {
          stakeAddress: result.stake_address,
          controlledAmount: parseInt(result.controlled_amount),
          withdrawalsSum: parseInt(result.withdrawals_sum),
          rewardsSum: parseInt(result.rewards_sum),
          withdrawableAmount: parseInt(result.withdrawable_amount),
          poolId: result.pool_id,
        }
      : null;
  }

  async getAccountHistory(
    stakeAddr: string,
    page = 1,
    limit = 100,
  ): Promise<AccountHistoryType | null> {
    const result = await this.request(
      `/accounts/${stakeAddr}/history?order=desc&page=${page}&count=${limit}`,
    );
    return result
      ? result.map((r) => {
          return {
            epoch: parseInt(r.active_epoch),
            amount: parseInt(r.amount),
            poolId: r.pool_id,
          };
        })
      : null;
  }

  async getAccountRewardsHistory(
    stakeAddr: string,
    page = 1,
    limit = 100,
  ): Promise<AccountRewardsHistoryType | null> {
    const result = await this.request(
      `/accounts/${stakeAddr}/rewards?order=desc&page=${page}&count=${limit}`,
    );
    return result
      ? result.map((r) => {
          return {
            epoch: parseInt(r.epoch),
            rewards: parseInt(r.amount),
            poolId: r.pool_id,
          };
        })
      : null;
  }

  /**
   * @return - Return null if the array is empty
   */
  async getAccountAddresses(
    stakeAddr: string,
    page = 1,
    limit = 100,
  ): Promise<string[] | null> {
    const result = await this.request(
      `/accounts/${stakeAddr}/addresses?page=${page}&count=${limit}&order=desc`,
    );

    return result && result.length
      ? result.map((value) => value.address)
      : null;
  }

  async getAddressInfo(address: string): Promise<AddressInfoType | null> {
    const result = await this.request(`/addresses/${address}`);

    return result
      ? {
          address: result.address,
          amount: result.amount,
          stakeAddress: result.stake_address,
          type: result.type,
          script: result.script,
        }
      : null;
  }

  /**
   * @return - Return null if the array is empty
   */
  async getAddressTransactions(
    address: string,
    page = 1,
    limit = 100,
    fromBlock: number | null = null,
    fromIndex: number | null = null,
  ): Promise<AddressTransactionType[] | null> {
    const fromStr = fromBlock
      ? `&from=${fromBlock}${fromIndex ? ':' + fromIndex : ''}`
      : '';
    const result = await this.request(
      `/addresses/${address}/transactions?page=${page}&count=${limit}${fromStr}`,
    );
    return result && result.length
      ? result.map((t) => ({
          txHash: t.tx_hash,
          txIndex: parseInt(t.tx_index),
          blockHeight: parseInt(t.block_height),
          blockTime: parseInt(t.block_time),
        }))
      : null;
  }

  async getTransactionInfo(txHash: string): Promise<TransactionType | null> {
    const result = await this.request(`/txs/${txHash}`);

    return result
      ? {
          txHash: result.hash,
          blockHash: result.block,
          blockHeight: parseInt(result.block_height),
          blockTime: parseInt(result.block_time),
          slot: parseInt(result.slot),
          index: parseInt(result.index),
          fees: parseInt(result.fees),
          deposit: parseInt(result.deposit),
          withdrawalCount: parseInt(result.withdrawal_count),
          mirCertCount: parseInt(result.mir_cert_count),
          delegationCount: parseInt(result.delegation_count),
          stakeCertCount: parseInt(result.stake_cert_count),
          poolUpdateCount: parseInt(result.pool_update_count),
          poolRetireCount: parseInt(result.pool_retire_count),
          assetMintCount: parseInt(result.asset_mint_or_burn_count),
          redeemerCount: parseInt(result.redeemer_count),
          validContract: result.valid_contract,
        }
      : null;
  }

  async getTransactionUTxOs(
    txHash: string,
  ): Promise<TransactionOutputsType | null> {
    const result = await this.request(`/txs/${txHash}/utxos`);

    return result
      ? {
          hash: result.hash,
          inputs: result.inputs.map((ri) => ({
            address: ri.address,
            amount: ri.amount.map((ria) => ({
              unit: ria.unit,
              quantity: ria.quantity,
            })),
            txHash: ri.tx_hash,
            outputIndex: parseInt(ri.output_index),
            dataHash: ri.data_hash,
            collateral: ri.collateral,
          })),
          outputs: result.outputs.map((ri) => ({
            address: ri.address,
            amount: ri.amount.map((ria) => ({
              unit: ria.unit,
              quantity: ria.quantity,
            })),
            txHash: ri.tx_hash,
            outputIndex: parseInt(ri.output_index),
          })),
        }
      : null;
  }

  async lastEpoch(): Promise<EpochType | null> {
    const result = await this.request(`/epochs/latest`);
    return result
      ? {
          epoch: parseInt(result.epoch),
          startTime: parseInt(result.start_time),
          endTime: parseInt(result.end_time),
        }
      : null;
  }

  async getEpochHistory(
    beforeEpoch: number,
    page = 1,
    limit = 100,
  ): Promise<EpochType[] | null> {
    const result = await this.request(
      `/epochs/${beforeEpoch}/previous?page=${page}&count=${limit}`,
    );
    return result
      ? result.map((r) => {
          return {
            epoch: parseInt(r.epoch),
            startTime: parseInt(r.start_time),
            endTime: parseInt(r.end_time),
          };
        })
      : null;
  }

  async getAllAccountWithdrawal(
    stakeAddress: string,
  ): Promise<AccountWithdrawType[]> {
    let withdrawTxs: { tx_hash: string; amount: string }[] = [];
    let page = 1;
    let result: { tx_hash: string; amount: string }[] = [];

    do {
      result = await this.request(
        `/accounts/${stakeAddress}/withdrawals?page=${page}`,
      );
      if (result) withdrawTxs = withdrawTxs.concat(result);
      page++;
    } while (result && result.length === this.PROVIDER_LIMIT);

    const withdrawals: AccountWithdrawType[] = [];

    for (const tx of withdrawTxs) {
      const txInfo = await this.request(`/txs/${tx.tx_hash}`);
      if (txInfo) {
        withdrawals.push({
          txHash: tx.tx_hash,
          block: parseInt(txInfo.block_height),
          blockTime: parseInt(txInfo.block_time),
          amount: parseInt(tx.amount),
        });
      }
    }

    return withdrawals;
  }

  async getAssetInfo(hex: string): Promise<AssetInfoType | null> {
    const assetInfo = await this.request(`/assets/${hex}`);

    return assetInfo
      ? {
          hexId: assetInfo.asset,
          policyId: assetInfo.policy_id,
          name: assetInfo.asset_name,
          fingerprint: assetInfo.fingerprint,
          quantity: assetInfo.quantity,
          mintTxHash: assetInfo.initial_mint_tx_hash,
          onChainMetadata: JSON.stringify(assetInfo.onchain_metadata),
          metadata: JSON.stringify(assetInfo.metadata),
        }
      : null;
  }

  async request(
    endpoint: string,
    headers?: any,
    body?: any,
  ): Promise<any | null> {
    let callDelay = 0;
    const now = new Date();
    if (this.nextCallTime > now) {
      callDelay = this.nextCallTime.valueOf() - now.valueOf();
      this.nextCallTime.setTime(
        this.nextCallTime.valueOf() + this.PROVIDER_RATE,
      );
    } else {
      this.nextCallTime.setTime(now.valueOf() + this.PROVIDER_RATE);
    }

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
        callDelay,
      );
    });
  }
}
