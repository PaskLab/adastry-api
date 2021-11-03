export class UserDto {
  constructor(props?: UserDto) {
    if (props) {
      this.id = props.id;
      this.email = props.email;
      this.name = props.name;
    }
  }
  id!: number;
  email!: string;
  name!: string;
}
