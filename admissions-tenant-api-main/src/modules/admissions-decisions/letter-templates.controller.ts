import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { LetterTemplatesService, MERGE_FIELDS, formatLetterDate } from './letter-templates.service.js';
import { LetterPdfService } from './letter-pdf.service.js';
import { DecisionSupportService } from './decision-support.service.js';
import { LetterTemplateDto, PreviewLetterTemplateDto, UpdateLetterTemplateDto } from './dto/offer.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { STAFF_READ } from './admission-decisions.controller.js';
import { sendPdf } from './offer-letters.controller.js';

const TEMPLATE_WRITE = [Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER];

@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('organizations/:orgId/letter-templates')
export class LetterTemplatesController {
  constructor(
    private readonly templates: LetterTemplatesService,
    private readonly pdf: LetterPdfService,
    private readonly support: DecisionSupportService,
  ) {}

  @Get()
  @Roles(...STAFF_READ)
  @ResponseMessage('Letter templates fetched successfully')
  list(@Param('orgId') orgId: string, @Query('type') type?: string, @Query('status') status?: string) {
    return this.templates.list(orgId, type, status);
  }

  @Get('merge-fields')
  @Roles(...STAFF_READ)
  @ResponseMessage('Merge fields fetched successfully')
  mergeFields() {
    return MERGE_FIELDS;
  }

  @Get(':id')
  @Roles(...STAFF_READ)
  @ResponseMessage('Letter template fetched successfully')
  get(@Param('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.templates.get(orgId, id);
  }

  @Post()
  @Roles(...TEMPLATE_WRITE)
  @ResponseMessage('Letter template created')
  create(@Param('orgId') orgId: string, @Body() dto: LetterTemplateDto, @Request() req) {
    return this.templates.create(orgId, dto, req.user.sub);
  }

  @Patch(':id')
  @Roles(...TEMPLATE_WRITE)
  @ResponseMessage('Letter template saved')
  update(@Param('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLetterTemplateDto, @Request() req) {
    return this.templates.update(orgId, id, dto, req.user.sub);
  }

  @Delete(':id')
  @Roles(...TEMPLATE_WRITE)
  @ResponseMessage('Letter template deleted')
  remove(@Param('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.templates.remove(orgId, id);
  }

  // Values for a preview: a real application when given, otherwise the
  // merge field names in brackets so the layout can be checked.
  private async previewValues(orgId: string, applicationNo?: string) {
    const values: Record<string, unknown> = {};
    MERGE_FIELDS.forEach((f) => (values[f.key] = `[${f.key}]`));
    values.Date = formatLetterDate(new Date());
    values.Organization = await this.support.organizationName(orgId);
    if (applicationNo) {
      const app = await this.support.findApplication(orgId, applicationNo);
      values.Name = app.name;
      values.Program = app.program;
      values.Application_No = app.applicationNo;
    }
    return values;
  }

  @Post('preview')
  @Roles(...STAFF_READ)
  @ResponseMessage('Preview rendered')
  async preview(@Param('orgId') orgId: string, @Body() dto: PreviewLetterTemplateDto) {
    const values = await this.previewValues(orgId, dto.applicationNo);
    return { html: this.templates.render(dto.bodyHtml, values) };
  }

  @Post('preview-pdf')
  @Roles(...STAFF_READ)
  async previewPdf(@Param('orgId') orgId: string, @Body() dto: PreviewLetterTemplateDto, @Res() res: Response) {
    const values = await this.previewValues(orgId, dto.applicationNo);
    const html = this.templates.render(dto.bodyHtml, values);
    const buffer = await this.pdf.renderPdf(html, { title: 'Letter preview', organizationName: String(values.Organization || '') });
    sendPdf(res, buffer, 'Letter-Preview.pdf');
  }
}
