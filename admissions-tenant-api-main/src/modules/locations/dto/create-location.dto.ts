import { IsString, IsNotEmpty, MaxLength, IsOptional, IsIn, IsBoolean } from 'class-validator';

export class CreateLocationDto {
  @IsIn(['Center', 'Interview'])
  type: 'Center' | 'Interview';

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  pin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currencySymbol?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
