import { Injectable, NotFoundException } from '@nestjs/common';
import { Epoch } from '../epoch/entities/epoch.entity';
import { Pool } from './entities/pool.entity';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { PoolDto, PoolListDto } from './dto/pool.dto';
import { PageParam } from '../utils/params/page.param';
import { HistoryQueryType } from './types/history-query.type';
import { PoolHistoryDto, PoolHistoryListDto } from './dto/pool-history.dto';
import config from '../../config.json';
import { PoolCertService } from './pool-cert.service';
import { PoolHistoryService } from './pool-history.service';
import { AccountService } from '../account/account.service';

@Injectable()
export class PoolService {
  private readonly MAX_LIMIT = config.api.pageLimit;

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly poolHistoryService: PoolHistoryService,
    private readonly poolCertService: PoolCertService,
    private readonly accountService: AccountService,
  ) {}

  async isOwner(
    stakeAddress: string,
    pool: Pool,
    untilEpoch: Epoch,
  ): Promise<boolean> {
    const cert = await this.poolCertService.findLastCert(
      pool.poolId,
      untilEpoch.epoch,
    );

    if (!cert) {
      return false;
    }

    return cert.owners.some(
      (owner) => owner.account.stakeAddress === stakeAddress,
    );
  }

  async getMemberPools(query: PageParam): Promise<PoolListDto> {
    const pools = await this.findMembers(query);

    return new PoolListDto({
      count: pools[1],
      data: pools[0].map((p) => {
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
      }),
    });
  }

  async getPoolInfo(poolId: string): Promise<PoolDto> {
    const pool = await this.findOneMember(poolId);

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

  async getPoolHistory(params: HistoryQueryType): Promise<PoolHistoryListDto> {
    const history = await this.poolHistoryService.findPoolHistory(params);

    return new PoolHistoryListDto({
      count: history[1],
      data: history[0].map((h) => {
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
      }),
    });
  }

  // REPOSITORY

  async findAll(): Promise<Pool[]> {
    return this.em
      .getRepository(Pool)
      .createQueryBuilder('pool')
      .leftJoinAndSelect('pool.lastCert', 'lastCert')
      .leftJoinAndSelect('pool.epoch', 'epoch')
      .getMany();
  }

  async findAllMembers(): Promise<Pool[]> {
    return this.em
      .getRepository(Pool)
      .createQueryBuilder('pool')
      .leftJoinAndSelect('pool.epoch', 'epoch')
      .where('pool.isMember = TRUE')
      .orderBy('pool.name', 'ASC')
      .getMany();
  }

  async findMembers(query: PageParam): Promise<[Pool[], number]> {
    const qb = this.em
      .getRepository(Pool)
      .createQueryBuilder('pool')
      .leftJoinAndSelect('pool.epoch', 'epoch')
      .where('pool.isMember = TRUE')
      .take(this.MAX_LIMIT)
      .orderBy('pool.name', 'ASC');

    if (query.limit) {
      qb.take(query.limit);
    }

    if (query.page) {
      qb.skip((query.page - 1) * (query.limit ? query.limit : this.MAX_LIMIT));
    }

    return qb.getManyAndCount();
  }

  async findOptOutMembers(poolIds: string[]): Promise<Pool[]> {
    return this.em
      .getRepository(Pool)
      .createQueryBuilder('pool')
      .where('pool.poolId NOT IN (:...poolIds)')
      .andWhere('pool.isMember = TRUE')
      .setParameter('poolIds', poolIds)
      .getMany();
  }

  async findOneMember(poolId: string): Promise<Pool | null> {
    return this.em
      .getRepository(Pool)
      .createQueryBuilder('pool')
      .leftJoinAndSelect('pool.epoch', 'epoch')
      .where('pool.poolId = :poolId')
      .setParameter('poolId', poolId)
      .getOne();
  }

  async findUserOwnedPools(): Promise<Pool[]> {
    const userAccountIds =
      await this.accountService.findUniqueLinkedAccountIds();

    if (!userAccountIds.length) return [];

    return this.em
      .getRepository(Pool)
      .createQueryBuilder('pool')
      .innerJoinAndSelect('pool.lastCert', 'lastCert')
      .innerJoinAndSelect('pool.epoch', 'epoch')
      .innerJoin('pool.certs', 'certs')
      .innerJoin('certs.owners', 'owners')
      .where('owners.account IN (:...ids)', {
        ids: userAccountIds.map((a) => a.account_id),
      })
      .orderBy('pool.id')
      .getMany();
  }
}
