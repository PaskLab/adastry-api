import {
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ResponseDto } from '../utils/dto/response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConflictErrorDto } from '../utils/dto/conflict-error.dto';
import { UserService } from './user.service';
import { BadRequestErrorDto } from '../utils/dto/bad-request-error.dto';
import { VerifyCodeParam } from './params/verify-code.param';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { UserDto } from './dto/user.dto';
import { NotFoundErrorDto } from '../utils/dto/not-found-error.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { SignatureDto } from '../auth/dto/signature.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { VerifiedAddressDto } from './dto/verified-address.dto';
import { VerifiedAddressService } from './verified-address.service';
import { AddVerifiedAddressDto } from './dto/add-verified-address.dto';
import { StakeAddressParam } from '../utils/params/stake-address.param';
import { UpdateVerifiedAddressDto } from './dto/update-verified-address.dto';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly verifiedAddressService: VerifiedAddressService,
  ) {}

  @Post()
  @ApiOkResponse({ type: ResponseDto })
  @ApiConflictResponse({
    type: ConflictErrorDto,
    description: 'User already exist',
  })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async create(@Body() createUserDto: CreateUserDto): Promise<ResponseDto> {
    const user = await this.userService.createUser(createUserDto);
    return new ResponseDto(`User ${user.username} successfully created.`);
  }

  @Post('signature')
  @ApiOkResponse({ type: ResponseDto })
  @ApiConflictResponse({
    type: ConflictErrorDto,
    description: 'User already exist',
  })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async createSignature(
    @Body() signatureDto: SignatureDto,
  ): Promise<ResponseDto> {
    const user = await this.userService.createUserSignature(signatureDto);
    return new ResponseDto(`User "${user.username}" successfully created.`);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch()
  @ApiOkResponse({ type: ResponseDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  @ApiConflictResponse({ type: ConflictErrorDto })
  async updateUser(
    @Request() request,
    @Body() updateUser: UpdateUserDto,
  ): Promise<ResponseDto> {
    await this.userService.updateUser(request.user.id, updateUser);
    return new ResponseDto(`User updated.`);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete()
  @ApiOkResponse({ type: ResponseDto })
  async deleteUser(@Request() request): Promise<ResponseDto> {
    if (!(await this.userService.deleteUser(request.user.id))) {
      throw new InternalServerErrorException('Failed to remove user.');
    }

    return new ResponseDto(`User deleted.`);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('email')
  @ApiOkResponse({ type: ResponseDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async updateEmail(
    @Request() request,
    @Body() updateEmail: UpdateEmailDto,
  ): Promise<ResponseDto> {
    await this.userService.updateEmail(request.user.id, updateEmail.email);
    return new ResponseDto(`Verification email sent to ${updateEmail.email}`);
  }

  @Get('verify/:code')
  @ApiOkResponse({ type: ResponseDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async verify(@Param() params: VerifyCodeParam) {
    const user = await this.userService.verifyEmail(params.code);

    return new ResponseDto(`Email ${user.email} successfully verified.`);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOkResponse({ type: UserDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  getProfile(@Request() request) {
    return this.userService.getUserInfo(request.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('currency')
  @ApiOkResponse({ type: ResponseDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async updateCurrency(
    @Request() request,
    @Body() updateCurrency: UpdateCurrencyDto,
  ): Promise<ResponseDto> {
    const result = await this.userService.updateCurrency(
      request.user.id,
      updateCurrency.code,
    );
    return new ResponseDto(`Preferred currency updated to "${result}"`);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('verify-address')
  @ApiOkResponse({ type: ResponseDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  @ApiConflictResponse({ type: ConflictErrorDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  async addVerifiedAddress(
    @Request() request,
    @Body() addVerifiedAddressDto: AddVerifiedAddressDto,
  ): Promise<ResponseDto> {
    const verifiedAddress =
      await this.verifiedAddressService.addVerifiedAddress(
        request.user.id,
        addVerifiedAddressDto,
      );

    return new ResponseDto(
      `"${verifiedAddress.stakeAddress}" added to verified addresses.`,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('verified-addresses')
  @ApiOkResponse({ type: [VerifiedAddressDto] })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async getVerifiedAddress(@Request() request): Promise<VerifiedAddressDto[]> {
    return this.verifiedAddressService.getUserVerifiedAddresses(
      request.user.id,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('verified-addresses')
  @ApiOkResponse({ type: ResponseDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async updateVerifiedAddress(
    @Request() request,
    @Body() updateDto: UpdateVerifiedAddressDto,
  ): Promise<ResponseDto> {
    const verifiedAddress =
      await this.verifiedAddressService.updateVerifiedAddress(
        request.user.id,
        updateDto,
      );

    return new ResponseDto(`"${verifiedAddress.stakeAddress}" updated.`);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('verified-addresses/:stakeAddress')
  @ApiOkResponse({ type: ResponseDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  async removeVerifiedAddress(
    @Request() request,
    @Param() params: StakeAddressParam,
  ): Promise<ResponseDto> {
    const verifiedAddress =
      await this.verifiedAddressService.removeVerifiedAddress(
        request.user.id,
        params.stakeAddress,
      );

    return new ResponseDto(`"${verifiedAddress.stakeAddress}" removed.`);
  }
}
