import {
  IsString,
  IsOptional,
  IsIn,
  IsUUID,
  IsBoolean,
  IsArray,
  IsInt,
  Min,
  Max,
  MaxLength,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { CALL_TYPES, CALL_STATUSES, CALL_OUTCOMES } from '../entities/call-log.entity.js';

export class CreateCallLogDto {
  @IsOptional() @IsUUID() applicationId?: string | null;
  @IsOptional() @IsUUID() leadId?: string | null;
  @IsOptional() @IsString() @MaxLength(255) applicantName?: string | null;
  /** Required when no applicant / lead is selected */
  @IsOptional() @IsString() @MaxLength(30) contactNumber?: string;
  @IsOptional() @IsString() @MaxLength(6) countryCode?: string;
  @IsOptional() @IsString() @MaxLength(255) programInterested?: string | null;

  @IsIn(CALL_TYPES as unknown as string[]) callType: string;
  /** ISO or wall-clock "YYYY-MM-DDTHH:mm" */
  @IsOptional() @IsString() callStartTime?: string | null;
  @IsOptional() @IsString() callEndTime?: string | null;
  @IsOptional() @IsInt() @Min(0) @Max(86400) @Type(() => Number) durationSeconds?: number;
  @IsOptional() @IsIn(CALL_STATUSES as unknown as string[]) callStatus?: string;
  @IsOptional() @IsString() timeZone?: string;

  @IsOptional() @IsUUID() agentUserId?: string | null;
  @IsOptional() @IsString() @MaxLength(255) agentName?: string | null;
  @IsOptional() @IsString() @MaxLength(120) department?: string | null;
  @IsOptional() @IsString() @MaxLength(120) extensionDeviceId?: string | null;

  @IsOptional() @IsString() recordingUrl?: string | null;
  @IsOptional() @IsString() transcription?: string | null;
  @IsOptional() @IsString() agentNotes?: string | null;
  @IsOptional() @IsIn([...CALL_OUTCOMES, null] as unknown as string[]) callOutcome?: string | null;
  @IsOptional() @IsString() followUpDate?: string | null;

  @IsOptional() @IsBoolean() autoSmsAfterMissedCall?: boolean;
  @IsOptional() @IsBoolean() autoCreateFollowUpTask?: boolean;
  @IsOptional() @IsBoolean() autoTagApplicant?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

export class UpdateCallLogDto extends PartialType(CreateCallLogDto) {}

export class ClickToCallDto {
  @IsOptional() @IsUUID() applicationId?: string;
  @IsOptional() @IsUUID() leadId?: string;
  /** Customer number when no applicant / lead is selected */
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() countryCode?: string;
  /** Override the agent's phone for this call */
  @IsOptional() @IsString() agentNumber?: string;
  @IsOptional() @IsBoolean() autoSmsAfterMissedCall?: boolean;
  @IsOptional() @IsBoolean() autoCreateFollowUpTask?: boolean;
  @IsOptional() @IsBoolean() autoTagApplicant?: boolean;
}

export class AgentLineDto {
  @IsUUID() userId: string;
  @IsOptional() @IsString() phone?: string | null;
  @IsOptional() @IsString() extension?: string | null;
  @IsOptional() @IsString() department?: string | null;
}

export class TagRuleDto {
  @IsString() @IsNotEmpty() keyword: string;
  @IsString() @IsNotEmpty() tag: string;
}

export class UpdateTelephonySettingsDto {
  @IsOptional() @IsIn(['exotel', 'twilio', 'none', null]) provider?: string | null;
  @IsOptional() @IsString() @MaxLength(6) defaultCountryCode?: string;
  @IsOptional() @IsBoolean() recordCalls?: boolean;
  @IsOptional() @IsString() inboundForwardNumber?: string | null;
  @IsOptional() @IsString() defaultDepartment?: string | null;

  @IsOptional() @IsString() exotelAccountSid?: string;
  @IsOptional() @IsString() exotelApiKey?: string;
  @IsOptional() @IsString() exotelApiToken?: string;
  @IsOptional() @IsString() exotelSubdomain?: string;
  @IsOptional() @IsString() exotelCallerId?: string;

  @IsOptional() @IsString() twilioAccountSid?: string;
  @IsOptional() @IsString() twilioAuthToken?: string;
  @IsOptional() @IsString() twilioCallerId?: string;

  @IsOptional() @IsBoolean() autoSmsAfterMissedCall?: boolean;
  @IsOptional() @IsString() missedCallSmsText?: string | null;
  @IsOptional() @IsBoolean() autoCreateFollowUpTask?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(60) @Type(() => Number) followUpDays?: number;
  @IsOptional() @IsBoolean() autoTagApplicant?: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TagRuleDto) tagRules?: TagRuleDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => AgentLineDto) agentLines?: AgentLineDto[];
  @IsOptional() @IsBoolean() regenerateWebhookToken?: boolean;
}
