import { ApiProperty } from '@nestjs/swagger';

export class AccountCategoryDto {
  constructor(props?: AccountCategoryDto) {
    if (props) {
      this.name = props.name;
      this.slug = props.slug;
      this.accounts = props.accounts;
    }
  }

  @ApiProperty({
    title: 'Category name',
    example: 'My Category',
  })
  name!: string;

  @ApiProperty({
    title: 'Category Slug',
    example: 'my-category',
  })
  slug!: string;

  @ApiProperty({
    title: 'Accounts stake addresses',
    example: ['stake1ux9r7qjwtczc6g8qvfd2p4fntk30ffemghcwa8h7qm8vacsers3g8'],
  })
  accounts!: string[];
}
