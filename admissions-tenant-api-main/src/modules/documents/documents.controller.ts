import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { DocumentsService } from './documents.service.js';
import { UploadDocumentDto, VerifyDocumentDto } from './dto/document.dto.js';

const STAFF = [Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR];
const VERIFIERS = [Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER];

/** Document Upload & Verification (applicant upload + admin verification). */
@Controller('organizations/:orgId')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('documents/requirements')
  @Roles(...STAFF, Role.STUDENT)
  @ResponseMessage('Document requirements fetched successfully')
  requirements(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.documentsService.requirements(orgId);
  }

  @Get('documents')
  @Roles(...STAFF)
  @ResponseMessage('Documents fetched successfully')
  queue(@Param('orgId', ParseUUIDPipe) orgId: string, @Query() q: any) {
    return this.documentsService.queue(orgId, q);
  }

  @Patch('documents/:documentId/verify')
  @Roles(...VERIFIERS)
  @ResponseMessage('Document verification updated')
  verify(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Req() req: any,
    @Body() dto: VerifyDocumentDto,
  ) {
    return this.documentsService.verify(orgId, documentId, req.user, dto);
  }

  @Get('application-documents/:applicationId')
  @Roles(...STAFF, Role.STUDENT)
  @ResponseMessage('Application documents fetched successfully')
  list(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('applicationId') applicationId: string,
    @Query('includeHistory') includeHistory: string,
    @Req() req: any,
  ) {
    return this.documentsService.list(orgId, decodeURIComponent(applicationId), req.user, includeHistory === 'true');
  }

  @Post('application-documents/:applicationId')
  @Roles(...STAFF, Role.STUDENT)
  @ResponseMessage('Document uploaded successfully')
  upload(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('applicationId') applicationId: string,
    @Req() req: any,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.documentsService.upload(orgId, decodeURIComponent(applicationId), req.user, dto);
  }

  @Get('application-documents/:applicationId/logs')
  @Roles(...STAFF, Role.STUDENT)
  @ResponseMessage('Verification log fetched successfully')
  logs(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('applicationId') applicationId: string, @Req() req: any) {
    return this.documentsService.logs(orgId, decodeURIComponent(applicationId), req.user);
  }
}
