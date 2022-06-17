import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddressParam {
  @IsString()
  @IsNotEmpty()
  @Matches('^[a-f0-9]{114}$', 'i')
  @ApiProperty({
    title: 'Hex encoded byte address',
    pattern: '^[a-fA-F0-9]{114}$',
    example:
      '004e29ca7e64d4c26e63b33f252ee995693f4f102b8b7edf3e24a93f278f1a23ffeb256f28c076584f5448f1b9c057f2cfcd503ec40c334319',
  })
  address!: string;
}
