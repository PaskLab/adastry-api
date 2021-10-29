import { Controller, Get, Param, Query } from '@nestjs/common';
import { SpotService } from './spot.service';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { NotFoundErrorDto } from '../utils/dto/not-found-error.dto';
import { CodeParam } from './params/code.param';
import { HistoryQuery } from '../utils/params/history.query';
import { SpotDto } from './dto/spot.dto';

@ApiTags('Spot Price')
@Controller('api/spot')
export class SpotController {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly spotService: SpotService,
  ) {}

  @Get('last')
  @ApiOkResponse({
    type: SpotDto,
    description: 'Last epoch price for ADA.',
  })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  rate(@Param() param: CodeParam): Promise<SpotDto> {
    return this.spotService.getLastPrice();
  }

  @Get('history')
  @ApiOkResponse({ type: [SpotDto], description: 'ADA price history' })
  rateHistory(@Query() query: HistoryQuery): Promise<SpotDto[]> {
    return this.spotService.getPriceHistory({ ...query });
  }
}
