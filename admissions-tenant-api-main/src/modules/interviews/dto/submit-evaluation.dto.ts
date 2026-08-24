import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsIn,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class EvaluationScoreItemDto {
  @IsString()
  @IsNotEmpty()
  rubricId: string;

  @IsNumber()
  @Min(0)
  scoreGiven: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SubmitEvaluationDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => EvaluationScoreItemDto)
  scores: EvaluationScoreItemDto[];

  @IsOptional()
  @IsIn(['Strongly Recommend', 'Recommend', 'Neutral', 'Do Not Recommend'])
  overallRecommendation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  comments?: string;

  @IsOptional()
  @IsBoolean()
  submit?: boolean;
}
