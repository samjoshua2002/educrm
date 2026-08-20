import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CompleteInterviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  outcome?: string;
}
