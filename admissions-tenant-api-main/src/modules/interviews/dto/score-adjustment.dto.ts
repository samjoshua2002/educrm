import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

// Manual admin adjustment for the two composite-score components that have
// no automated source (see ScoringService.computeCompositeScore comment):
// achievementScore is a bonus, penaltyScore is a deduction. Both are stored
// on Application at admissions_tenant_api's decimal(3,2) precision, so the
// practical range is 0-9.99.
export class ScoreAdjustmentDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9.99)
  achievementScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9.99)
  penaltyScore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;
}
