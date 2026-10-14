import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { CAPTURE_EVENT_TYPES } from '../entities/lead-capture-event.entity.js';

export class UpdateCaptureSettingsDto {
  @IsOptional()
  @IsObject()
  enabledChannels?: Record<string, boolean>;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  facebookVerifyToken?: string | null;

  @IsOptional()
  @IsString()
  facebookAppSecret?: string | null;

  @IsOptional()
  @IsString()
  facebookPageAccessToken?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  facebookPageId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  facebookFormIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(20)
  facebookGraphVersion?: string;

  @IsOptional()
  @IsString()
  linkedinClientSecret?: string | null;

  @IsOptional()
  @IsString()
  linkedinAccessToken?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  linkedinApiVersion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  chatbotMinMessages?: number;

  @IsOptional()
  @IsBoolean()
  chatbotRequireContact?: boolean;
}

export class AddPortalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

export class UpdatePortalDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RegenerateKeyDto {
  /** api | verify | portal */
  @IsIn(['api', 'verify', 'portal'])
  which: 'api' | 'verify' | 'portal';

  @IsOptional()
  @IsString()
  portalId?: string;
}

export class CreateCaptureEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsIn(CAPTURE_EVENT_TYPES)
  eventType: string;

  @IsOptional()
  @IsDateString()
  eventDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  venue?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsUUID()
  courseId?: string | null;

  @IsOptional()
  @IsUUID()
  campaignId?: string | null;

  @IsOptional()
  @IsUUID()
  announcementEventId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCaptureEventDto extends PartialType(CreateCaptureEventDto) {}

export class ImportCsvDto {
  /** CSV file content (UTF-8). Header row required. */
  @IsString()
  @IsNotEmpty()
  csv: string;

  /** Channel Source of the list */
  @IsIn(['Portal', 'Event', 'Web', 'Social', 'Chatbot'])
  channel: string;

  /** Portal name (e.g. Shiksha) or list name */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sourceName?: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsUUID()
  campaignId?: string;

  /** Optional explicit mapping: CSV header → lead field (firstName, email, …) */
  @IsOptional()
  @IsObject()
  fieldMapping?: Record<string, string>;
}
