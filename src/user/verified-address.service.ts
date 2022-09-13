import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { VerifiedAddress } from './entities/verified-address.entity';
import { VerifiedAddressDto } from './dto/verified-address.dto';
import { hexToBech32 } from '../utils/utils';
import { User } from './entities/user.entity';
import { AddVerifiedAddressDto } from './dto/add-verified-address.dto';
import { AuthService } from '../auth/auth.service';
import { UpdateVerifiedAddressDto } from './dto/update-verified-address.dto';

@Injectable()
export class VerifiedAddressService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  async getUserVerifiedAddresses(
    userId: number,
  ): Promise<VerifiedAddressDto[]> {
    const verifiedAddresses = await this.findUserVerifiedAddresses(userId);

    return verifiedAddresses.map(
      (vA) =>
        new VerifiedAddressDto({
          name: vA.name,
          stakeAddress: vA.stakeAddress,
          createdAt: vA.createdAt,
        }),
    );
  }

  async addVerifiedAddress(
    userId: number,
    addVerifiedAddressDto: AddVerifiedAddressDto,
  ): Promise<VerifiedAddressDto> {
    const user = await this.em
      .getRepository(User)
      .findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User not found.`);
    }

    let stakeAddress = await this.authService.verify(
      addVerifiedAddressDto.key,
      addVerifiedAddressDto.signature,
    );

    if (!stakeAddress) throw new BadRequestException('Invalid signature');

    stakeAddress = hexToBech32(stakeAddress, 'reward');

    const address = await this.em.getRepository(VerifiedAddress).findOne({
      where: { stakeAddress: stakeAddress },
      relations: { user: true },
    });

    if (address) {
      throw new ConflictException(
        address.user.id === userId
          ? 'This account is already verified.'
          : `Another user have already verified address "${address.stakeAddress}".`,
      );
    }

    let verifiedAddress = new VerifiedAddress();
    verifiedAddress.stakeAddress = stakeAddress;
    verifiedAddress.user = user;
    verifiedAddress.name = addVerifiedAddressDto.name
      ? addVerifiedAddressDto.name
      : '';

    verifiedAddress = await this.em.save(verifiedAddress);

    return new VerifiedAddressDto({
      name: verifiedAddress.name,
      stakeAddress: verifiedAddress.stakeAddress,
      createdAt: verifiedAddress.createdAt,
    });
  }

  async updateVerifiedAddress(
    userId: number,
    updateDto: UpdateVerifiedAddressDto,
  ): Promise<VerifiedAddress> {
    const user = await this.em
      .getRepository(User)
      .findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User not found.`);
    }

    let verifiedAddress = await this.em.getRepository(VerifiedAddress).findOne({
      where: { stakeAddress: updateDto.stakeAddress, user: { id: userId } },
    });

    if (!verifiedAddress) {
      throw new NotFoundException('Verified address not found.');
    }

    verifiedAddress.name = updateDto.name;

    try {
      verifiedAddress = await this.em.save(verifiedAddress);
    } catch (e) {
      throw new InternalServerErrorException(
        `Failed to save verified address ${verifiedAddress.stakeAddress}`,
      );
    }

    return verifiedAddress;
  }

  async removeVerifiedAddress(
    userId: number,
    stakeAddress: string,
  ): Promise<VerifiedAddress> {
    const user = await this.em
      .getRepository(User)
      .findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User not found.`);
    }

    let verifiedAddress = await this.em.getRepository(VerifiedAddress).findOne({
      where: { stakeAddress, user: { id: userId } },
    });

    if (!verifiedAddress) {
      throw new NotFoundException('Verified address not found.');
    }

    try {
      verifiedAddress = await this.em.remove(verifiedAddress);
    } catch (e) {
      throw new InternalServerErrorException(
        `Failed to remove ${verifiedAddress.stakeAddress}`,
      );
    }

    return verifiedAddress;
  }

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

  findUserVerifiedAddresses(userId: number): Promise<VerifiedAddress[]> {
    return this.em
      .getRepository(VerifiedAddress)
      .createQueryBuilder('address')
      .innerJoin('address.user', 'user')
      .where('user.id = :userId', { userId })
      .orderBy('address.name')
      .addOrderBy('address.id')
      .getMany();
  }
}
