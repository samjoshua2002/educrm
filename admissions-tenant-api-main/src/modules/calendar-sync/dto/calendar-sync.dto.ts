import { IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class UpdateCalendarSettingsDto {
  @IsOptional()
  @IsBoolean()
  googleEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  googleClientId?: string;

  // Write-only; empty keeps the stored secret.
  @IsOptional()
  @IsString()
  googleClientSecret?: string;

  @IsOptional()
  @IsBoolean()
  microsoftEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  microsoftClientId?: string;

  @IsOptional()
  @IsString()
  microsoftClientSecret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  microsoftTenantId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  redirectUri?: string;

  @IsOptional()
  @IsBoolean()
  autoMeetingLink?: boolean;

  @IsOptional()
  @IsBoolean()
  inviteCandidate?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  availabilityDays?: number;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'workdayStart must be HH:MM' })
  workdayStart?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'workdayEnd must be HH:MM' })
  workdayEnd?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timeZone?: string;
}

export class ConnectCalendarDto {
  @IsIn(['Google Calendar', 'Outlook'])
  provider: 'Google Calendar' | 'Outlook';

  // Admins may create the link for another interviewer; default = self.
  @IsOptional()
  @IsString()
  interviewerId?: string;
}

export class UpdateCalendarSyncDto {
  @IsOptional()
  @IsString()
  availabilityWindow?: string;

  @IsOptional()
  @ValidateIf((o) => o.calendarEmail !== '')
  @IsEmail()
  calendarEmail?: string;
}
