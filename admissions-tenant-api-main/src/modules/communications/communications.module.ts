import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationLog } from './entities/communication-log.entity.js';
import { CommunicationsService } from './communications.service.js';
import { CommunicationsController } from './communications.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([CommunicationLog])],
  controllers: [CommunicationsController],
  providers: [CommunicationsService],
  exports: [CommunicationsService],
})
export class CommunicationsModule {}
