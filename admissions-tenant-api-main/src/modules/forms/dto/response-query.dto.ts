import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';
import { ResponseStatus } from '../entities/form-response.entity.js';

export class ResponseQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ResponseStatus)
  status?: ResponseStatus;
}
