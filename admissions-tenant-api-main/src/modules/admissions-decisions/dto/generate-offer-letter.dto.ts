import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class GenerateOfferLetterDto {
  @IsIn(['regular', 'conditional', 'scholarship'])
  offerType: string;

  @IsDateString()
  offerValidTill: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  scholarshipAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  conditions?: string;
}
