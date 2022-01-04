import config from '../../../config.json';
import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { BlockfrostService } from '../../utils/api/blockfrost.service';
import { SyncService } from '../sync.service';
import { Account } from '../entities/account.entity';
import { AccountAddressRepository } from '../repositories/account-address.repository';
import { AccountAddress } from '../entities/account-address.entity';

@Injectable()
export class TxSyncService {
  private readonly PROVIDER_LIMIT = config.provider.blockfrost.limit;
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly source: BlockfrostService,
  ) {}

  async syncAccountTransactions(account: Account): Promise<void> {
    await this.syncAddresses(account);
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
          `Account Sync - Added ${upstreamAddress} for account ${account.stakeAddress}`,
        );
      }
      page++;
    }
  }
}
