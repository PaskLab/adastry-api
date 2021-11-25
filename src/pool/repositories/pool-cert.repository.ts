import { EntityRepository, Repository } from 'typeorm';
import { PoolCert } from '../entities/pool-cert.entity';

@EntityRepository(PoolCert)
export class PoolCertRepository extends Repository<PoolCert> {
  async findLastCert(
    poolId: string,
    untilEpoch?: number,
  ): Promise<PoolCert | undefined> {
    const query = this.createQueryBuilder('cert')
      .innerJoinAndSelect('cert.pool', 'pool')
      .innerJoinAndSelect('cert.epoch', 'epoch')
      .innerJoinAndSelect('cert.rewardAccount', 'rewardAccount')
      .innerJoinAndSelect('cert.owners', 'owners')
      .innerJoinAndSelect('owners.account', 'ownerAccount')
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
