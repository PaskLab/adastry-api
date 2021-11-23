import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  constructor(props?: UserDto) {
    if (props) {
      this.username = props.username;
      this.email = props.email;
      this.name = props.name;
      this.currency = props.currency;
    }
  }

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
    title: 'Preferred currency',
    example: 'USD',
  })
  currency!: string;
}
