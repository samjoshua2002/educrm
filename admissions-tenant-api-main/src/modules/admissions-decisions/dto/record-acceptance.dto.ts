import { IsBoolean } from 'class-validator';

export class RecordAcceptanceDto {
  @IsBoolean()
  accept: boolean;
}
