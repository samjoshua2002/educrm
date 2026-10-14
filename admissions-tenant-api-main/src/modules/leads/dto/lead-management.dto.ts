import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ENGAGEMENT_TYPES } from '../lead-scoring.service.js';
import { FOLLOW_UP_STATUSES } from '../entities/lead.entity.js';
import { SCORING_CATEGORIES } from '../entities/lead-scoring-rule.entity.js';
import { ROUTING_RULE_TYPES } from '../entities/lead-routing-rule.entity.js';

const OPERATORS = ['gte', 'lte', 'gt', 'lt', 'eq', 'neq', 'in', 'not_in', 'contains', 'exists', 'is_true'];

export class RecordEngagementDto {
  @IsIn(ENGAGEMENT_TYPES as unknown as string[])
  type: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  count?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateFollowUpStatusDto {
  @IsIn(FOLLOW_UP_STATUSES as unknown as string[])
  followUpStatus: string;

  @IsOptional()
  @IsString()
  nextFollowUpAt?: string;
}

export class MergeLeadsDto {
  @IsUUID()
  masterLeadId: string;

  @IsUUID()
  duplicateLeadId: string;

  /** field key → which record's value to keep */
  @IsOptional()
  @IsObject()
  choices?: Record<string, 'master' | 'duplicate'>;
}

export class ScoringRuleDto {
  @IsIn([...SCORING_CATEGORIES, 'Other'])
  category: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label: string;

  @IsString()
  @IsNotEmpty()
  attribute: string;

  @IsIn(OPERATORS)
  operator: string;

  @IsOptional()
  @IsString()
  value?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(-100)
  @Max(100)
  points: number;

  @IsOptional()
  @IsIn(['academic', 'engagement', 'profile'])
  scoreType?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpdateScoringRuleDto {
  @IsOptional()
  @IsIn([...SCORING_CATEGORIES, 'Other'])
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @IsOptional()
  @IsString()
  attribute?: string;

  @IsOptional()
  @IsIn(OPERATORS)
  operator?: string;

  @IsOptional()
  @IsString()
  value?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-100)
  @Max(100)
  points?: number;

  @IsOptional()
  @IsIn(['academic', 'engagement', 'profile'])
  scoreType?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class LeadSettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-1000)
  @Max(1000)
  hotThreshold?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-1000)
  @Max(1000)
  warmThreshold?: number;

  @IsOptional()
  @IsIn(['round_robin', 'load_based'])
  defaultDistribution?: 'round_robin' | 'load_based';

  @IsOptional()
  @IsIn(['lead_manager', 'counselor', 'org_admin'])
  defaultAssigneeRole?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(50)
  @Max(100)
  reentryBlockThreshold?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  duplicateFlagThreshold?: number;
}

export class RoutingRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsIn(ROUTING_RULE_TYPES as unknown as string[])
  ruleType: string;

  @IsOptional()
  @IsIn(['country', 'state', 'city', 'program', 'score'])
  field?: string;

  @IsOptional()
  @IsIn(['eq', 'in', 'neq', 'not_in', 'gte', 'lte'])
  operator?: string;

  @IsOptional()
  @IsString()
  value?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  assigneeIds?: string[];

  @IsOptional()
  @IsIn(['lead_manager', 'counselor', 'org_admin'])
  assigneeRole?: string | null;

  @IsOptional()
  @IsIn(['round_robin', 'load_based'])
  distribution?: 'round_robin' | 'load_based';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRoutingRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsIn(ROUTING_RULE_TYPES as unknown as string[])
  ruleType?: string;

  @IsOptional()
  @IsIn(['country', 'state', 'city', 'program', 'score'])
  field?: string;

  @IsOptional()
  @IsIn(['eq', 'in', 'neq', 'not_in', 'gte', 'lte'])
  operator?: string;

  @IsOptional()
  @IsString()
  value?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  assigneeIds?: string[];

  @IsOptional()
  @IsIn(['lead_manager', 'counselor', 'org_admin'])
  assigneeRole?: string | null;

  @IsOptional()
  @IsIn(['round_robin', 'load_based'])
  distribution?: 'round_robin' | 'load_based';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReorderRulesDto {
  @IsArray()
  @IsUUID('all', { each: true })
  ids: string[];
}
