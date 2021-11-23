import { Injectable, NotFoundException } from '@nestjs/common';
import { Epoch } from '../epoch/entities/epoch.entity';
import { Pool } from './entities/pool.entity';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { PoolCertRepository } from './repositories/pool-cert.repository';
import { PoolRepository } from './repositories/pool.repository';
import { PoolDto } from './dto/pool.dto';
import { PageParam } from '../utils/params/page.param';
import { HistoryQueryType } from './types/history-query.type';
import { PoolHistoryRepository } from './repositories/pool-history.repository';
import { PoolHistoryDto } from './dto/pool-history.dto';

@Injectable()
export class PoolService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async isOwner(
    stakeAddress: string,
    pool: Pool,
    untilEpoch: Epoch,
  ): Promise<boolean> {
    const cert = await this.em
      .getCustomRepository(PoolCertRepository)
      .findLastCert(pool.poolId, untilEpoch.epoch);

    if (!cert) {
      return false;
    }

    return cert.owners.some(
      (owner) => owner.account.stakeAddress === stakeAddress,
    );
  }

  async getMemberPools(query: PageParam): Promise<PoolDto[]> {
    const pools = await this.em
      .getCustomRepository(PoolRepository)
      .findAllMembers(query);

    return pools.map((p) => {
      return new PoolDto({
        poolId: p.poolId,
        name: p.name,
        blocksMinted: p.blocksMinted,
        liveStake: p.liveStake,
        liveSaturation: p.liveSaturation,
        liveDelegators: p.liveDelegators,
        isMember: p.isMember,
        epoch: p.epoch ? p.epoch.epoch : null,
      });
    });
  }

  async getPoolInfo(poolId: string): Promise<PoolDto> {
    const pool = await this.em
      .getCustomRepository(PoolRepository)
      .findOneMember(poolId);

    if (!pool) {
      throw new NotFoundException(`Pool ${poolId} not found.`);
    }

    return new PoolDto({
      poolId: pool.poolId,
      name: pool.name,
      blocksMinted: pool.blocksMinted,
      liveStake: pool.liveStake,
      liveSaturation: pool.liveSaturation,
      liveDelegators: pool.liveDelegators,
      epoch: pool.epoch ? pool.epoch.epoch : null,
      isMember: pool.isMember,
    });
  }

  async getPoolHistory(params: HistoryQueryType): Promise<PoolHistoryDto[]> {
    const history = await this.em
      .getCustomRepository(PoolHistoryRepository)
      .findPoolHistory(params);

    return history.map((h) => {
      return new PoolHistoryDto({
        epoch: h.epoch.epoch,
        rewards: h.rewards,
        fees: h.fees,
        blocks: h.blocks,
        activeStake: h.activeStake,
        owners: h.cert.owners.map((owner) => owner.account.stakeAddress),
        rewardAccount: h.cert.rewardAccount.stakeAddress,
        margin: h.cert.margin,
        fixed: h.cert.fixed,
        active: h.cert.active,
      });
    });
  }
}
