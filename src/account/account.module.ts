import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { SyncService } from './sync.service';
import { ApiModule } from '../utils/api/api.module';
import { Currency } from '../spot/entities/currency.entity';
import { AccountHistory } from './entities/account-history.entity';
import { Pool } from '../pool/entities/pool.entity';
import { Epoch } from '../epoch/entities/epoch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account, AccountHistory, Pool, Epoch, Currency]),
  ],
  controllers: [AccountController],
  providers: [AccountService, SyncService],
  exports: [AccountService, SyncService],
})
export class AccountModule {}
