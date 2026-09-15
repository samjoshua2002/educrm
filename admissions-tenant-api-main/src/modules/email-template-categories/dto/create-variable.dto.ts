import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CreateVariableDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  tag: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  sampleValue?: string;

  @IsString()
  @IsOptional()
  sourceField?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
