import { IsString, IsNotEmpty, IsOptional, IsIn, IsDateString, IsInt, Min, MaxLength } from 'class-validator';

// Generates back-to-back slots for one interviewer on one day, e.g. every 30
// minutes between 10:00 and 17:00 — the recurring-pattern bulk-create from
// the plan (B1).
export class BulkCreateSlotsDto {
  @IsString()
  @IsNotEmpty()
  interviewerId: string;

  @IsIn(['GD', 'PI'])
  interviewType: 'GD' | 'PI';

  @IsDateString()
  slotDate: string;

  @IsDateString()
  dayStartTime: string;

  @IsDateString()
  dayEndTime: string;

  @IsInt()
  @Min(5)
  slotDurationMinutes: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsIn(['In-person', 'Virtual'])
  mode?: 'In-person' | 'Virtual';

  @IsOptional()
  @IsString()
  meetingLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timeZone?: string;
}
