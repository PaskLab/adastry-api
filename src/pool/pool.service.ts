import { Injectable } from '@nestjs/common';
import { Epoch } from '../epoch/entities/epoch.entity';
import { Pool } from './entities/pool.entity';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { PoolUpdateRepository } from './repositories/pool-update.repository';

@Injectable()
export class PoolService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async isOwner(
    stakeAddress: string,
    pool: Pool,
    untilEpoch: Epoch,
  ): Promise<boolean> {
    const update = await this.em
      .getCustomRepository(PoolUpdateRepository)
      .findLastUpdate(pool.poolId, untilEpoch.epoch);

    if (!update) {
      return false;
    }

    return update.owners.some(
      (owner) => owner.account.stakeAddress === stakeAddress,
    );
  }
}
