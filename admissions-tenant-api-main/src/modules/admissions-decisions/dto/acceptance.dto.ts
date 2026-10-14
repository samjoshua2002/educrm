import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { RejectionReason } from '../entities/rejection.entity.js';

export class RecordAcceptanceDto {
  @IsBoolean()
  accept: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  declineReason?: string;
}

// Staff edits to the acceptance record.
export class UpdateAcceptanceDto {
  @IsOptional()
  @IsDateString()
  acceptanceDeadline?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  seatBookingFee?: number;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  feePaymentLink?: string;

  @IsOptional()
  @IsIn(['pending', 'paid', 'failed', 'waived'])
  feePaymentStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentReferenceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  onboardingInfo?: string;

  @IsOptional()
  @IsIn(['not_enrolled', 'pending', 'confirmed', 'cancelled'])
  enrollmentStatus?: string;
}

export class SendOnboardingDto {
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  onboardingInfo?: string;
}

export class UpdateWaitlistDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  waitlistRank?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  alternateProgramOffered?: string;

  @IsOptional()
  @IsIn(['offer_declined', 'offer_expired', 'offer_withdrawn', 'acceptance_expired', 'seat_added', 'manual_review'])
  movementTrigger?: string;

  @IsOptional()
  @IsDateString()
  lastReviewDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  remarks?: string;
}

export class ReleaseOfferDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  alternateProgramOffered?: string;

  @IsOptional()
  @IsIn(['offer_declined', 'offer_expired', 'offer_withdrawn', 'acceptance_expired', 'seat_added', 'manual_review'])
  movementTrigger?: string;
}

export class SeatAvailableDto {
  @IsString()
  @MaxLength(255)
  program: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seats?: number;
}

export class UpdateRejectionDto {
  @IsOptional()
  @IsIn(Object.values(RejectionReason))
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  detailedReason?: string;

  @IsOptional()
  @IsUUID()
  rejectionLetterTemplateId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  alternateOptionsSuggested?: string;

  @IsOptional()
  @IsBoolean()
  eligibleForReapply?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nextIntake?: string;
}
