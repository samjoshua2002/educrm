import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CloseLeadDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
