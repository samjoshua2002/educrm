import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MarkOnboardingDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  onboardingInfo?: string;
}
