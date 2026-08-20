import { PartialType } from '@nestjs/mapped-types';
import { CreateRubricDto } from './create-rubric.dto.js';

export class UpdateRubricDto extends PartialType(CreateRubricDto) {}
