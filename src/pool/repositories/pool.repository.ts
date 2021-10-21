import { EntityRepository, Repository } from 'typeorm';
import { Pool } from '../entities/pool.entity';

@EntityRepository(Pool)
export class PoolRepository extends Repository<Pool> {
  async findAll(): Promise<Pool[]> {
    return this.createQueryBuilder('pool')
      .leftJoinAndSelect('pool.registration', 'registration')
      .leftJoinAndSelect('pool.epoch', 'epoch')
      .getMany();
  }
}
