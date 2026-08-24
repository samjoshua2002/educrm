import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { RejectionReason } from '../entities/rejection.entity.js';

const REJECTION_REASONS = Object.values(RejectionReason);

export class UpdateRejectionDto {
  @IsOptional()
  @IsIn(REJECTION_REASONS)
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  detailedReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  alternateOptionsSuggested?: string;

  @IsOptional()
  @IsBoolean()
  eligibleForReapply?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nextIntake?: string;
}
