import { IsUUID, IsNotEmpty, IsOptional, IsInt, Min, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCourseSessionDto {
  @IsUUID()
  @IsNotEmpty()
  courseId: string;

  @IsUUID()
  @IsNotEmpty()
  academicSessionId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  totalSeats?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  feeAmount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
