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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Account,
      AccountHistory,
      UserAccount,
      AccountWithdraw,
    ]),
    PoolModule,
  ],
  controllers: [UserAccountController],
  providers: [AccountService, UserAccountService, SyncService],
  exports: [AccountService, SyncService],
})
export class AccountModule {}
