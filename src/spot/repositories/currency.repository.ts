import { EntityRepository, Repository } from 'typeorm';
import { Currency } from '../entities/currency.entity';

@EntityRepository(Currency)
export class CurrencyRepository extends Repository<Currency> {}
