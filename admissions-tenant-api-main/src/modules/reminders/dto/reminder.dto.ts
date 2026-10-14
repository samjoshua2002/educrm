import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { REMINDER_CHANNELS, APPLICANT_RESPONSES } from '../entities/reminder.entity.js';

export class UpdateReminderRuleDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsIn(REMINDER_CHANNELS as unknown as string[], { each: true })
  channels?: string[];

  @IsOptional()
  @ValidateIf((o) => o.templateId !== null)
  @IsUUID()
  templateId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(720)
  firstReminderAfterHours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(720)
  frequencyHours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  maxAttempts?: number;

  @IsOptional()
  @IsBoolean()
  autoClose?: boolean;

  @IsOptional()
  @ValidateIf((o) => o.deadlineDate !== null)
  @IsDateString()
  deadlineDate?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(90)
  deadlineDaysBefore?: number;
}

export class ReminderPreferencesDto {
  @IsOptional()
  @IsBoolean()
  remindersOptIn?: boolean;

  @IsOptional()
  @IsArray()
  @IsIn(REMINDER_CHANNELS as unknown as string[], { each: true })
  optOutChannels?: string[];
}

export class CloseReminderDto {
  @IsOptional()
  @IsIn(APPLICANT_RESPONSES as unknown as string[])
  applicantResponse?: string;
}
