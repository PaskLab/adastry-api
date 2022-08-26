import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { VerifiedAddress } from './entities/verified-address.entity';
import { AuthModule } from '../auth/auth.module';
import { VerifiedAddressService } from './verified-address.service';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([User, VerifiedAddress]),
  ],
  controllers: [UserController],
  providers: [UserService, VerifiedAddressService],
  exports: [UserService, VerifiedAddressService],
})
export class UserModule {}
