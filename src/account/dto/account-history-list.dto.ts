import { ApiProperty } from '@nestjs/swagger';
import { ListAbstract } from './list.abstract';
import { AccountHistoryDto } from './account-history.dto';

export class AccountHistoryListDto extends ListAbstract {
  constructor(props?: AccountHistoryListDto) {
    super();
    if (props) {
      this.count = props.count;
      this.data = props.data;
    }
  }

  @ApiProperty({
    type: [AccountHistoryDto],
    nullable: true,
  })
  data!: AccountHistoryDto[];
}
