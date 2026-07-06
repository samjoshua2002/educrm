import { IsString, IsNotEmpty, MaxLength, IsOptional, IsInt, Min, IsNumber, IsBoolean } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  duration?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMonths?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  totalFee?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalSeats?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
