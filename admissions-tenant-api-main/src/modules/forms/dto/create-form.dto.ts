import { IsString, IsNotEmpty, IsOptional, IsUUID, IsArray, IsEnum } from 'class-validator';
import { FormStatus } from '../entities/form.entity.js';

export class CreateFormDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsOptional()
  campaignId?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsArray()
  @IsOptional()
  fields?: any[];

  @IsEnum(FormStatus)
  @IsOptional()
  status?: FormStatus;
}

