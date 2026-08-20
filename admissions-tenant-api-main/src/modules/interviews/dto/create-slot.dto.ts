import { IsString, IsNotEmpty, IsOptional, IsIn, IsDateString, MaxLength } from 'class-validator';

export class CreateSlotDto {
  @IsString()
  @IsNotEmpty()
  interviewerId: string;

  @IsIn(['GD', 'PI'])
  interviewType: 'GD' | 'PI';

  @IsDateString()
  slotDate: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

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
