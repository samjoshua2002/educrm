import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateCommunicationLogDto {
  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsOptional()
  applicationNo?: string;

  @IsString()
  @IsOptional()
  applicantName?: string;

  @IsString()
  @IsOptional()
  recipientEmail?: string;

  @IsString()
  @IsOptional()
  recipientPhone?: string;

  @IsString()
  @IsOptional()
  channel?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsUUID()
  @IsOptional()
  templateId?: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  footer?: string;

  @IsString()
  @IsOptional()
  sender?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  messageId?: string;
}
