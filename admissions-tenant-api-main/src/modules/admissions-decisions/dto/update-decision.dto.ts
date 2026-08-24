import { IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateDecisionDto {
  @IsOptional()
  @IsIn(['under_review', 'committee_review', 'final_approval', 'decision_released'])
  decisionStage?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  decisionCommittee?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalRemarks?: string;

  @IsOptional()
  @IsBoolean()
  applicantVisible?: boolean;
}
