import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { OfferLettersService } from './offer-letters.service.js';
import { GenerateOfferLetterDto, OfferListQueryDto, WithdrawOfferDto } from './dto/offer.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { STAFF_READ, STAFF_WRITE } from './admission-decisions.controller.js';

export function sendPdf(res: Response, buffer: Buffer, filename: string) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
  res.setHeader('Content-Length', String(buffer.length));
  res.setHeader('Cache-Control', 'private, no-store');
  res.end(buffer);
}

@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('organizations/:orgId/applications/:applicationNo/offer-letter')
export class OfferLettersController {
  constructor(private readonly offerLettersService: OfferLettersService) {}

  @Get()
  @Roles(...STAFF_READ)
  @ResponseMessage('Offer letter fetched successfully')
  getOfferLetter(@Param('orgId') orgId: string, @Param('applicationNo') applicationNo: string) {
    return this.offerLettersService.getOfferLetter(orgId, applicationNo);
  }

  @Get('history')
  @Roles(...STAFF_READ)
  @ResponseMessage('Offer letters fetched successfully')
  history(@Param('orgId') orgId: string, @Param('applicationNo') applicationNo: string) {
    return this.offerLettersService.getOfferHistory(orgId, applicationNo);
  }

  @Post('generate')
  @Roles(...STAFF_WRITE)
  @ResponseMessage('Offer letter generated')
  generateOfferLetter(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: GenerateOfferLetterDto,
    @Request() req,
  ) {
    return this.offerLettersService.generateOfferLetter(orgId, applicationNo, dto, req.user.sub);
  }

  @Post('send')
  @Roles(...STAFF_WRITE)
  @ResponseMessage('Offer letter sent to the candidate')
  sendOfferLetter(@Param('orgId') orgId: string, @Param('applicationNo') applicationNo: string, @Request() req) {
    return this.offerLettersService.sendOfferLetter(orgId, applicationNo, req.user.sub);
  }

  @Post('withdraw')
  @Roles(...STAFF_WRITE)
  @ResponseMessage('Offer letter withdrawn')
  withdrawOffer(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: WithdrawOfferDto,
    @Request() req,
  ) {
    return this.offerLettersService.withdrawOffer(orgId, applicationNo, req.user.sub, dto.reason);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('organizations/:orgId/offer-letters')
export class OrgOfferLettersController {
  constructor(private readonly offerLettersService: OfferLettersService) {}

  @Get()
  @Roles(...STAFF_READ)
  @ResponseMessage('Offer letters fetched successfully')
  list(@Param('orgId') orgId: string, @Query() query: OfferListQueryDto) {
    return this.offerLettersService.listOffers(orgId, query);
  }

  // Offer Letter PDF — authenticated download.
  @Get(':id/pdf')
  @Roles(...STAFF_READ)
  async download(@Param('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const { buffer, filename } = await this.offerLettersService.getPdf(orgId, id);
    sendPdf(res, buffer, filename);
  }

  // Replace the generated PDF with an uploaded one (Offer Letter PDF is a file field).
  @Post(':id/pdf')
  @Roles(...STAFF_WRITE)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ResponseMessage('Offer letter PDF uploaded')
  upload(
    @Param('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: any,
    @Request() req,
  ) {
    return this.offerLettersService.uploadPdf(orgId, id, file, req.user.sub);
  }
}
