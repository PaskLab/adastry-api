import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dto/create-account.dto';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccountDto } from './dto/account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { ResponseDto } from '../utils/api/dto/response.dto';
import { AccountHistoryDto } from './dto/account-history.dto';
import { AccountHistoryParam } from './params/account-history.param';
import { AccountHistoryQuery } from './params/account-history.query';

@ApiTags('Account')
@Controller('api/account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post()
  @ApiCreatedResponse({
    description: 'Account successfully created.',
    type: ResponseDto,
  })
  @ApiConflictResponse({ description: 'Stake account already exist.' })
  @ApiBadRequestResponse({ description: 'Bad Request. (validation errors)' })
  async create(
    @Body() createAccountDto: CreateAccountDto,
  ): Promise<ResponseDto> {
    const account = await this.accountService.create(createAccountDto);
    return new ResponseDto(
      `Account ${account.stakeAddress} successfully created.`,
    );
  }

  @Get(':stakeAddress')
  @ApiOkResponse({ type: AccountDto })
  @ApiBadRequestResponse({ description: 'Bad Request. (validation errors)' })
  accountInfo(
    @Param('stakeAddress') stakeAddress: string,
  ): Promise<AccountDto> {
    return this.accountService.getAccountInfo(stakeAddress);
  }

  @Patch(':stakeAddress')
  @ApiOkResponse({
    description: 'Account successfully updated.',
    type: ResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Bad Request. (validation errors)' })
  @ApiNotFoundResponse({ description: 'Resource not found.' })
  async update(
    @Param('stakeAddress') stakeAddress: string,
    @Body() updateAccountDto: UpdateAccountDto,
  ): Promise<ResponseDto> {
    await this.accountService.update(stakeAddress, updateAccountDto);

    return new ResponseDto(`Account ${stakeAddress} successfully updated.`);
  }

  @Delete(':stakeAddress')
  @ApiOkResponse({
    description: 'Account successfully deleted.',
    type: ResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Resource not found.' })
  async remove(
    @Param('stakeAddress') stakeAddress: string,
  ): Promise<ResponseDto> {
    await this.accountService.remove(stakeAddress);
    return new ResponseDto(`Account ${stakeAddress} successfully deleted.`);
  }

  @Get(':stakeAddress/history')
  @ApiOkResponse({ type: [AccountHistoryDto] })
  @ApiBadRequestResponse({ description: 'Bad Request. (validation errors)' })
  async accountHistory(
    @Param() param: AccountHistoryParam,
    @Query() query: AccountHistoryQuery,
  ): Promise<AccountHistoryDto[]> {
    return this.accountService.getAccountHistory({
      stakeAddress: param.stakeAddress,
      page: query.page,
      limit: query.limit,
      from: query.from,
      order: query.order,
    });
  }
}
