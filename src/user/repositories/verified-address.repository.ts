import { EntityRepository, Repository } from 'typeorm';
import { VerifiedAddress } from '../entities/verified-address.entity';

@EntityRepository(VerifiedAddress)
export class VerifiedAddressRepository extends Repository<VerifiedAddress> {
  findActiveVerifiedAddress(
    stakeAddress: string,
  ): Promise<VerifiedAddress | undefined> {
    return this.createQueryBuilder('address')
      .innerJoinAndSelect('address.user', 'user')
      .where('address.stakeAddress = :stakeAddress', { stakeAddress })
      .andWhere('user.active = TRUE')
      .getOne();
  }
}
