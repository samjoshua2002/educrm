import { IsNumber, IsOptional, Min, IsString, MaxLength } from 'class-validator';

export class UpdateOrgSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  applicationFee?: number;

  // Phase 6b — Offer Acceptances. Default seat-booking fee applied when an
  // OfferAcceptance record is auto-created (see AcceptanceService.createAcceptanceRecord).
  @IsOptional()
  @IsNumber()
  @Min(0)
  seatBookingFee?: number;

  // Template for generated application numbers, e.g. "{BRANCH}/{YEAR}/{SEQ}".
  // See ApplicationsService.buildApplicationNo for supported tokens.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  applicationNumberFormat?: string;
}
