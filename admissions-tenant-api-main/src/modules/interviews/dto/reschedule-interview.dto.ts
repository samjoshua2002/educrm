import { IsString, IsNotEmpty } from 'class-validator';

export class RescheduleInterviewDto {
  @IsString()
  @IsNotEmpty()
  newSlotId: string;
}
