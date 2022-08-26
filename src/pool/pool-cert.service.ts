import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { PoolCert } from './entities/pool-cert.entity';

@Injectable()
export class PoolCertService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  // REPOSITORY

  async findLastCert(
    poolId: string,
    untilEpoch?: number,
  ): Promise<PoolCert | null> {
    const query = this.em
      .getRepository(PoolCert)
      .createQueryBuilder('cert')
      .innerJoinAndSelect('cert.pool', 'pool')
      .innerJoinAndSelect('cert.epoch', 'epoch')
      .leftJoinAndSelect('cert.rewardAccount', 'rewardAccount')
      .leftJoinAndSelect('cert.owners', 'owners')
      .leftJoinAndSelect('owners.account', 'ownerAccount')
      .where('pool.poolId = :poolId')
      .orderBy('cert.block', 'DESC')
      .setParameter('poolId', poolId);

    if (untilEpoch) {
      query
        .andWhere('epoch.epoch <= :untilEpoch')
        .setParameter('untilEpoch', untilEpoch);
    }

    return query.getOne();
  }
}
