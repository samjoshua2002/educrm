import { IsObject, IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateScoreConversionConfigDto {
  @IsOptional()
  @IsObject()
  bands?: Record<string, Array<{ minPercent?: number; minPercentile?: number; minYears?: number; points: number }>>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discrepancyThreshold?: number;
}
