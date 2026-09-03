import { IsOptional, IsString, MinLength } from 'class-validator';

export class SubmitApplicationDto {
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
