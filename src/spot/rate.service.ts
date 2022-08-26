import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import config from '../../config.json';
import { Rate } from './entities/rate.entity';
import { RateHistoryType } from './types/rate-history.type';

@Injectable()
export class RateService {
  private readonly MAX_LIMIT = config.api.pageLimit;

  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  // REPOSITORY

  async findLastEpoch(): Promise<Rate | null> {
    return this.em
      .getRepository(Rate)
      .createQueryBuilder('rate')
      .innerJoinAndSelect('rate.currency', 'currency')
      .innerJoinAndSelect('rate.epoch', 'epoch')
      .orderBy('epoch.epoch', 'DESC')
      .getOne();
  }

  async findLastRate(code: string): Promise<Rate | null> {
    return this.em
      .getRepository(Rate)
      .createQueryBuilder('rate')
      .innerJoinAndSelect('rate.currency', 'currency')
      .innerJoinAndSelect('rate.epoch', 'epoch')
      .where('currency.code = :code', { code: code })
      .orderBy('epoch.epoch', 'DESC')
      .getOne();
  }

  async findRateEpoch(code: string, epoch: number): Promise<Rate | null> {
    return this.em
      .getRepository(Rate)
      .createQueryBuilder('rate')
      .innerJoinAndSelect('rate.currency', 'currency')
      .innerJoinAndSelect('rate.epoch', 'epoch')
      .where('currency.code = :code', { code: code })
      .andWhere('epoch.epoch = :epoch', { epoch: epoch })
      .getOne();
  }

  async findRateHistory(params: RateHistoryType): Promise<[Rate[], number]> {
    const qb = this.em
      .getRepository(Rate)
      .createQueryBuilder('rate')
      .innerJoinAndSelect('rate.currency', 'currency')
      .innerJoinAndSelect('rate.epoch', 'epoch')
      .where('currency.code = :code', { code: params.code })
      .take(this.MAX_LIMIT)
      .orderBy('epoch.epoch', 'DESC');

    if (params.order) {
      qb.orderBy('epoch.epoch', params.order);
    }

    if (params.limit) {
      qb.take(params.limit);
    }

    if (params.page) {
      qb.skip(
        (params.page - 1) * (params.limit ? params.limit : this.MAX_LIMIT),
      );
    }

    if (params.from) {
      if (params.order && params.order === 'ASC') {
        qb.andWhere('epoch.epoch >= :from');
      } else {
        qb.andWhere('epoch.epoch <= :from');
      }
      qb.setParameter('from', params.from);
    }

    return qb.getManyAndCount();
  }
}
