import { Injectable } from '@nestjs/common';
import { EpochDto } from './dto/epoch.dto';
import { UpdateEpochDto } from './dto/update-epoch.dto';

@Injectable()
export class EpochService {
  create(createEpochDto: EpochDto) {
    return 'This action adds a new epoch';
  }

  findAll() {
    return `This action returns all epoch`;
  }

  findOne(id: number) {
    return `This action returns a #${id} epoch`;
  }

  update(id: number, updateEpochDto: UpdateEpochDto) {
    return `This action updates a #${id} epoch`;
  }

  remove(id: number) {
    return `This action removes a #${id} epoch`;
  }
}
