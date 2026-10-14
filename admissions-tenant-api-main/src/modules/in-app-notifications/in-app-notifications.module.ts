import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InAppNotification } from './entities/in-app-notification.entity.js';
import { InAppNotificationsService } from './in-app-notifications.service.js';
import { InAppNotificationsController } from './in-app-notifications.controller.js';

/** Global so any module can inject InAppNotificationsService without importing this module. */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([InAppNotification])],
  controllers: [InAppNotificationsController],
  providers: [InAppNotificationsService],
  exports: [InAppNotificationsService],
})
export class InAppNotificationsModule {}
