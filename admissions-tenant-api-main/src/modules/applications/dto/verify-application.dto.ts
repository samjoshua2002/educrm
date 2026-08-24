import { IsEnum, IsOptional, IsString } from 'class-validator';

export class VerifyApplicationDto {
  @IsEnum(['verified', 'rejected'], {
    message: 'status must be one of: verified, rejected',
  })
  status: 'verified' | 'rejected';

  @IsString()
  @IsOptional()
  remarks?: string;
}
