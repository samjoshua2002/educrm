import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { FormStatus } from '../entities/form.entity.js';

export class UpdateFormDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsArray()
  @IsOptional()
  fields?: any[];

  @IsEnum(FormStatus)
  @IsOptional()
  status?: FormStatus;
}
