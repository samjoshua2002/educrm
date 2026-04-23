import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';
import { FormStatus } from '../entities/form.entity.js';

export class FormQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(FormStatus)
  status?: FormStatus;
}
