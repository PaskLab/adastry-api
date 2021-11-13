import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SpotService } from './spot.service';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { NotFoundErrorDto } from '../utils/dto/not-found-error.dto';
import { HistoryQuery } from '../utils/params/history.query';
import { SpotDto } from './dto/spot.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PreferredCodeQuery } from './params/preferred-code.query';

@ApiTags('Spot Price')
@Controller('spot')
export class SpotController {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly spotService: SpotService,
  ) {}

  @Get('last')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    type: SpotDto,
    description: 'Last epoch price for ADA.',
  })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  lastPrice(@Query() query: PreferredCodeQuery): Promise<SpotDto> {
    return this.spotService.getLastPrice(query.code);
  }

  @Get('history')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: [SpotDto], description: 'ADA price history' })
  priceHistory(
    @Query() code: PreferredCodeQuery,
    @Query() query: HistoryQuery,
  ): Promise<SpotDto[]> {
    return this.spotService.getPriceHistory({ ...query }, code.code);
  }
}
