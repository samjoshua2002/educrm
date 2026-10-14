import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationDocument } from './entities/application-document.entity.js';
import { DocumentVerificationLog } from './entities/document-verification-log.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { User } from '../users/entities/user.entity.js';
import { DocumentsService } from './documents.service.js';
import { DocumentsController } from './documents.controller.js';
import { ApplicationsModule } from '../applications/applications.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { RemindersModule } from '../reminders/reminders.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApplicationDocument, DocumentVerificationLog, Application, User]),
    ApplicationsModule,
    NotificationsModule,
    RemindersModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
