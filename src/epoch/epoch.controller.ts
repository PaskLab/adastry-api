import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { EpochService } from './epoch.service';
import { EpochDto } from './dto/epoch.dto';
import { UpdateEpochDto } from './dto/update-epoch.dto';

@Controller('epoch')
export class EpochController {
  constructor(private readonly epochService: EpochService) {}

  // @Post()
  // create(@Body() createEpochDto: EpochDto) {
  //   return this.epochService.create(createEpochDto);
  // }
  //
  // @Get()
  // findAll() {
  //   return this.epochService.findAll();
  // }
  //
  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.epochService.findOne(+id);
  // }
  //
  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateEpochDto: UpdateEpochDto) {
  //   return this.epochService.update(+id, updateEpochDto);
  // }
  //
  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.epochService.remove(+id);
  // }
}
