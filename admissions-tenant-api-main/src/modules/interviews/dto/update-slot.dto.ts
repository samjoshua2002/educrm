import { IsString, IsOptional, IsIn, IsDateString, MaxLength } from 'class-validator';

// Partial edit of an existing interview slot. Every field is optional —
// only the keys present in the request body are changed. A booked slot
// cannot be edited (see SlotsService.update).
export class UpdateSlotDto {
  @IsOptional()
  @IsString()
  interviewerId?: string;

  @IsOptional()
  @IsIn(['GD', 'PI'])
  interviewType?: 'GD' | 'PI';

  @IsOptional()
  @IsDateString()
  slotDate?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

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
