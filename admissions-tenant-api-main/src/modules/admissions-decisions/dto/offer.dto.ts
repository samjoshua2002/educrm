import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class GenerateOfferLetterDto {
  @IsIn(['regular', 'conditional', 'scholarship'])
  offerType: string;

  // Program Offered (Pick List of the organization's courses). Defaults to
  // the program the candidate applied for.
  @IsOptional()
  @IsString()
  @MaxLength(255)
  programOffered?: string;

  @IsOptional()
  @IsUUID()
  letterTemplateId?: string;

  @IsOptional()
  @IsDateString()
  offerValidTill?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  scholarshipAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  conditions?: string;

  // Send immediately after generating.
  @IsOptional()
  @IsBoolean()
  send?: boolean;
}

export class WithdrawOfferDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class OfferListQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class LetterTemplateDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsIn(['offer', 'rejection', 'waitlist'])
  type: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @IsString()
  @MaxLength(200000)
  bodyHtml: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateLetterTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsIn(['offer', 'rejection', 'waitlist'])
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200000)
  bodyHtml?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class PreviewLetterTemplateDto {
  @IsString()
  @MaxLength(200000)
  bodyHtml: string;

  @IsOptional()
  @IsString()
  applicationNo?: string;
}
