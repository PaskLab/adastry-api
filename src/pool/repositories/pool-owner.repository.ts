import { EntityRepository, Repository } from 'typeorm';
import { PoolOwner } from '../entities/pool-owner.entity';

@EntityRepository(PoolOwner)
export class PoolOwnerRepository extends Repository<PoolOwner> {}
