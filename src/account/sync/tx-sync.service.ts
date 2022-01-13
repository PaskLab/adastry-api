import config from '../../../config.json';
import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { BlockfrostService } from '../../utils/api/blockfrost.service';
import { Account } from '../entities/account.entity';
import { AccountAddressRepository } from '../repositories/account-address.repository';
import { AccountAddress } from '../entities/account-address.entity';
import { TransactionRepository } from '../repositories/transaction.repository';
import { AddressTransactionType } from '../../utils/api/types/address-transaction.type';
import { BlockfrostAmount } from '../../utils/api/types/transaction-outputs.type';
import { Transaction } from '../entities/transaction.entity';
import { AssetRepository } from '../repositories/asset.repository';
import { Asset } from '../entities/asset.entity';
import { AccountWithdrawRepository } from '../repositories/account-withdraw.repository';
import { parseAssetHex, toAda } from '../../utils/utils';

@Injectable()
export class TxSyncService {
  private readonly PROVIDER_LIMIT = config.provider.blockfrost.limit;
  private readonly logger = new Logger(TxSyncService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly source: BlockfrostService,
  ) {}

  async syncAccount(account: Account): Promise<void> {
    await this.syncAddresses(account);
    this.syncTransactions(account);
  }

  async syncAddresses(account: Account): Promise<void> {
    const accountAddresses = await this.em
      .getCustomRepository(AccountAddressRepository)
      .findAccountAddr(account.stakeAddress);
    let upstreamAddresses: string[] | null = [];
    let page = 1;

    syncLoop: while (
      (upstreamAddresses = await this.source.getAccountAddresses(
        account.stakeAddress,
        page,
        this.PROVIDER_LIMIT,
      ))
    ) {
      for (const upstreamAddress of upstreamAddresses) {
        if (accountAddresses.some((addr) => addr.address === upstreamAddress)) {
          break syncLoop;
        }

        const newAddress = new AccountAddress();
        newAddress.account = account;
        newAddress.address = upstreamAddress;

        await this.em.save(newAddress);
        this.logger.log(
          `Address Sync - Added ${upstreamAddress.slice(
            0,
            20,
          )}... for account ${account.id}`,
        );
      }
      page++;
    }
  }

