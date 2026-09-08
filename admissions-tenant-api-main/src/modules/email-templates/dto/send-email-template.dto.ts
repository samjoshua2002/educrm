import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendEmailTemplateDto {
  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsString()
  @IsOptional()
  senderName?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsString()
  @IsOptional()
  applicationNo?: string;

  @IsString()
  @IsOptional()
  applicantName?: string;

  @IsString()
  @IsOptional()
  channel?: string;
}
