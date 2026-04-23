import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class SubmitPublicFormDto {
  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>; // fieldId → value

  @IsObject()
  @IsOptional()
  utmData?: Record<string, any>;

  @IsString()
  @IsOptional()
  source?: string;

  // Add honeypot field or captcha token if needed later
}
