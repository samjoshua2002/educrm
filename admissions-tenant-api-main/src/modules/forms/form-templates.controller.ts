import {
  Controller,
  Get,
  UseGuards,
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
}
