import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateDecisionDto {
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  decisionCommittee?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  decisionCommitteeTeamIds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(9999)
  decisionScore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  internalRemarks?: string;

  @IsOptional()
  @IsBoolean()
  applicantVisible?: boolean;
}

export class AdvanceStageDto {
  @IsIn(['committee_review', 'final_approval'])
  decisionStage: string;
}

export class CommitteeReviewDto {
  @IsIn(['offer_made', 'waitlisted', 'rejected'])
  recommendation: 'offer_made' | 'waitlisted' | 'rejected';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(9999)
  score?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comments?: string;
}

// Approver action during Final Approval: approve with a final decision, or
// reject (send back to Committee Review).
export class FinalizeDecisionDto {
  @IsIn(['approved', 'rejected'])
  @IsOptional()
  approvalStatus?: 'approved' | 'rejected';

  @IsOptional()
  @IsIn(['offer_made', 'waitlisted', 'rejected'])
  finalDecision?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  internalRemarks?: string;
}

export class ReleaseDecisionDto {
  @IsOptional()
  @IsBoolean()
  applicantVisible?: boolean;

  @IsOptional()
  @IsBoolean()
  lock?: boolean;
}

export class UnlockDecisionDto {
  @IsString()
  @MaxLength(1000)
  reason: string;
}

export class BulkDecisionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  applicationNos: string[];

  @IsIn(['create', 'assign_committee', 'advance', 'finalize', 'release', 'publish'])
  action: string;

  @IsOptional()
  @IsIn(['committee_review', 'final_approval'])
  decisionStage?: string;

  @IsOptional()
  @IsIn(['offer_made', 'waitlisted', 'rejected'])
  finalDecision?: string;

  @IsOptional()
  @IsIn(['approved', 'rejected'])
  approvalStatus?: 'approved' | 'rejected';

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  decisionCommittee?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  decisionCommitteeTeamIds?: string[];

  @IsOptional()
  @IsBoolean()
  applicantVisible?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  internalRemarks?: string;
}

export class DecisionListQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsString()
  finalDecision?: string;

  @IsOptional()
  @IsString()
  program?: string;
}

export class CommitteeTeamDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  memberIds?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDecisionSettingsDto {
  @IsOptional()
  @IsIn(['auto', 'manual'])
  waitlistMovementMode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(365)
  offerValidityDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(365)
  acceptanceWindowDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  seatBookingFee?: number;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  approverUserIds?: string[];

  @IsOptional()
  @IsBoolean()
  autoSendOfferOnRelease?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  defaultOnboardingInfo?: string;
}
