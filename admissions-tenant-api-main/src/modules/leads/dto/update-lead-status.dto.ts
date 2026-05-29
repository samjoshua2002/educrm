import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateLeadStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
