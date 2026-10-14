import {
  IsString,
  IsOptional,
  IsIn,
  IsUUID,
  IsArray,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsNotEmpty,
  ValidateNested,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import {
  CAMPAIGN_TYPES,
  CAMPAIGN_OBJECTIVES,
  TARGET_AUDIENCES,
  SEGMENT_CRITERIA,
  CAMPAIGN_TRIGGER_EVENTS,
  CAMPAIGN_FREQUENCIES,
  STOP_CONDITIONS,
} from '../entities/email-campaign.entity.js';

export class CampaignAttachmentDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() url: string;
  @IsOptional() @IsString() type?: string;
}

export class CreateEmailCampaignDto {
  @IsString() @IsNotEmpty() @MaxLength(255) name: string;
  @IsOptional() @IsIn(CAMPAIGN_TYPES as unknown as string[]) campaignType?: string;
  @IsOptional() @IsIn(CAMPAIGN_OBJECTIVES as unknown as string[]) objective?: string;
  @IsOptional() @IsUUID() targetCourseId?: string | null;
  @IsOptional() @IsString() targetProgram?: string | null;
  @IsOptional() @IsString() @MaxLength(20) academicYear?: string | null;
  @IsOptional() @IsString() @MaxLength(50) intakeTerm?: string | null;
  @IsOptional() @IsArray() @IsIn(TARGET_AUDIENCES as unknown as string[], { each: true }) targetAudience?: string[];
  @IsOptional() @IsArray() @IsIn(SEGMENT_CRITERIA as unknown as string[], { each: true }) segmentCriteria?: string[];

  @IsOptional() @IsUUID() templateId?: string | null;
  @IsOptional() @IsString() @MaxLength(500) subject?: string;
  @IsOptional() @IsString() @MaxLength(255) preHeader?: string | null;
  @IsOptional() @IsString() htmlBody?: string;
  @IsOptional() @IsString() textBody?: string | null;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CampaignAttachmentDto) attachments?: CampaignAttachmentDto[];
  @IsOptional() @IsString() @MaxLength(50) language?: string;
  @IsOptional() @IsString() footerAddress?: string | null;
  @IsOptional() @IsString() footerText?: string | null;
  @IsOptional() @IsString() @MaxLength(150) senderName?: string | null;

  @IsOptional() @IsIn([...CAMPAIGN_TRIGGER_EVENTS, null] as unknown as string[]) triggerEvent?: string | null;
  /** ISO or wall-clock "YYYY-MM-DDTHH:mm" interpreted in timeZone */
  @IsOptional() @IsString() deadlineAt?: string | null;
  @IsOptional() @IsString() scheduledAt?: string | null;
  @IsOptional() @IsString() endAt?: string | null;
  @IsOptional() @IsIn(CAMPAIGN_FREQUENCIES as unknown as string[]) frequency?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) maxSendsPerRecipient?: number;
  @IsOptional() @IsString() @MaxLength(64) timeZone?: string;
  @IsOptional() @IsArray() @IsIn(STOP_CONDITIONS as unknown as string[], { each: true }) stopConditions?: string[];
}

export class UpdateEmailCampaignDto extends PartialType(CreateEmailCampaignDto) {}

export class CampaignStatusDto {
  @IsIn(['Active', 'Paused', 'Completed']) status: string;
}

export class TestCampaignDto {
  @IsEmail() to: string;
}

export class AddSuppressionDto {
  @IsEmail() email: string;
  @IsOptional() @IsIn(['Unsubscribed', 'Hard Bounce', 'Manual']) reason?: string;
  @IsOptional() @IsString() note?: string;
}

export class AudiencePreviewDto {
  @IsOptional() @IsUUID() targetCourseId?: string | null;
  @IsOptional() @IsString() academicYear?: string | null;
  @IsOptional() @IsString() intakeTerm?: string | null;
  @IsOptional() @IsArray() @IsIn(TARGET_AUDIENCES as unknown as string[], { each: true }) targetAudience?: string[];
  @IsOptional() @IsArray() @IsIn(SEGMENT_CRITERIA as unknown as string[], { each: true }) segmentCriteria?: string[];
  @IsOptional() @IsArray() @IsIn(STOP_CONDITIONS as unknown as string[], { each: true }) stopConditions?: string[];
}
