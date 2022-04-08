import {
  Body,
  Controller,
  Get,
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserDto } from './dto/user.dto';
import { NotFoundErrorDto } from '../utils/dto/not-found-error.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOkResponse({ type: ResponseDto })
  @ApiConflictResponse({
    type: ConflictErrorDto,
    description: 'User already exist',
  })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async create(@Body() createUserDto: CreateUserDto): Promise<ResponseDto> {
    const user = await this.userService.createUser(createUserDto);
    return new ResponseDto(`User ${user.username} created.`);
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
}
