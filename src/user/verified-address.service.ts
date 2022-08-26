import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { VerifiedAddress } from './entities/verified-address.entity';

@Injectable()
export class VerifiedAddressService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  // REPOSITORY

  findActiveVerifiedAddress(
    stakeAddress: string,
  ): Promise<VerifiedAddress | null> {
    return this.em
      .getRepository(VerifiedAddress)
      .createQueryBuilder('address')
      .innerJoinAndSelect('address.user', 'user')
      .where('address.stakeAddress = :stakeAddress', { stakeAddress })
      .andWhere('user.active = TRUE')
      .getOne();
  }
}
