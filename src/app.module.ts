import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Epoch } from './epoch/entities/epoch.entity';
import { Account } from './account/entities/account.entity';
import { AccountHistory } from './account/entities/account-history.entity';
import { Pool } from './pool/entities/pool.entity';
import { PoolHistory } from './pool/entities/pool-history.entity';
import { PoolUpdate } from './pool/entities/pool-update.entity';
import { Currency } from './spot/entities/currency.entity';
import { Spot } from './spot/entities/spot.entity';
import { SyncModule } from './sync/sync.module';
import { ApiModule } from './utils/api/api.module';
import { ConfigModule } from '@nestjs/config';
import { PoolOwner } from './pool/entities/pool-owner.entity';
import { Rate } from './spot/entities/rate.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: './db.sqlite3',
      entities: [
        Epoch,
        Account,
        AccountHistory,
        Pool,
        PoolHistory,
        PoolUpdate,
        PoolOwner,
        Currency,
        Spot,
        Rate,
      ],
      synchronize: true,
    }),
    ApiModule,
    SyncModule,
  ],
})
export class AppModule {}
