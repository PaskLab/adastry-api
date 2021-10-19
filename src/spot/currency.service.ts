import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Currency } from './entities/currency.entity';

@Injectable()
export class CurrencyService {
  constructor(
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
  ) {}

  create(createCurrencyDto) {
    return 'This action adds a new curreny';
  }

  findAll() {
    return `This action returns all spot`;
  }

  async findOne(code: string): Promise<Currency | undefined> {
    return this.currencyRepository.findOne(code);
  }

  update(id: number, updateCurrencyDto) {
    return `This action updates a #${id} spot`;
  }

  remove(id: number) {
    return `This action removes a #${id} spot`;
  }
}
