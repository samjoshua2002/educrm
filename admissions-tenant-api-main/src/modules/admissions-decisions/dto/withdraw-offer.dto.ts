import { IsOptional, IsString, MaxLength } from 'class-validator';

export class WithdrawOfferDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
