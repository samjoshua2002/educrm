import { IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  applicationId: string;
}
