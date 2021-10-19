import { EntityRepository, Repository } from 'typeorm';
import { Pool } from '../entities/pool.entity';

@EntityRepository(Pool)
export class PoolRepository extends Repository<Pool> {}
