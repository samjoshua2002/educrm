import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class FinalizeDecisionDto {
  @IsIn(['offer_made', 'waitlisted', 'rejected'])
  finalDecision: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalRemarks?: string;
}
