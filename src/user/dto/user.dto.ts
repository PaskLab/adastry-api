import { ApiProperty } from '@nestjs/swagger';
import { CurrencyDto } from '../../spot/dto/currency.dto';

export class UserDto {
  constructor(props?: UserDto) {
    if (props) {
      this.id = props.id;
      this.username = props.username;
      this.email = props.email;
      this.name = props.name;
      this.currency = props.currency;
    }
  }
  @ApiProperty({
    title: 'User ID',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    title: 'Username',
    example: 'alice',
  })
  username!: string;

  @ApiProperty({
    title: 'User email',
    example: 'my-email@gmail.com',
  })
  email!: string;

  @ApiProperty({
    title: 'Full name',
    example: 'Alice',
  })
  name!: string;

  @ApiProperty({
    type: CurrencyDto,
  })
  currency!: string;
}
