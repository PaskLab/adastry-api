import { forwardRef, Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { UserAccountController } from './user-account.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { SyncService } from './sync.service';
import { AccountHistory } from './entities/account-history.entity';
import { PoolModule } from '../pool/pool.module';
import { UserAccountService } from './user-account.service';
import { UserAccount } from './entities/user-account.entity';
import { AccountWithdraw } from './entities/account-withdraw.entity';
import { CsvService } from './csv.service';
import { AccountAddress } from './entities/account-address.entity';
import { Transaction } from './entities/transaction.entity';
import { TxSyncService } from './sync/tx-sync.service';
import { TransactionService } from './transaction.service';
import { AccountSyncService } from './sync/account-sync.service';
import { Asset } from './entities/asset.entity';
import { TransactionAddress } from './entities/transaction-address.entity';
import { SpotModule } from '../spot/spot.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { EpochModule } from '../epoch/epoch.module';
import { UserModule } from '../user/user.module';
import { AssetService } from './asset.service';
import { AccountHistoryService } from './account-history.service';
import { AccountAddressService } from './account-address.service';
import { AccountWithdrawService } from './account-withdraw.service';
import { TransactionAddressService } from './transaction-address.service';
import { MirTransaction } from './entities/mir-transaction.entity';
import { MirSyncService } from './sync/mir-sync.service';
import { MirTransactionService } from './mir-transaction.service';
import { BillingModule } from '../billing/billing.module';
import { AssetMapping } from './entities/asset-mapping.entity';
import { UserMapping } from './entities/user-mapping.entity';
import { AssetMappingService } from './asset-mapping.service';
import { AssetController } from './asset.controller';
import { AccountCategory } from './entities/account-category.entity';
import { AccountCategoryController } from './account-category.controller';
import { AccountCategoryService } from './account-category.service';

export const entities = [
  Account,
  AccountHistory,
  UserAccount,
  AccountCategory,
  AccountWithdraw,
  AccountAddress,
  TransactionAddress,
  Transaction,
  MirTransaction,
  Asset,
  AssetMapping,
  UserMapping,
];

@Module({
  imports: [
    TypeOrmModule.forFeature(entities),
    forwardRef(() => PoolModule),
    SpotModule,
    EpochModule,
    UserModule,
    forwardRef(() => BillingModule),
  ],
  controllers: [
    UserAccountController,
    StatsController,
    AssetController,
    AccountCategoryController,
  ],
  providers: [
    AccountService,
    UserAccountService,
    SyncService,
    AccountSyncService,
    TxSyncService,
    MirSyncService,
    CsvService,
    TransactionService,
    MirTransactionService,
    StatsService,
    AssetService,
    AccountHistoryService,
    AccountAddressService,
    AccountWithdrawService,
    TransactionAddressService,
    AssetMappingService,
    AccountCategoryService,
  ],
  exports: [
    AccountService,
    SyncService,
    AccountHistoryService,
    UserAccountService,
  ],
})
export class AccountModule {}
