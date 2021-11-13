import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { SyncService } from './sync.service';
import { AccountHistory } from './entities/account-history.entity';
import { PoolModule } from '../pool/pool.module';
import { UserAccountService } from './user-account.service';
import { UserAccount } from './entities/user-account.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account, AccountHistory, UserAccount]),
    PoolModule,
  ],
  controllers: [AccountController],
  providers: [AccountService, UserAccountService, SyncService],
  exports: [AccountService, SyncService],
})
export class AccountModule {}
