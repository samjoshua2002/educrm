import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
} from '@nestjs/common';
import { FormsService } from './forms.service.js';
import { LeadIngestionService } from '../leads/lead-ingestion.service.js';
import { SubmitPublicFormDto } from '../leads/dto/submit-public-form.dto.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

@Controller('public/forms')
export class PublicFormsController {
  constructor(
    private readonly formsService: FormsService,
    private readonly ingestionService: LeadIngestionService,
  ) {}

  @Get(':slug')
  @ResponseMessage('Form configuration fetched successfully')
  async getFormBySlug(@Param('slug') slug: string) {
    return this.formsService.findBySlug(slug);
  }

  @Post(':slug/submit')
  @ResponseMessage('Form submitted successfully')
  async submit(
    @Param('slug') slug: string,
    @Body() dto: SubmitPublicFormDto,
    @Request() req: any,
  ) {
    const meta = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    };
    return this.ingestionService.submitPublicForm(slug, dto, meta);
  }
}
