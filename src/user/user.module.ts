import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { VerifiedAddress } from './entities/verified-address.entity';
import { AuthModule } from '../auth/auth.module';
import { VerifiedAddressService } from './verified-address.service';
import { UserCategory } from './entities/user-category.entity';
import { UserCategoryService } from './user-category.service';

export const entities = [User, VerifiedAddress, UserCategory];

@Module({
  imports: [forwardRef(() => AuthModule), TypeOrmModule.forFeature(entities)],
  controllers: [UserController],
  providers: [UserService, VerifiedAddressService, UserCategoryService],
  exports: [UserService, VerifiedAddressService, UserCategoryService],
})
export class UserModule {}
