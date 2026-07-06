import { IsUUID, IsNotEmpty, IsOptional, IsInt, Min, IsNumber, IsBoolean } from 'class-validator';

export class CreateCourseSessionDto {
  @IsUUID()
  @IsNotEmpty()
  courseId: string;

  @IsUUID()
  @IsNotEmpty()
  academicSessionId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalSeats?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  feeAmount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
