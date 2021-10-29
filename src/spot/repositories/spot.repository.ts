import { EntityRepository, Repository } from 'typeorm';
import { Spot } from '../entities/spot.entity';
import { HistoryQuery } from '../../utils/params/history.query';
import config from '../../../config.json';

@EntityRepository(Spot)
export class SpotRepository extends Repository<Spot> {
  private readonly MAX_LIMIT = config.api.pageLimit;

  async findLastEpoch(): Promise<Spot | undefined> {
    return this.createQueryBuilder('spot')
      .innerJoinAndSelect('spot.epoch', 'epoch')
      .orderBy('epoch.epoch', 'DESC')
      .getOne();
  }

  async findPriceHistory(params: HistoryQuery): Promise<Spot[]> {
    const qb = this.createQueryBuilder('spot')
      .innerJoinAndSelect('spot.epoch', 'epoch')
      .limit(this.MAX_LIMIT)
      .orderBy('epoch', 'DESC');

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
