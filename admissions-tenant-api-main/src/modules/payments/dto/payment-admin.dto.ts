import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateGatewaySettingDto {
  @IsOptional() @IsBoolean() isEnabled?: boolean;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsIn(['test', 'live']) mode?: string;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @ValidateIf((o) => o.feeAmount !== null) @Type(() => Number) @IsNumber() @Min(0) feeAmount?: number | null;
  @IsOptional() @IsArray() @IsString({ each: true }) methods?: string[];
  @IsOptional() @IsObject() credentials?: Record<string, string>;
  @IsOptional() @IsString() @MaxLength(100) displayName?: string | null;
}

export class CheckoutDto {
  @IsString()
  applicationId: string;

  @IsOptional() @IsIn(['razorpay', 'stripe', 'payu', 'paytm']) gateway?: string;

  @IsOptional() @IsIn(['application_fee', 'seat_booking_fee']) purpose?: string;

  @IsOptional() @IsUUID() offerAcceptanceId?: string;

  /** Frontend page that shows the result (must be on an allowed host). */
  @IsOptional() @IsString() returnUrl?: string;
}

export class RefundDto {
  /** Omit for a full refund of the remaining amount. */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) amount?: number;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class UpdateReconciliationDto {
  @IsOptional() @IsIn(['Matched', 'Unmatched']) reconciliationStatus?: string;
  @IsOptional() @IsString() @MaxLength(2000) financeRemarks?: string;
}

export class RunReconciliationDto {
  @IsOptional() @IsString() dateFrom?: string;
  @IsOptional() @IsString() dateTo?: string;
  @IsOptional() @IsIn(['razorpay', 'stripe', 'payu', 'paytm']) gateway?: string;
}
