import { Module } from '@nestjs/common';
import { PoolController } from './pool.controller';
import { SyncService } from './sync.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pool } from './entities/pool.entity';
import { PoolHistory } from './entities/pool-history.entity';
import { PoolCert } from './entities/pool-cert.entity';
import { PoolOwner } from './entities/pool-owner.entity';
import { PoolService } from './pool.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pool, PoolHistory, PoolCert, PoolOwner])],
  controllers: [PoolController],
  providers: [SyncService, PoolService],
  exports: [SyncService, PoolService],
})
export class PoolModule {}
