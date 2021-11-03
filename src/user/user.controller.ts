import { Body, Controller, Post } from '@nestjs/common';
import { ResponseDto } from '../utils/dto/response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConflictErrorDto } from '../utils/dto/conflict-error.dto';
import { UserService } from './user.service';
import { BadRequestErrorDto } from '../utils/dto/bad-request-error.dto';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOkResponse({ type: ResponseDto })
  @ApiConflictResponse({
    type: ConflictErrorDto,
    description: 'User email already exist',
  })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async create(@Body() createUserDto: CreateUserDto): Promise<ResponseDto> {
    const user = await this.userService.createUser(createUserDto);
    return new ResponseDto(`User ${user.email} created.`);
  }
}
