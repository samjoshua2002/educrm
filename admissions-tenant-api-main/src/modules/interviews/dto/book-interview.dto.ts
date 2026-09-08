import { IsString, IsNotEmpty, IsIn, IsArray, IsOptional } from 'class-validator';

export class BookInterviewDto {
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @IsIn(['GD', 'PI'])
  interviewType: 'GD' | 'PI';

  @IsString()
  @IsNotEmpty()
  slotId: string;

  // Optional. The evaluation panel defaults to the slot's assigned
  // interviewer (set when the slot was created), so the scheduler no
  // longer needs to pick evaluators. Any ids passed here are merged in.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  panelUserIds?: string[];
}
