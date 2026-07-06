import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseSessionsService } from './course-sessions.service.js';
import { CourseSessionsController } from './course-sessions.controller.js';
import { CourseSession } from './entities/course-session.entity.js';
import { CoursesModule } from '../courses/courses.module.js';
import { AcademicSessionsModule } from '../academic-sessions/academic-sessions.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([CourseSession]),
    CoursesModule,
    AcademicSessionsModule,
  ],
  controllers: [CourseSessionsController],
  providers: [CourseSessionsService],
  exports: [CourseSessionsService],
})
export class CourseSessionsModule {}
