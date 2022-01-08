import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Account,
      AccountHistory,
      UserAccount,
      AccountWithdraw,
      AccountAddress,
      Transaction,
    ]),
    PoolModule,
  ],
  controllers: [UserAccountController],
  providers: [
    AccountService,
    UserAccountService,
    SyncService,
    CsvService,
    TxSyncService,
    TransactionService,
  ],
  exports: [AccountService, SyncService],
})
export class AccountModule {}
