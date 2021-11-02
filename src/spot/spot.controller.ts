import { Controller, Get, Query } from '@nestjs/common';
import { SpotService } from './spot.service';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { NotFoundErrorDto } from '../utils/dto/not-found-error.dto';
import { HistoryQuery } from '../utils/params/history.query';
import { SpotDto } from './dto/spot.dto';

@ApiTags('Spot Price')
@Controller('spot')
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
  lastPrice(): Promise<SpotDto> {
    return this.spotService.getLastPrice();
  }

  @Get('history')
  @ApiOkResponse({ type: [SpotDto], description: 'ADA price history' })
  priceHistory(@Query() query: HistoryQuery): Promise<SpotDto[]> {
    return this.spotService.getPriceHistory({ ...query });
  }
}
