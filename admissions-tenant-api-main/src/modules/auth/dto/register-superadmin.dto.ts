import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterSuperadminDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;
}
