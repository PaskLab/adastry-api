import { EntityRepository, Repository } from 'typeorm';
import { Epoch } from '../entities/epoch.entity';
import { HistoryParam } from '../../utils/params/history.param';
import config from '../../../config.json';

@EntityRepository(Epoch)
export class EpochRepository extends Repository<Epoch> {
  private readonly MAX_LIMIT = config.api.pageLimit;

  async findLastEpoch(): Promise<Epoch | undefined> {
    return this.createQueryBuilder('epoch')
      .orderBy('epoch.epoch', 'DESC')
      .limit(1)
      .getOne();
  }

  async findEpochHistory(params: HistoryParam): Promise<Epoch[]> {
    const qb = this.createQueryBuilder('epoch');

    if (params.order) {
      qb.orderBy('epoch.epoch', params.order);
    } else {
      qb.orderBy('epoch.epoch', 'DESC');
    }

    if (params.limit) {
      qb.limit(params.limit);
    } else {
      qb.limit(this.MAX_LIMIT);
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

  async findFromTime(time: number): Promise<Epoch | undefined> {
    return this.createQueryBuilder('epoch')
      .where('epoch.startTime <= :time')
      .andWhere('epoch.endTime >= :time')
      .setParameter('time', time)
      .getOne();
  }
}
