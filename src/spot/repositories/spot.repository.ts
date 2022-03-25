import { EntityRepository, Repository } from 'typeorm';
import { Spot } from '../entities/spot.entity';
import { HistoryParam } from '../../utils/params/history.param';
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

  async findEpoch(epoch: number): Promise<Spot | undefined> {
    return this.createQueryBuilder('spot')
      .innerJoinAndSelect('spot.epoch', 'epoch')
      .where('epoch.epoch = :epoch', { epoch: epoch })
      .getOne();
  }

  async findPriceHistory(params: HistoryParam): Promise<[Spot[], number]> {
    const qb = this.createQueryBuilder('spot')
      .innerJoinAndSelect('spot.epoch', 'epoch')
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
