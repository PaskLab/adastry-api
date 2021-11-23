import { Test, TestingModule } from '@nestjs/testing';
import { UserAccountController } from '../user-account.controller';
import { AccountService } from '../account.service';

describe('AccountController', () => {
  let controller: UserAccountController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserAccountController],
      providers: [AccountService],
    }).compile();

    controller = module.get<UserAccountController>(UserAccountController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
