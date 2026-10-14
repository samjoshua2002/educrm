import { IsString, IsNotEmpty, IsOptional, IsArray, IsUUID, IsIn, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

export class SendEmailTemplateDto {
  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsString()
  @IsOptional()
  senderName?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsString()
  @IsOptional()
  applicationNo?: string;

  @IsString()
  @IsOptional()
  applicantName?: string;

  @IsString()
  @IsOptional()
  channel?: string;

  @IsString()
  @IsOptional()
  header?: string;

  @IsString()
  @IsOptional()
  footer?: string;

  @IsString()
  @IsOptional()
  signature?: string;
}

export class AttachmentDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() url: string;
  @IsString() @IsOptional() type?: string;
}

export class ComposeRecipientDto {
  @IsUUID() @IsOptional() applicationId?: string;
  @IsUUID() @IsOptional() leadId?: string;
  @IsString() @IsOptional() email?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() countryCode?: string;
  @IsString() @IsOptional() name?: string;
}

/** Unified compose: Email / SMS / WhatsApp to one or many applicants / leads. */
export class ComposeCommunicationDto {
  @IsIn(['Email', 'SMS', 'WhatsApp'])
  channel: string;

  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => ComposeRecipientDto)
  recipients: ComposeRecipientDto[];

  @IsUUID() @IsOptional() templateId?: string;
  @IsString() @IsOptional() subject?: string;
  @IsString() @IsNotEmpty() body: string;
  @IsString() @IsOptional() header?: string;
  @IsString() @IsOptional() footer?: string;
  @IsString() @IsOptional() signature?: string;
  @IsString() @IsOptional() category?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  /** SMS / WhatsApp */
  @IsIn(['Reminder', 'OTP', 'Status', 'Alert', 'Marketing']) @IsOptional() messageType?: string;
  @IsString() @IsOptional() mediaUrl?: string;
  @IsString() @IsOptional() ctaLink?: string;
  @IsString() @IsOptional() triggerEvent?: string;
  @IsIn(['High', 'Normal', 'Low']) @IsOptional() priority?: string;

  /** Wall-clock "YYYY-MM-DDTHH:mm" (in timeZone) or ISO */
  @IsString() @IsOptional() scheduledAt?: string;
  @IsString() @IsOptional() timeZone?: string;
}
