import {
  Body,
  Controller,
  Get,
  Param,
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
}
