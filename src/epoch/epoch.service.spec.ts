import { Test, TestingModule } from '@nestjs/testing';
import { EpochService } from './epoch.service';

describe('EpochService', () => {
  let service: EpochService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EpochService],
    }).compile();

    service = module.get<EpochService>(EpochService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
