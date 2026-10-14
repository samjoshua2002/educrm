import {
  Controller,
  Get,
  Patch,
  Param,
  ParseUUIDPipe,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { InAppNotificationsService, NotificationViewer } from './in-app-notifications.service.js';

/**
 * In-app notifications of the signed-in user (staff, students and superadmin).
 * Audience filtering happens in the service, so every role may call these.
 */
@Controller('in-app-notifications')
@UseGuards(JwtAuthGuard)
export class InAppNotificationsController {
  constructor(private readonly service: InAppNotificationsService) {}

  private viewer(req: any): NotificationViewer {
    return {
      sub: req.user?.sub,
      role: req.user?.role,
      organizationId: req.user?.organizationId ?? null,
    };
  }

  @Get()
  @ResponseMessage('Notifications fetched successfully')
  list(
    @Request() req: any,
    @Query('module') module?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listForUser(this.viewer(req), {
      module,
      severity,
      status,
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('unread-count')
  @ResponseMessage('Unread count fetched successfully')
  unreadCount(@Request() req: any) {
    return this.service.unreadCount(this.viewer(req));
  }

  @Get('summary')
  @ResponseMessage('Notification summary fetched successfully')
  async summary(@Request() req: any) {
    return { modules: await this.service.summary(this.viewer(req)) };
  }

  @Patch('read-all')
  @ResponseMessage('All notifications marked as read')
  markAllRead(@Request() req: any, @Query('module') module?: string) {
    return this.service.markAllRead(this.viewer(req), module);
  }

  @Patch(':id/read')
  @ResponseMessage('Notification marked as read')
  markRead(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.markRead(this.viewer(req), id);
  }

  @Patch(':id/unread')
  @ResponseMessage('Notification marked as unread')
  markUnread(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.markUnread(this.viewer(req), id);
  }
}
