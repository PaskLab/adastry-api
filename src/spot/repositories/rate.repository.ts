import { EntityRepository, Repository } from 'typeorm';
import { Rate } from '../entities/rate.entity';

@EntityRepository(Rate)
export class RateRepository extends Repository<Rate> {
  async findLastEpoch(): Promise<Rate | undefined> {
    return this.createQueryBuilder('rate')
      .innerJoinAndSelect('rate.currency', 'currency')
      .innerJoinAndSelect('rate.epoch', 'epoch')
      .orderBy('epoch.epoch', 'DESC')
      .limit(1)
      .getOne();
  }
}
