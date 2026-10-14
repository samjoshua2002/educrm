import { IsObject, IsOptional, IsNumber, Min, IsIn } from 'class-validator';

export class UpdateScoreConversionConfigDto {
  @IsOptional()
  @IsObject()
  bands?: Record<string, Array<{ minPercent?: number; minPercentile?: number; minYears?: number; minMonths?: number; points: number }>>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discrepancyThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  qualifyingScore?: number;

  @IsOptional()
  resultsAnnounced?: boolean;

  @IsOptional()
  resultsDeclarationDate?: Date | string;

  @IsOptional()
  autoAnnounceResults?: boolean;

  @IsOptional()
  @IsIn(['best_overall', 'cat_split'])
  entranceScoringMode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  catWeight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otherTestWeight?: number;
}
