import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FormsService } from './forms.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

@Controller('form-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FormTemplatesController {
  constructor(private readonly formsService: FormsService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Form templates fetched successfully')
  findAll() {
    return this.formsService.findAllTemplates();
  }

  @Post('from-form/:formId/org/:orgId')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Form saved as template successfully')
  saveFromForm(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Param('orgId', ParseUUIDPipe) orgId: string,
  ) {
    return this.formsService.saveFormAsTemplate(formId, orgId);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Template deleted successfully')
  @HttpCode(HttpStatus.OK)
  deleteTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.formsService.deleteTemplate(id);
  }

  @Delete('from-form/:formId/org/:orgId')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Template removed successfully')
  @HttpCode(HttpStatus.OK)
  removeTemplateByFormId(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Param('orgId', ParseUUIDPipe) orgId: string,
  ) {
    return this.formsService.removeTemplateByFormId(formId, orgId);
  }
}


