import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { JwtDto } from './dto/jwt.dto';
import { decrypt, encrypt, extractStakeAddress } from '../utils/utils';
import * as CMS from '@emurgo/cardano-message-signing-nodejs';
import * as CSL from '@emurgo/cardano-serialization-lib-nodejs';
import { PayloadDto } from './dto/payload.dto';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { VerifiedAddressRepository } from '../user/repositories/verified-address.repository';

@Injectable()
export class AuthService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    @Inject(forwardRef(() => UserService)) private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    username: string,
    password: string,
  ): Promise<number | null> {
    const user = await this.userService.getActiveUser(username);
    if (user && (await this.userService.validatePWD(user, password))) {
      return user.id;
    }
    return null;
  }

  async login(userId: number): Promise<JwtDto> {
    const payload = { sub: userId };
    return new JwtDto(this.jwtService.sign(payload));
  }

  async getEphemeralPayload(
    message: string,
    address: string,
  ): Promise<PayloadDto> {
    if (!process.env.MESSAGE_SECRET)
      throw new InternalServerErrorException('Missing MESSAGE_SECRET env var');

    const cslStakeAddress = extractStakeAddress(address);
    const stakeAddress = Buffer.from(cslStakeAddress.to_bytes()).toString(
      'hex',
    );

    const token = (
      await encrypt(
        new Date().valueOf().toString(),
        process.env.MESSAGE_SECRET,
        'base64',
        true,
      )
    ).encrypted;

    return { message, stakeAddress, token };
  }

  async validateSignature(
    key: string,
    signature: string,
  ): Promise<number | null> {
    const stakeAddress = await this.verify(key, signature);
    if (!stakeAddress) return null;

    const bech32Address = CSL.RewardAddress.from_address(
      CSL.Address.from_bytes(Buffer.from(stakeAddress, 'hex')),
    )
      ?.to_address()
      .to_bech32();

    const verifiedAddress = await this.em
      .getCustomRepository(VerifiedAddressRepository)
      .findActiveVerifiedAddress(bech32Address!);

    if (!verifiedAddress)
      throw new UnauthorizedException('No user match this signature');

    return verifiedAddress.user.id;
  }

  async verify(key: string, signature: string): Promise<string | null> {
    if (!process.env.MESSAGE_SECRET)
      throw new InternalServerErrorException('Missing MESSAGE_SECRET env var');

    let coseSig;
    try {
      coseSig = CMS.COSESign1.from_bytes(Buffer.from(signature, 'hex'));
    } catch (e) {
      throw new BadRequestException('Invalid signature format');
    }

    const sig = CSL.Ed25519Signature.from_bytes(coseSig.signature());

    // Get Payload
    let payload: PayloadDto;
    let expiry: Date;
    let targetAddress: string;

    try {
      payload = JSON.parse(
        Buffer.from(coseSig.signed_data().payload(), 'hex').toString(),
      );

      targetAddress = payload.stakeAddress;

      const time = await decrypt(payload.token, process.env.MESSAGE_SECRET);

      if (parseInt(time) < 1654893621542) throw '';

      expiry = new Date(parseInt(time) + 1000 * 60 * 5); // 5min expiry
    } catch (e) {
      throw new BadRequestException('Invalid payload format');
    }

    if (new Date().valueOf() > expiry.valueOf())
      throw new UnauthorizedException('Verification token expired');

    // Get Address from signature
    const addressCBOR = coseSig
      .headers()
      .protected()
      .deserialized_headers()
      .header(CMS.Label.new_text('address'));

    const signatureAddress = Buffer.from(addressCBOR.as_bytes()).toString(
      'hex',
    );

    // Compare signature address with target address
    if (signatureAddress !== targetAddress)
      throw new BadRequestException('Signature do not match target address');

    // Get public key from COSEKey header (-2)
    const coseKey = CMS.COSEKey.from_bytes(Buffer.from(key, 'hex'));

    const pkHeader = coseKey.header(
      CMS.Label.new_int(CMS.Int.new_negative(CMS.BigNum.from_str('2'))),
    );

    if (!pkHeader) {
      throw new BadRequestException('Signature missing PublicKey (-2) header');
    }

    const publicKeyBytes = pkHeader.as_bytes();

    const pk = CSL.PublicKey.from_bytes(publicKeyBytes!);

    // Compare address hash with public key hash
    const rewardAddress = CSL.RewardAddress.from_address(
      CSL.Address.from_bytes(addressCBOR.as_bytes()),
    );

    if (!rewardAddress) throw new BadRequestException('Wrong address format');

    const addressKeyHash = rewardAddress.payment_cred().to_keyhash();

    if (!addressKeyHash)
      throw new BadRequestException('Failed to extract address key hash');

    if (
      Buffer.from(pk.hash().to_bytes()).compare(
        Buffer.from(addressKeyHash.to_bytes()),
      ) !== 0
    )
      throw new BadRequestException('Address do not match public key');

    return pk.verify(coseSig.signed_data().to_bytes(), sig)
      ? targetAddress
      : null;
  }
}
