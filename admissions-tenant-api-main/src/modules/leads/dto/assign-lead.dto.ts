import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AssignLeadDto {
  @IsUUID()
  assignedTo: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
