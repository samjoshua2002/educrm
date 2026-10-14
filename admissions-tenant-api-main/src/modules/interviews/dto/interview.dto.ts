import { IsArray, IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { INTERVIEW_MODES, INTERVIEW_OUTCOMES, INTERVIEW_STATUSES, INTERVIEW_TYPES } from '../constants/interview-picklists.js';

// Creates an interview that has no slot yet (Interview_Status "Slot Available").
export class CreateInterviewDto {
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @IsIn(INTERVIEW_TYPES as unknown as string[])
  interviewType: 'GD' | 'PI';

  @IsOptional()
  @IsIn(INTERVIEW_MODES as unknown as string[])
  interviewMode?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  round?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedPanel?: string[];

  @IsOptional()
  @IsDateString()
  interviewDate?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsString()
  meetingLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;
}

export class UpdateInterviewDto {
  @IsOptional()
  @IsIn(INTERVIEW_MODES as unknown as string[])
  interviewMode?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  round?: number;

  @IsOptional()
  @IsIn(INTERVIEW_STATUSES as unknown as string[])
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedPanel?: string[];

  @IsOptional()
  @IsDateString()
  interviewDate?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsString()
  meetingLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsIn(INTERVIEW_OUTCOMES as unknown as string[])
  outcome?: string;
}
