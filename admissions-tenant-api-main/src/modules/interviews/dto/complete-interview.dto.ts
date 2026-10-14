import { IsIn, IsOptional } from 'class-validator';
import { INTERVIEW_OUTCOMES } from '../constants/interview-picklists.js';

export class CompleteInterviewDto {
  // Interview_Outcome (Pick List)
  @IsOptional()
  @IsIn(INTERVIEW_OUTCOMES as unknown as string[])
  outcome?: string;
}
