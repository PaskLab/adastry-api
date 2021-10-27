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
import { ResponseDto } from '../utils/dto/response.dto';
import { AccountHistoryDto } from './dto/account-history.dto';
import { StakeAddressParam } from '../utils/params/stake-address.param';
import { HistoryQuery } from '../utils/params/history.query';

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
  accountInfo(@Param() param: StakeAddressParam): Promise<AccountDto> {
    return this.accountService.getAccountInfo(param.stakeAddress);
  }

  @Patch(':stakeAddress')
  @ApiOkResponse({
    description: 'Account successfully updated.',
    type: ResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Bad Request. (validation errors)' })
  @ApiNotFoundResponse({ description: 'Resource not found.' })
  async update(
    @Param() param: StakeAddressParam,
    @Body() updateAccountDto: UpdateAccountDto,
  ): Promise<ResponseDto> {
    await this.accountService.update(param.stakeAddress, updateAccountDto);

    return new ResponseDto(
      `Account ${param.stakeAddress} successfully updated.`,
    );
  }

  @Delete(':stakeAddress')
  @ApiOkResponse({
    description: 'Account successfully deleted.',
    type: ResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Resource not found.' })
  @ApiBadRequestResponse({ description: 'Bad Request. (validation errors)' })
  @ApiConflictResponse({ description: 'Account cannot be deleted.' })
  async remove(@Param() param: StakeAddressParam): Promise<ResponseDto> {
    await this.accountService.remove(param.stakeAddress);
    return new ResponseDto(
      `Account ${param.stakeAddress} successfully deleted.`,
    );
  }

  @Get(':stakeAddress/history')
  @ApiOkResponse({ type: [AccountHistoryDto] })
  @ApiBadRequestResponse({ description: 'Bad Request. (validation errors)' })
  async accountHistory(
    @Param() param: StakeAddressParam,
    @Query() query: HistoryQuery,
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
