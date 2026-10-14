import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationLog } from './entities/communication-log.entity.js';
import { CommunicationsService } from './communications.service.js';
import { CommunicationHistoryService } from './communication-history.service.js';
import { CommunicationsController, OrgCommunicationsController } from './communications.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([CommunicationLog])],
  controllers: [CommunicationsController, OrgCommunicationsController],
  providers: [CommunicationsService, CommunicationHistoryService],
  exports: [CommunicationsService, CommunicationHistoryService],
})
export class CommunicationsModule {}
