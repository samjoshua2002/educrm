import { IsString, IsNotEmpty, IsOptional, IsArray, IsBoolean, IsUUID } from 'class-validator';

export class CreateEmailTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  channel?: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  footer?: string;

  @IsArray()
  @IsOptional()
  variables?: string[];

  @IsString()
  @IsOptional()
  status?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
