import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateCourseSessionDto } from './create-course-session.dto.js';

export class UpdateCourseSessionDto extends PartialType(
  OmitType(CreateCourseSessionDto, ['courseId', 'academicSessionId'] as const)
) {}
