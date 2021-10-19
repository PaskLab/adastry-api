import { Global, Module } from '@nestjs/common';
import { BlockfrostService } from './blockfrost.service';

@Global()
@Module({
  imports: [],
  providers: [BlockfrostService],
  exports: [BlockfrostService],
})
export class ApiModule {}
