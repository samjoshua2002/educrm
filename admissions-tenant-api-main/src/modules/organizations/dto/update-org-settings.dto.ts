import { IsNumber, IsOptional, Min, IsString, MaxLength, IsBoolean, IsArray } from 'class-validator';

export class UpdateOrgSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  applicationFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  seatBookingFee?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  applicationNumberFormat?: string;

  @IsOptional()
  @IsBoolean()
  discountEnabled?: boolean;

  @IsOptional()
  @IsString()
  discountType?: string; // 'percentage' | 'fixed'

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  discountReason?: string;

  @IsOptional()
  @IsString()
  discountStartDate?: string;

  @IsOptional()
  @IsString()
  discountEndDate?: string;

  @IsOptional()
  @IsArray()
  coupons?: any[];
}
