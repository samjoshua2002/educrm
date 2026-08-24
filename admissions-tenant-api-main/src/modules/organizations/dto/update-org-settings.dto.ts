import { IsNumber, IsOptional, Min } from 'class-validator';

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
}
