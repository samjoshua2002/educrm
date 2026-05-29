import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class VerifyLeadDto {
  @IsString()
  @IsIn(['qualify', 'disqualify'])
  action: 'qualify' | 'disqualify';

  @ValidateIf((o) => o.action === 'disqualify')
  @IsString()
  @IsNotEmpty()
  reason?: string;

  @IsOptional()
  @IsUUID()
  duplicateOfLeadId?: string;
}
