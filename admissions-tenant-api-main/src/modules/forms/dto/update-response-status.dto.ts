import { IsEnum, IsNotEmpty } from 'class-validator';
import { ResponseStatus } from '../entities/form-response.entity.js';

export class UpdateResponseStatusDto {
  @IsEnum(ResponseStatus)
  @IsNotEmpty()
  status: ResponseStatus;
}