  async syncTransactions(account: Account): Promise<void> {
    const addressesEntities = await this.em
      .getCustomRepository(AccountAddressRepository)
      .findAccountAddr(account.stakeAddress);

    const accountAddresses = addressesEntities.map((a) => a.address);

    for (const address of addressesEntities) {
      const lastTransaction = await this.em
        .getCustomRepository(TransactionRepository)
        .findLastAddressTx(address.address);

      let txs: AddressTransactionType[] = [];
      let upstreamTxs: AddressTransactionType[] | null = [];

      // Find all address transactions since the last saved one
      do {
        upstreamTxs = await this.source.getAddressTransactions(
          address.address,
          1,
          this.PROVIDER_LIMIT,
          lastTransaction ? lastTransaction.blockHeight : null,
          lastTransaction ? lastTransaction.txIndex + 1 : null,
        );

        if (upstreamTxs) {
          txs = txs.concat(upstreamTxs);
        }
      } while (upstreamTxs && upstreamTxs.length % this.PROVIDER_LIMIT === 0);

      // For each address transactions, fetch & process the transaction data
      for (const tx of txs) {
        const exist = await this.em
          .getCustomRepository(TransactionRepository)
          .findOne({ txHash: tx.txHash });

        if (exist) {
          this.logger.warn(
            `Transaction Sync - DUPLICATE transaction ${tx.txHash} for account ${account.id}`,
          );
          continue;
        }

        const txInfo = await this.source.getTransactionInfo(tx.txHash);
        const txUTxOs = await this.source.getTransactionUTxOs(tx.txHash);

        if (!txInfo) {
          this.logger.error(
            `txInfo returned ${txInfo}`,
            `TxSync()->syncTransactions()->this.source.getTransactionInfo(${tx.txHash})`,
          );
          continue;
        }
        if (!txUTxOs) {
          this.logger.error(
            `txUTxOs returned ${txUTxOs}`,
            `TxSync()->syncTransactions()->this.source.getTransactionUTxOs(${tx.txHash})`,
          );
          continue;
        }

        // Add comments
        const comments: string[] = [];
        if (txInfo.redeemerCount) comments.push('CONTRACT');
        if (txInfo.stakeCertCount) comments.push('STAKE REGISTRATION');
        if (txInfo.delegationCount) comments.push('DELEGATION');
        if (txInfo.assetMintCount) comments.push('MINTING/BURNING');
        if (txInfo.poolUpdateCount) comments.push('POOL UPDATE');
        if (txInfo.poolRetireCount) comments.push('POOL RETIRE');
        if (!txInfo.validContract) comments.push('COLLATERAL LOSS');

        // Sort and accumulate sent input and received output amounts
        const txAmounts: BlockfrostAmount[] = [];

        // Handle withdraw
        const withdraw = await this.em
          .getCustomRepository(AccountWithdrawRepository)
          .findOne({ txHash: txInfo.txHash });
        if (withdraw) {
          txAmounts.push({
            unit: 'lovelace',
            quantity: withdraw.amount.toString(),
          });
          comments.push(`WITHDRAWAL( ${toAda(withdraw.amount)} ADA )`);
        }

        // Addition received outputs
        for (const output of txUTxOs.outputs) {
          if (accountAddresses.includes(output.address)) {
            for (const amount of output.amount) {
              const index = txAmounts.findIndex(
                (tO) => tO.unit === amount.unit,
              );

              if (index < 0) {
                txAmounts.push({
                  unit: amount.unit,
                  quantity: amount.quantity,
                });
              } else {
                txAmounts[index].quantity = (
                  BigInt(txAmounts[index].quantity) + BigInt(amount.quantity)
                ).toString();
              }
            }
          }
        }

        // Subtract sent inputs
        let txType: 'RX' | 'TX' | 'MX' | '' = '';

        for (const input of txUTxOs.inputs) {
          if (accountAddresses.includes(input.address)) {
            if (input.collateral && txInfo.validContract) continue;

            txType = ['RX', 'MX'].includes(txType) ? 'MX' : 'TX';

            for (const amount of input.amount) {
              const index = txAmounts.findIndex(
                (tI) => tI.unit === amount.unit,
              );

              if (index < 0) {
                txAmounts.push({
                  unit: amount.unit,
                  quantity: (BigInt(amount.quantity) * BigInt(-1)).toString(),
                });
              } else {
                txAmounts[index].quantity = (
                  BigInt(txAmounts[index].quantity) - BigInt(amount.quantity)
                ).toString();
              }
            }
          } else {
            txType = ['TX', 'MX'].includes(txType) ? 'MX' : 'RX';
          }
        }

        // Sync assets data
        for (const asset of txAmounts) {
          if (asset.unit === 'lovelace') continue;
          await this.syncAsset(asset.unit);
        }

        // Split Received and Sent
        const receivedAmounts: BlockfrostAmount[] = [];
        const sentAmounts: BlockfrostAmount[] = [];

        for (const txAmount of txAmounts) {
          // Amounts that equal 0 are rejected
          if (BigInt(txAmount.quantity) > BigInt(0)) {
            receivedAmounts.push({
              unit: txAmount.unit,
              quantity: txAmount.quantity,
            });
          } else if (BigInt(txAmount.quantity) < BigInt(0)) {
            sentAmounts.push({
              unit: txAmount.unit,
              quantity: (BigInt(txAmount.quantity) * BigInt(-1)).toString(),
            });
          }
        }

        // Save the transaction
        const newTx = new Transaction();

        newTx.address = address;
        newTx.txHash = txInfo.txHash;
        newTx.blockHeight = txInfo.blockHeight;
        newTx.blockTime = txInfo.blockTime;
        newTx.txIndex = txInfo.index;
        newTx.received = JSON.stringify(receivedAmounts);
        newTx.sent = JSON.stringify(sentAmounts);
        newTx.fees = txInfo.fees;
        newTx.deposit = txInfo.deposit;
        newTx.withdrawalCount = txInfo.withdrawalCount;
        newTx.mirCertCount = txInfo.mirCertCount;
        newTx.delegationCount = txInfo.delegationCount;
        newTx.stakeCertCount = txInfo.stakeCertCount;
        newTx.poolUpdateCount = txInfo.poolUpdateCount;
        newTx.poolRetireCount = txInfo.poolRetireCount;
        newTx.assetMintCount = txInfo.assetMintCount;
        newTx.redeemerCount = txInfo.redeemerCount;
        newTx.validContract = txInfo.validContract;
        newTx.tags = JSON.stringify(comments);
        newTx.needReview = txType === 'MX';

        await this.em.save(newTx);
        this.logger.log(
          `Transaction Sync - Added transaction ${txInfo.txHash} for account ${account.id}`,
        );
      }
    }
  }

  async syncAsset(hexId: string): Promise<void> {
    let asset = await this.em
      .getCustomRepository(AssetRepository)
      .findOne({ hexId: hexId });

    if (asset) return;

    const assetInfo = await this.source.getAssetInfo(hexId);

    if (!assetInfo) {
      this.logger.error(
        `getAssetInfo returned ${assetInfo}`,
        `TxSync()->syncAsset()->this.source.getAssetInfo(${hexId})`,
      );
      return;
    }

    asset = new Asset();
    asset.hexId = assetInfo.hexId;
    asset.policyId = assetInfo.policyId;
    asset.name = assetInfo.name;
    asset.fingerprint = assetInfo.fingerprint;
    asset.quantity = assetInfo.quantity;
    asset.mintTxHash = assetInfo.mintTxHash;
    asset.onChainMetadata = assetInfo.onChainMetadata;
    asset.metadata = assetInfo.metadata;

    asset = await this.em.save(asset);
    this.logger.log(
      `Asset Sync - Added asset ${parseAssetHex(asset.hexId).name}`,
    );
  }
}
