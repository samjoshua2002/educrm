import { IsString, IsNotEmpty, MaxLength, IsOptional, IsNumber, Min, IsIn } from 'class-validator';

export class CreateShortlistingRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  program: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  academicYear: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minGpa?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minTestScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minExperienceYears?: number;

  @IsNumber()
  @Min(0)
  academicWeightage: number;

  @IsNumber()
  @Min(0)
  testWeightage: number;

  @IsNumber()
  @Min(0)
  experienceWeightage: number;

  @IsNumber()
  @Min(0)
  cutoffScore: number;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}
