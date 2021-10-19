import { Test, TestingModule } from '@nestjs/testing';
import { EpochController } from './epoch.controller';
import { EpochService } from './epoch.service';

describe('EpochController', () => {
  let controller: EpochController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EpochController],
      providers: [EpochService],
    }).compile();

    controller = module.get<EpochController>(EpochController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
