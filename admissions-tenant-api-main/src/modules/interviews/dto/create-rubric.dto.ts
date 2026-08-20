import { IsString, IsNotEmpty, MaxLength, IsOptional, IsNumber, Min, IsBoolean, IsIn } from 'class-validator';

export class CreateRubricDto {
  @IsIn(['GD', 'PI'])
  interviewType: 'GD' | 'PI';

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  parameterName: string;

  @IsNumber()
  @Min(0)
  maxScore: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightagePercent?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
