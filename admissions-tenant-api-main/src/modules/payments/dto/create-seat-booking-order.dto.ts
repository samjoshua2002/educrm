import { IsUUID } from 'class-validator';

export class CreateSeatBookingOrderDto {
  @IsUUID()
  offerAcceptanceId: string;
}
