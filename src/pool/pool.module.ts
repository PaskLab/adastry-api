import { Module } from '@nestjs/common';
import { PoolController } from './pool.controller';
import { SyncService } from './sync.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../account/entities/account.entity';
import { Pool } from './entities/pool.entity';
import { Epoch } from '../epoch/entities/epoch.entity';
import { PoolHistory } from './entities/pool-history.entity';
import { PoolCert } from './entities/pool-cert.entity';
import { PoolOwner } from './entities/pool-owner.entity';
import { PoolService } from './pool.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Account,
      Pool,
      PoolHistory,
      PoolCert,
      PoolOwner,
      Epoch,
    ]),
  ],
  controllers: [PoolController],
  providers: [SyncService, PoolService],
  exports: [SyncService, PoolService],
})
export class PoolModule {}
