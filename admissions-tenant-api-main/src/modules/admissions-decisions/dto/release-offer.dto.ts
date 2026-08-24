import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReleaseOfferDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  alternateProgramOffered?: string;
}
