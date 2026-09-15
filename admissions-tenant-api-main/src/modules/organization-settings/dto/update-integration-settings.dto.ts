import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class UpdateIntegrationSettingsDto {
  @IsString()
  @IsOptional()
  smtpHost?: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  smtpPort?: number;

  @IsString()
  @IsOptional()
  smtpUser?: string;

  @IsString()
  @IsOptional()
  smtpPass?: string;

  @IsString()
  @IsOptional()
  smtpFromEmail?: string;

  @IsString()
  @IsOptional()
  smtpFromName?: string;

  @IsString()
  @IsOptional()
  razorpayKeyId?: string;

  @IsString()
  @IsOptional()
  razorpayKeySecret?: string;

  @IsString()
  @IsOptional()
  razorpayWebhookSecret?: string;
}
