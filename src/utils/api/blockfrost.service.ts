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
import { MirTransactionType } from './types/mir-transaction.type';

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
          epoch: parseInt(res.epoch) || 0,
          rewards: parseInt(res.rewards) || 0,
          fees: parseInt(res.fees) || 0,
          blocks: parseInt(res.blocks) || 0,
          activeStake: parseInt(res.active_stake) || 0,
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
          blocksMinted: parseInt(cert.blocks_minted) || 0,
          liveStake: parseInt(cert.live_stake) || 0,
          liveSaturation: parseFloat(cert.live_saturation) || 0,
          liveDelegators: parseInt(cert.live_delegators) || 0,
          rewardAccount: cert.reward_account,
          owners: cert.owners,
          margin: parseFloat(cert.margin_cost) || 0,
          fixed: parseInt(cert.fixed_cost) || 0,
        }
      : null;
  }

  async getAllPoolCert(
    poolId: string,
    afterTxHash?: string,
  ): Promise<PoolCertType[]> {
    let certs: { tx_hash: string; cert_index: number; action: string }[] = [];
    let page = 1;
    let result: { tx_hash: string; cert_index: number; action: string }[] = [];

    do {
      result = await this.request(
        `/pools/${poolId}/updates?order=desc&page=${page}&count=${this.PROVIDER_LIMIT}`,
      );
      if (result) {
        certs = certs.concat(result);
        if (
          afterTxHash &&
          result.some((cert) => cert.tx_hash === afterTxHash)
        ) {
          break;
        }
      }

      page++;
    } while (result && result.length === this.PROVIDER_LIMIT);

    certs.reverse();

    if (afterTxHash) {
      // Remove everything before 'afterTxHash'
      const index = certs.findIndex((cert) => cert.tx_hash === afterTxHash);
      if (index >= 0) {
        certs = certs.slice(index + 1);
      }
    }

    const infos: PoolCertType[] = [];

    for (const cert of certs) {
      const txInfo = await this.request(`/txs/${cert.tx_hash}`);
      if (cert.action === 'registered') {
        const info = await this.getRegistration(cert.tx_hash, cert.cert_index);
        if (info && txInfo) {
          info.txHash = cert.tx_hash;
          info.block = parseInt(txInfo.block_height) || 0;
          infos.push(info);
        }
      } else {
        const info = await this.getRetirement(cert.tx_hash, cert.cert_index);
        if (info && txInfo) {
          info.txHash = cert.tx_hash;
          info.block = parseInt(txInfo.block_height) || 0;
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
          certIndex: parseInt(result[0].cert_index) || 0,
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
          epoch: parseInt(result.active_epoch) || 0,
          margin: parseFloat(result.margin_cost) || 0,
          fixed: parseInt(result.fixed_cost) || 0,
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
          epoch: parseInt(result.retiring_epoch) || 0,
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
          controlledAmount: parseInt(result.controlled_amount) || 0,
          withdrawalsSum: parseInt(result.withdrawals_sum) || 0,
          rewardsSum: parseInt(result.rewards_sum) || 0,
          withdrawableAmount: parseInt(result.withdrawable_amount) || 0,
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
            epoch: parseInt(r.active_epoch) || 0,
            amount: parseInt(r.amount) || 0,
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
            epoch: parseInt(r.epoch) || 0,
            rewards: parseInt(r.amount) || 0,
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
          txIndex: parseInt(t.tx_index) || 0,
          blockHeight: parseInt(t.block_height) || 0,
          blockTime: parseInt(t.block_time) || 0,
        }))
      : null;
  }

  async getTransactionInfo(txHash: string): Promise<TransactionType | null> {
    const result = await this.request(`/txs/${txHash}`);

    return result
      ? {
          txHash: result.hash,
          blockHash: result.block,
          blockHeight: parseInt(result.block_height) || 0,
          blockTime: parseInt(result.block_time) || 0,
          slot: parseInt(result.slot) || 0,
          index: parseInt(result.index) || 0,
          fees: parseInt(result.fees) || 0,
          deposit: parseInt(result.deposit) || 0,
          withdrawalCount: parseInt(result.withdrawal_count) || 0,
          mirCertCount: parseInt(result.mir_cert_count) || 0,
          delegationCount: parseInt(result.delegation_count) || 0,
          stakeCertCount: parseInt(result.stake_cert_count) || 0,
          poolUpdateCount: parseInt(result.pool_update_count) || 0,
          poolRetireCount: parseInt(result.pool_retire_count) || 0,
          assetMintCount: parseInt(result.asset_mint_or_burn_count) || 0,
          redeemerCount: parseInt(result.redeemer_count) || 0,
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
            outputIndex: parseInt(ri.output_index) || 0,
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
            outputIndex: parseInt(ri.output_index) || 0,
          })),
        }
      : null;
  }

  async lastEpoch(): Promise<EpochType | null> {
    const result = await this.request(`/epochs/latest`);
    return result
      ? {
          epoch: parseInt(result.epoch) || 0,
          startTime: parseInt(result.start_time) || 0,
          endTime: parseInt(result.end_time) || 0,
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
            epoch: parseInt(r.epoch) || 0,
            startTime: parseInt(r.start_time) || 0,
            endTime: parseInt(r.end_time) || 0,
          };
        })
      : null;
  }

  async getAllAccountWithdrawal(
    stakeAddress: string,
    afterTxHash?: string,
  ): Promise<AccountWithdrawType[]> {
    let withdrawTxs: { tx_hash: string; amount: string }[] = [];
    let page = 1;
    let result: { tx_hash: string; amount: string }[] = [];

    do {
      result = await this.request(
        `/accounts/${stakeAddress}/withdrawals?order=desc&page=${page}&count=${this.PROVIDER_LIMIT}`,
      );

      if (result) {
        withdrawTxs = withdrawTxs.concat(result);
        if (afterTxHash && result.some((tx) => tx.tx_hash === afterTxHash)) {
          break;
        }
      }

      page++;
    } while (result && result.length === this.PROVIDER_LIMIT);

    withdrawTxs.reverse();

    if (afterTxHash) {
      // Remove everything before 'afterTxHash'
      const index = withdrawTxs.findIndex((tx) => tx.tx_hash === afterTxHash);
      if (index >= 0) {
        withdrawTxs = withdrawTxs.slice(index + 1);
      }
    }

    const withdrawals: AccountWithdrawType[] = [];

    for (const tx of withdrawTxs) {
      const txInfo = await this.request(`/txs/${tx.tx_hash}`);
      if (txInfo) {
        withdrawals.push({
          txHash: tx.tx_hash,
          block: parseInt(txInfo.block_height) || 0,
          blockTime: parseInt(txInfo.block_time) || 0,
          amount: parseInt(tx.amount) || 0,
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

  async getAllAccountMIRs(
    stakeAddress: string,
    afterTxHash?: string,
  ): Promise<MirTransactionType[]> {
    let accountMIRs: { tx_hash: string; amount: string }[] = [];
    let page = 1;
    let result: { tx_hash: string; amount: string }[] = [];

    do {
      result = await this.request(
        `/accounts/${stakeAddress}/mirs?order=desc&page=${page}&count=${this.PROVIDER_LIMIT}`,
      );

      if (result) {
        accountMIRs = accountMIRs.concat(result);
        if (afterTxHash && result.some((tx) => tx.tx_hash === afterTxHash)) {
          break;
        }
      }
      page++;
    } while (result && result.length === this.PROVIDER_LIMIT);

    accountMIRs.reverse();

    if (afterTxHash) {
      // Remove everything before 'afterTxHash'
      const index = accountMIRs.findIndex((tx) => tx.tx_hash === afterTxHash);
      if (index >= 0) {
        accountMIRs = accountMIRs.slice(index + 1);
      }
    }

    const mirTransactions: MirTransactionType[] = [];

    for (const mir of accountMIRs) {
      const txInfo = await this.request(`/txs/${mir.tx_hash}`);
      if (txInfo) {
        mirTransactions.push({
          txHash: mir.tx_hash,
          txIndex: txInfo.index,
          blockHeight: parseInt(txInfo.block_height) || 0,
          blockTime: parseInt(txInfo.block_time) || 0,
          amount: parseInt(mir.amount) || 0,
        });
      }
    }

    return mirTransactions;
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
