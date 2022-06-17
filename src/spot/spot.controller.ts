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
import { HistoryParam } from '../utils/params/history.param';
import { SpotDto, SpotListDto } from './dto/spot.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { PreferredCodeParam } from './params/preferred-code.param';

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
  lastPrice(@Query() query: PreferredCodeParam): Promise<SpotDto> {
    return this.spotService.getLastPrice(query.code);
  }

  @Get('history')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: SpotListDto, description: 'ADA price history' })
  priceHistory(
    @Query() code: PreferredCodeParam,
    @Query() query: HistoryParam,
  ): Promise<SpotListDto> {
    return this.spotService.getPriceHistory({ ...query }, code.code);
  }
}
