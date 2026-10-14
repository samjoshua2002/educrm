import {
  IsString,
  IsEmail,
  IsOptional,
  IsObject,
  IsIn,
  IsUUID,
  IsDateString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CHANNEL_SOURCES,
  CREATED_FROM_VALUES,
  FOLLOW_UP_STATUSES,
  SOURCE_TYPES,
} from '../entities/lead.entity.js';

export class CreateLeadDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  studentId?: string;

  @IsIn(CHANNEL_SOURCES as unknown as string[])
  @IsOptional()
  channelSource?: string;

  @IsString()
  @IsOptional()
  formName?: string;

  @IsUUID()
  @IsOptional()
  courseId?: string;

  @IsString()
  @IsOptional()
  programInterest?: string;

  @IsString()
  @IsOptional()
  intake?: string;

  @IsUUID()
  @IsOptional()
  intakeSessionId?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsIn(SOURCE_TYPES as unknown as string[])
  @IsOptional()
  sourceType?: string;

  @IsString()
  @IsOptional()
  subSource?: string;

  @IsString()
  @IsOptional()
  campaignName?: string;

  @IsUUID()
  @IsOptional()
  campaignId?: string;

  @IsIn(CREATED_FROM_VALUES as unknown as string[])
  @IsOptional()
  createdFrom?: string;

  @IsString()
  @IsOptional()
  utmSource?: string;

  @IsString()
  @IsOptional()
  utmMedium?: string;

  @IsString()
  @IsOptional()
  utmCampaign?: string;

  @IsString()
  @IsOptional()
  utmTerm?: string;

  @IsString()
  @IsOptional()
  utmContent?: string;

  @IsString()
  @IsOptional()
  submissionUrl?: string;

  @IsString()
  @IsOptional()
  referrerUrl?: string;

  @IsString()
  @IsOptional()
  testType?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10000)
  @IsOptional()
  testScore?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  gpa?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(60)
  @IsOptional()
  workExperienceYears?: number;

  @IsIn(FOLLOW_UP_STATUSES as unknown as string[])
  @IsOptional()
  followUpStatus?: string;

  @IsDateString()
  @IsOptional()
  nextFollowUpAt?: string;

  @IsString()
  @IsOptional()
  status?: string;

  /** Ignored — Lead Status (Hot/Warm/Cold) is computed by the scoring engine. Kept for older clients. */
  @IsString()
  @IsOptional()
  scoreBand?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  /** Optional reason when assignedTo changes through an update (kept in assignment history) */
  @IsString()
  @IsOptional()
  assignmentReason?: string;

  @IsObject()
  @IsOptional()
  rawPayload?: any;
}
