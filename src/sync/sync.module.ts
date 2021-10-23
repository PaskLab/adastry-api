import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { AccountModule } from '../account/account.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../account/entities/account.entity';
import { Pool } from '../pool/entities/pool.entity';
import { Epoch } from '../epoch/entities/epoch.entity';
import { EpochModule } from '../epoch/epoch.module';
import { PoolModule } from '../pool/pool.module';
import { SpotModule } from '../spot/spot.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account, Pool, Epoch]),
    AccountModule,
    PoolModule,
    EpochModule,
    SpotModule,
  ],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
