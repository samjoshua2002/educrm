import { PartialType } from '@nestjs/mapped-types';
import { CreateAcademicSessionDto } from './create-academic-session.dto.js';

export class UpdateAcademicSessionDto extends PartialType(CreateAcademicSessionDto) {}
