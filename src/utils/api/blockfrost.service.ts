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
import { BlockFrostAPI } from '@blockfrost/blockfrost-js';

@Injectable()
export class BlockfrostService {
  private readonly PROVIDER_LIMIT: number = config.provider.blockfrost.limit;
  private readonly PROVIDER_URL: string = config.provider.blockfrost.url;
  private readonly PROVIDER_RATE: number = config.provider.blockfrost.rate;
  private nextCallTime = new Date();
  private api: BlockFrostAPI;

  constructor() {
    this.api = new BlockFrostAPI({
      projectId: process.env.BLOCKFROST_API_KEY!,
      debug: process.env.NODE_ENV === 'development',
    });
  }

  async getPoolHistory(
    poolId: string,
    page = 1,
    limit = 100,
  ): Promise<PoolHistoryType[] | null> {
    const result = await this.api.poolsByIdHistory(poolId, {
      order: 'desc',
      count: limit,
      page: page,
    });

    return result
      ? result.map((res) => ({
          epoch: res.epoch || 0,
          rewards: parseInt(res.rewards) || 0,
          fees: parseInt(res.fees) || 0,
          blocks: res.blocks || 0,
          activeStake: parseInt(res.active_stake) || 0,
        }))
      : null;
  }

  async getPoolInfo(poolId: string): Promise<PoolInfoType | null> {
    const cert = await this.api.poolsById(poolId);
    const metadata = await this.api.poolMetadata(poolId);

    return cert && metadata
      ? {
          poolId: cert.pool_id,
          hex: cert.hex,
          name: metadata.name ? metadata.name : 'null',
          ticker: metadata.ticker ? metadata.ticker : 'null',
          blocksMinted: cert.blocks_minted,
          liveStake: parseInt(cert.live_stake),
          liveSaturation: cert.live_saturation,
          liveDelegators: cert.live_delegators,
          rewardAccount: cert.reward_account,
          owners: cert.owners,
          margin: cert.margin_cost,
          fixed: parseInt(cert.fixed_cost),
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
      result = await this.api.poolsByIdUpdates(poolId, {
        order: 'desc',
        page: page,
        count: this.PROVIDER_LIMIT,
      });

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
      const txInfo = await this.api.txs(cert.tx_hash);
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

  async getLastPoolCert(poolId: string): Promise<LastPoolCertType | null> {
    const result = await this.api.poolsByIdUpdates(poolId, {
      order: 'desc',
      count: 1,
    });

    return result
      ? {
          txHash: result[0].tx_hash,
          certIndex: result[0].cert_index,
          action: result[0].action,
        }
      : null;
  }

  async getRegistration(
    hash: string,
    certIndex: number,
  ): Promise<PoolCertType | null> {
    const result = await this.api.txsPoolUpdates(hash);

    if (result) {
      const filtered = result.find((el) => el.cert_index === certIndex);
      if (filtered)
        return {
          txHash: '',
          block: 0,
          active: true,
          epoch: filtered.active_epoch,
          margin: filtered.margin_cost,
          fixed: parseInt(filtered.fixed_cost) || 0,
          rewardAccount: filtered.reward_account,
          owners: filtered.owners,
        };
    }

    return null;
  }

  async getRetirement(
    hash: string,
    certIndex: number,
  ): Promise<PoolCertType | null> {
    const result = await this.api.txsPoolRetires(hash);

    if (result) {
      const filtered = result.find((el) => el.cert_index == certIndex);
      if (filtered)
        return {
          txHash: '',
          block: 0,
          active: false,
          epoch: filtered.retiring_epoch,
          margin: null,
          fixed: null,
          rewardAccount: null,
          owners: null,
        };
    }

    return null;
  }

  async getAccountInfo(stakeAddress: string): Promise<AccountInfoType | null> {
    const result = await this.api.accounts(stakeAddress);

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
    const result = await this.api.accountsHistory(stakeAddr, {
      order: 'desc',
      page: page,
      count: limit,
    });
    return result
      ? result.map((r) => {
          return {
            epoch: r.active_epoch,
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
    const result = await this.api.accountsRewards(stakeAddr, {
      order: 'desc',
      page: page,
      count: limit,
    });
    return result
      ? result.map((r) => {
          return {
            epoch: r.epoch,
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
    const result = await this.api.accountsAddresses(stakeAddr, {
      page: page,
      count: limit,
      order: 'desc',
    });

    return result && result.length
      ? result.map((value) => value.address)
      : null;
  }

  async getAddressInfo(address: string): Promise<AddressInfoType | null> {
    const result = await this.api.addresses(address);

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
      ? `${fromBlock}${fromIndex ? ':' + fromIndex : ''}`
      : undefined;
    const result = await this.api.addressesTransactions(
      address,
      { page: page, count: limit },
      { from: fromStr },
    );
    return result && result.length
      ? result.map((t) => ({
          txHash: t.tx_hash,
          txIndex: t.tx_index,
          blockHeight: t.block_height,
          blockTime: t.block_time,
        }))
      : null;
  }

  async getTransactionInfo(txHash: string): Promise<TransactionType | null> {
    const result = await this.api.txs(txHash);

    const metadata = await this.getTransactionMetadata(txHash);

    return result
      ? {
          txHash: result.hash,
          blockHash: result.block,
          blockHeight: result.block_height,
          blockTime: result.block_time,
          slot: result.slot,
          index: result.index,
          fees: parseInt(result.fees) || 0,
          deposit: parseInt(result.deposit) || 0,
          withdrawalCount: result.withdrawal_count,
          mirCertCount: result.mir_cert_count,
          delegationCount: result.delegation_count,
          stakeCertCount: result.stake_cert_count,
          poolUpdateCount: result.pool_update_count,
          poolRetireCount: result.pool_retire_count,
          assetMintCount: result.asset_mint_or_burn_count,
          redeemerCount: result.redeemer_count,
          validContract: result.valid_contract,
          metadata,
        }
      : null;
  }

  async getTransactionMetadata(txHash: string): Promise<string> {
    const metadata = await this.api.txsMetadata(txHash);

    return metadata ? JSON.stringify(metadata) : '';
  }

  async getTransactionUTxOs(
    txHash: string,
  ): Promise<TransactionOutputsType | null> {
    const result = await this.api.txsUtxos(txHash);

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
            outputIndex: ri.output_index,
            dataHash: ri.data_hash,
            collateral: ri.collateral,
          })),
          outputs: result.outputs.map((ri) => ({
            address: ri.address,
            amount: ri.amount.map((ria) => ({
              unit: ria.unit,
              quantity: ria.quantity,
            })),
            outputIndex: ri.output_index,
          })),
        }
      : null;
  }

  async lastEpoch(): Promise<EpochType | null> {
    const result = await this.api.epochsLatest();
    return result
      ? {
          epoch: result.epoch,
          startTime: result.start_time,
          endTime: result.end_time,
        }
      : null;
  }

  async getEpochHistory(
    beforeEpoch: number,
    page = 1,
    limit = 100,
  ): Promise<EpochType[] | null> {
    const result = await this.api.epochsPrevious(beforeEpoch, {
      page: page,
      count: limit,
    });
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

  async getAllAccountWithdrawal(
    stakeAddress: string,
    afterTxHash?: string,
  ): Promise<AccountWithdrawType[]> {
    let withdrawTxs: { tx_hash: string; amount: string }[] = [];
    let page = 1;
    let result: { tx_hash: string; amount: string }[] = [];

    do {
      result = await this.api.accountsWithdrawals(stakeAddress, {
        order: 'desc',
        page: page,
        count: this.PROVIDER_LIMIT,
      });

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
      const txInfo = await this.getTransactionInfo(tx.tx_hash);
      if (txInfo) {
        withdrawals.push({
          txHash: tx.tx_hash,
          block: txInfo.blockHeight,
          blockTime: txInfo.blockTime,
          amount: parseInt(tx.amount) || 0,
        });
      }
    }

    return withdrawals;
  }

  async getAssetInfo(hex: string): Promise<AssetInfoType | null> {
    const assetInfo = await this.api.assetsById(hex);

    return assetInfo
      ? {
          hexId: assetInfo.asset,
          policyId: assetInfo.policy_id,
          name: assetInfo.asset_name ? assetInfo.asset_name : '',
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
      result = await this.api.accountsMirs(stakeAddress, {
        order: 'desc',
        page: page,
        count: this.PROVIDER_LIMIT,
      });

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
      const txInfo = await this.getTransactionInfo(mir.tx_hash);
      if (txInfo) {
        mirTransactions.push({
          txHash: mir.tx_hash,
          txIndex: txInfo.index,
          blockHeight: txInfo.blockHeight,
          blockTime: txInfo.blockTime,
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
