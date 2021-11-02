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
import { ConflictErrorDto } from '../utils/dto/conflict-error.dto';
import { BadRequestErrorDto } from '../utils/dto/bad-request-error.dto';
import { NotFoundErrorDto } from '../utils/dto/not-found-error.dto';

@ApiTags('Account')
@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post()
  @ApiCreatedResponse({ type: ResponseDto })
  @ApiConflictResponse({ type: ConflictErrorDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
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
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  accountInfo(@Param() param: StakeAddressParam): Promise<AccountDto> {
    return this.accountService.getAccountInfo(param.stakeAddress);
  }

  @Patch(':stakeAddress')
  @ApiOkResponse({ type: ResponseDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
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
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  @ApiConflictResponse({ type: ConflictErrorDto })
  async remove(@Param() param: StakeAddressParam): Promise<ResponseDto> {
    await this.accountService.remove(param.stakeAddress);
    return new ResponseDto(
      `Account ${param.stakeAddress} successfully deleted.`,
    );
  }

  @Get(':stakeAddress/history')
  @ApiOkResponse({ type: [AccountHistoryDto] })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async accountHistory(
    @Param() param: StakeAddressParam,
    @Query() query: HistoryQuery,
  ): Promise<AccountHistoryDto[]> {
    return this.accountService.getAccountHistory({ ...param, ...query });
  }
}
