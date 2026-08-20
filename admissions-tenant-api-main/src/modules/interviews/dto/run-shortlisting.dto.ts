import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class RunShortlistingDto {
  @IsString()
  @IsNotEmpty()
  ruleId: string;

  // When false (default) the run returns a preview only; nothing is persisted.
  @IsOptional()
  @IsBoolean()
  commit?: boolean;
}
