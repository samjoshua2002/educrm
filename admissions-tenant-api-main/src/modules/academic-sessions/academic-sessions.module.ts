import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicSessionsService } from './academic-sessions.service.js';
import { AcademicSessionsController } from './academic-sessions.controller.js';
import { AcademicSession } from './entities/academic-session.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([AcademicSession])],
  controllers: [AcademicSessionsController],
  providers: [AcademicSessionsService],
  exports: [AcademicSessionsService],
})
export class AcademicSessionsModule {}
