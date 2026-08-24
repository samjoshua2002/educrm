import { IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class AddToWaitlistDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  waitlistRank?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;
}
