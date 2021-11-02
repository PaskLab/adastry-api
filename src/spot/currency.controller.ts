import { Controller, Get, Param, Query } from '@nestjs/common';
import { SpotService } from './spot.service';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { CurrencyDto } from './dto/currency.dto';
import { CodeParam } from './params/code.param';
import { NotFoundErrorDto } from '../utils/dto/not-found-error.dto';
import { RateDto } from './dto/rate.dto';
import { HistoryQuery } from '../utils/params/history.query';

@ApiTags('Curreny')
@Controller('currency')
export class CurrencyController {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly spotService: SpotService,
  ) {}

  @Get()
  @ApiOkResponse({
    type: [CurrencyDto],
    description: 'Return supported Currencies',
  })
  currencyList(): Promise<CurrencyDto[]> {
    return this.spotService.getAllCurrencies();
  }

  @Get(':code')
  @ApiOkResponse({ type: CurrencyDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  currencyInfo(@Param() param: CodeParam): Promise<CurrencyDto> {
    return this.spotService.getCurrency(param.code);
  }

  @Get(':code/rate')
  @ApiOkResponse({
    type: RateDto,
    description: 'Last epoch rate for currency.',
  })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  rate(@Param() param: CodeParam): Promise<RateDto> {
    return this.spotService.getRate(param.code);
  }

  @Get(':code/rate-history')
  @ApiOkResponse({ type: [RateDto], description: 'Currency rate history' })
  rateHistory(
    @Param() param: CodeParam,
    @Query() query: HistoryQuery,
  ): Promise<RateDto[]> {
    return this.spotService.getRateHistory({ ...param, ...query });
  }
}
