import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export const CAMPAIGN_SOURCE_TYPES = ['Paid Ads', 'Organic', 'Referral', 'Event', 'Portal'];
export const CAMPAIGN_STATUSES = ['Active', 'Paused', 'Completed'];

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  utmCampaign?: string | null;

  @IsIn(CAMPAIGN_SOURCE_TYPES)
  sourceType: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subSource?: string | null;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsIn(CAMPAIGN_STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {}

export class CampaignQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  sourceType?: string;
}

export class PerformanceQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  /** first = first-touch attribution (default), last = last-touch */
  @IsOptional()
  @IsIn(['first', 'last'])
  attribution?: 'first' | 'last';
}
