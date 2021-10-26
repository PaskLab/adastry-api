import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { SyncService } from './sync.service';
import { Currency } from '../spot/entities/currency.entity';
import { AccountHistory } from './entities/account-history.entity';
import { Pool } from '../pool/entities/pool.entity';
import { Epoch } from '../epoch/entities/epoch.entity';
import { PoolModule } from '../pool/pool.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account, AccountHistory, Pool, Epoch, Currency]),
    PoolModule,
  ],
  controllers: [AccountController],
  providers: [AccountService, SyncService],
  exports: [AccountService, SyncService],
})
export class AccountModule {}
