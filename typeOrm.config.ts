import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { entities as AccountEntities } from './src/account/account.module';
import { entities as EpochEntities } from './src/epoch/epoch.module';
import { entities as PoolEntities } from './src/pool/pool.module';
import { entities as SpotEntities } from './src/spot/spot.module';
import { entities as UserEntities } from './src/user/user.module';

config();

const configService = new ConfigService();

const entities = [
  ...AccountEntities,
  ...EpochEntities,
  ...PoolEntities,
  ...SpotEntities,
  ...UserEntities,
];

export default new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST'),
  port: configService.get('DB_PORT'),
  username: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_NAME'),
  entities,
  migrations: [],
});
