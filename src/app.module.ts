import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Epoch } from './epoch/entities/epoch.entity';
import { Account } from './account/entities/account.entity';
import { AccountHistory } from './account/entities/account-history.entity';
import { Pool } from './pool/entities/pool.entity';
import { PoolHistory } from './pool/entities/pool-history.entity';
import { PoolCert } from './pool/entities/pool-cert.entity';
import { Currency } from './spot/entities/currency.entity';
import { Spot } from './spot/entities/spot.entity';
import { SyncModule } from './sync/sync.module';
import { ApiModule } from './utils/api/api.module';
import { ConfigModule } from '@nestjs/config';
import { PoolOwner } from './pool/entities/pool-owner.entity';
import { Rate } from './spot/entities/rate.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { User } from './user/entities/user.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
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
        PoolCert,
        PoolOwner,
        Currency,
        Spot,
        Rate,
        User,
      ],
      synchronize: true,
    }),
    ApiModule,
    SyncModule,
    AuthModule,
    UserModule,
  ],
})
export class AppModule {}
