import { forwardRef, Module } from '@nestjs/common';
import { PoolController } from './pool.controller';
import { SyncService } from './sync.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pool } from './entities/pool.entity';
import { PoolHistory } from './entities/pool-history.entity';
import { PoolCert } from './entities/pool-cert.entity';
import { PoolOwner } from './entities/pool-owner.entity';
import { PoolService } from './pool.service';
import { PoolHistoryService } from './pool-history.service';
import { PoolCertService } from './pool-cert.service';
import { AccountModule } from '../account/account.module';

export const entities = [Pool, PoolHistory, PoolCert, PoolOwner];

@Module({
  imports: [
    TypeOrmModule.forFeature(entities),
    forwardRef(() => AccountModule),
  ],
  controllers: [PoolController],
  providers: [SyncService, PoolService, PoolHistoryService, PoolCertService],
  exports: [SyncService, PoolService, PoolHistoryService],
})
export class PoolModule {}
