import { EntityRepository, Repository } from 'typeorm';
import { Rate } from '../entities/rate.entity';
import { RateHistoryType } from '../types/rate-history.type';
import config from '../../../config.json';

@EntityRepository(Rate)
export class RateRepository extends Repository<Rate> {
  private readonly MAX_LIMIT = config.api.pageLimit;

  async findLastEpoch(): Promise<Rate | undefined> {
    return this.createQueryBuilder('rate')
      .innerJoinAndSelect('rate.currency', 'currency')
      .innerJoinAndSelect('rate.epoch', 'epoch')
      .orderBy('epoch.epoch', 'DESC')
      .getOne();
  }

  async findLastRate(code: string): Promise<Rate | undefined> {
    return this.createQueryBuilder('rate')
      .innerJoinAndSelect('rate.currency', 'currency')
      .innerJoinAndSelect('rate.epoch', 'epoch')
      .where('currency.code = :code', { code: code })
      .orderBy('epoch.epoch', 'DESC')
      .getOne();
  }

  async findRateEpoch(code: string, epoch: number): Promise<Rate | undefined> {
    return this.createQueryBuilder('rate')
      .innerJoinAndSelect('rate.currency', 'currency')
      .innerJoinAndSelect('rate.epoch', 'epoch')
      .where('currency.code = :code', { code: code })
      .andWhere('epoch.epoch = :epoch', { epoch: epoch })
      .getOne();
  }

  async findRateHistory(params: RateHistoryType): Promise<Rate[]> {
    const qb = this.createQueryBuilder('rate')
      .innerJoinAndSelect('rate.currency', 'currency')
      .innerJoinAndSelect('rate.epoch', 'epoch')
      .where('currency.code = :code', { code: params.code })
      .limit(this.MAX_LIMIT)
      .orderBy('epoch.epoch', 'DESC');

    if (params.order) {
      qb.orderBy('epoch', params.order);
    }

    if (params.limit) {
      qb.limit(params.limit);
    }

    if (params.page) {
      qb.offset(
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

    return qb.getMany();
  }
}
