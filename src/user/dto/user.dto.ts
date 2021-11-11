export class UserDto {
  constructor(props?: UserDto) {
    if (props) {
      this.id = props.id;
      this.username = props.username;
      this.email = props.email;
      this.name = props.name;
    }
  }
  id!: number;
  username!: string;
  email!: string;
  name!: string;
}
