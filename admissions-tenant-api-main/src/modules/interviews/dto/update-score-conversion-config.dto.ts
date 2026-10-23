import { IsObject, IsOptional, IsNumber, Min } from 'class-validator';
import { ScoreConversionConfig } from '../entities/score-conversion-config.entity.js';

export class UpdateScoreConversionConfigDto {
  @IsOptional()
  @IsObject()
  bands?: ScoreConversionConfig['bands'];

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
}

