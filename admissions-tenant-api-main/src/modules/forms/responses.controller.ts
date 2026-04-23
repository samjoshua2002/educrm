import {
  Controller,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { FormsService } from './forms.service.js';
import { UpdateResponseStatusDto } from './dto/update-response-status.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

@Controller('responses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResponsesController {
  constructor(private readonly formsService: FormsService) {}

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Response status updated successfully')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResponseStatusDto,
  ) {
    return this.formsService.updateResponseStatus(id, dto);
  }
}
