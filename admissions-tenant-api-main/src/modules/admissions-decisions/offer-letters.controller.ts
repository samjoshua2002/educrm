import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { OfferLettersService } from './offer-letters.service.js';
import { GenerateOfferLetterDto } from './dto/generate-offer-letter.dto.js';
import { WithdrawOfferDto } from './dto/withdraw-offer.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations/:orgId/applications/:applicationNo/offer-letter')
export class OfferLettersController {
  constructor(private readonly offerLettersService: OfferLettersService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.EXAM_MANAGER, Role.COUNSELOR)
  getOfferLetter(@Param('orgId') orgId: string, @Param('applicationNo') applicationNo: string) {
    return this.offerLettersService.getOfferLetter(orgId, applicationNo);
  }

  @Post('generate')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  generateOfferLetter(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: GenerateOfferLetterDto,
    @Request() req,
  ) {
    return this.offerLettersService.generateOfferLetter(orgId, applicationNo, dto, req.user.sub);
  }

  @Post('send')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  sendOfferLetter(@Param('orgId') orgId: string, @Param('applicationNo') applicationNo: string, @Request() req) {
    return this.offerLettersService.sendOfferLetter(orgId, applicationNo, req.user.sub);
  }

  @Post('withdraw')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  withdrawOffer(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: WithdrawOfferDto,
    @Request() req,
  ) {
    return this.offerLettersService.withdrawOffer(orgId, applicationNo, req.user.sub, dto.reason);
  }
}
