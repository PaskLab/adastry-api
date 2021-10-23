import { EntityRepository, Repository } from 'typeorm';
import { Spot } from '../entities/spot.entity';
import { Rate } from '../entities/rate.entity';

@EntityRepository(Spot)
export class SpotRepository extends Repository<Spot> {
  async findLastEpoch(): Promise<Spot | undefined> {
    return this.createQueryBuilder('spot')
      .innerJoinAndSelect('spot.epoch', 'epoch')
      .orderBy('epoch.epoch', 'DESC')
      .limit(1)
      .getOne();
  }
}
