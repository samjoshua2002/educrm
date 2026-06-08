import { validate } from 'class-validator';
import { CreateUserDto } from './src/modules/users/dto/create-user.dto';
import { Role } from './src/common/enums/roles.enum';

async function run() {
  const dto = new CreateUserDto();
  dto.name = "Test";
  dto.email = "test@example.com";
  dto.phone = undefined;
  dto.role = Role.ORG_ADMIN;
  dto.password = "initialPassword123";
  dto.branchId = "cf6bd430-b9cc-4e89-a2e6-a0f5a70377f0";

  const errors = await validate(dto);
  console.log(errors.map(e => Object.values(e.constraints || {})));
}
run();
