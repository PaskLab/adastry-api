import { EntityRepository, Repository } from 'typeorm';
import { Pool } from '../entities/pool.entity';
import { PageQuery } from '../../utils/params/page.query';
import config from '../../../config.json';

@EntityRepository(Pool)
export class PoolRepository extends Repository<Pool> {
  private readonly MAX_LIMIT = config.api.pageLimit;

  async findAll(): Promise<Pool[]> {
    return this.createQueryBuilder('pool')
      .leftJoinAndSelect('pool.lastCert', 'lastCert')
      .leftJoinAndSelect('pool.epoch', 'epoch')
      .getMany();
  }

  async findAllMembers(query: PageQuery): Promise<Pool[]> {
    const qb = this.createQueryBuilder('pool')
      .leftJoinAndSelect('pool.epoch', 'epoch')
      .where('pool.isMember = TRUE')
      .limit(this.MAX_LIMIT)
      .orderBy('pool.name', 'ASC');

    if (query.limit) {
      qb.limit(query.limit);
    }

    if (query.page) {
      qb.offset(
        (query.page - 1) * (query.limit ? query.limit : this.MAX_LIMIT),
      );
    }

    return qb.getMany();
  }

  async findOptOutMembers(poolIds: string[]): Promise<Pool[]> {
    return this.createQueryBuilder('pool')
      .where('pool.poolId NOT IN (:...poolIds)')
      .andWhere('pool.isMember = TRUE')
      .setParameter('poolIds', poolIds)
      .getMany();
  }

  async findOneMember(poolId: string): Promise<Pool | undefined> {
    return this.createQueryBuilder('pool')
      .leftJoinAndSelect('pool.epoch', 'epoch')
      .where('pool.poolId = :poolId')
      .setParameter('poolId', poolId)
      .getOne();
  }
}
