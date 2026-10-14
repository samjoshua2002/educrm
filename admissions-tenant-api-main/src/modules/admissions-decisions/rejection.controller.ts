import { Controller, Get, Patch, Post, Body, Param, UseGuards, Request, Res, ParseUUIDPipe } from '@nestjs/common';
import type { Response } from 'express';
import { RejectionService } from './rejection.service.js';
import { UpdateRejectionDto } from './dto/acceptance.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { STAFF_READ, STAFF_WRITE } from './admission-decisions.controller.js';
import { sendPdf } from './offer-letters.controller.js';

@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('organizations/:orgId/applications/:applicationNo/rejection')
export class RejectionController {
  constructor(private readonly rejectionService: RejectionService) {}

  @Get()
  @Roles(...STAFF_READ)
  @ResponseMessage('Rejection fetched successfully')
  getRejection(@Param('orgId') orgId: string, @Param('applicationNo') applicationNo: string) {
    return this.rejectionService.getRejection(orgId, applicationNo);
  }

  // Create (standalone rejection) or edit the rejection record.
  @Patch()
  @Roles(...STAFF_WRITE)
  @ResponseMessage('Rejection saved')
  updateRejection(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: UpdateRejectionDto,
    @Request() req,
  ) {
    return this.rejectionService.upsert(orgId, applicationNo, dto, req.user.sub);
  }

  // Generate the rejection letter from its template and email it (PDF attached).
  @Post('send-letter')
  @Roles(...STAFF_WRITE)
  @ResponseMessage('Rejection letter sent')
  sendLetter(@Param('orgId') orgId: string, @Param('applicationNo') applicationNo: string, @Request() req) {
    return this.rejectionService.sendLetter(orgId, applicationNo, req.user.sub);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('organizations/:orgId/rejections')
export class OrgRejectionsController {
  constructor(private readonly rejectionService: RejectionService) {}

  @Get()
  @Roles(...STAFF_READ)
  @ResponseMessage('Rejections fetched successfully')
  list(@Param('orgId') orgId: string) {
    return this.rejectionService.listRejections(orgId);
  }

  @Get(':id/pdf')
  @Roles(...STAFF_READ)
  async download(@Param('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const { buffer, filename } = await this.rejectionService.getPdf(orgId, id);
    sendPdf(res, buffer, filename);
  }
}
