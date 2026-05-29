import { IsDateString, IsOptional, IsString } from 'class-validator';

export class AddLeadNoteDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  disposition?: string;

  @IsOptional()
  @IsDateString()
  nextFollowUpAt?: string;
}
