import { IsString, IsNotEmpty, IsOptional, IsUUID, IsIn, IsArray } from 'class-validator';

export class CreateCommunicationLogDto {
  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @IsUUID()
  @IsOptional()
  applicationId?: string;

  @IsUUID()
  @IsOptional()
  leadId?: string;

  @IsString()
  @IsOptional()
  applicationNo?: string;

  @IsString()
  @IsOptional()
  applicantName?: string;

  @IsString()
  @IsOptional()
  recipientEmail?: string;

  @IsString()
  @IsOptional()
  recipientPhone?: string;

  @IsString()
  @IsOptional()
  channel?: string;

  @IsIn(['Inbound', 'Outbound', 'System Generated'])
  @IsOptional()
  direction?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsUUID()
  @IsOptional()
  templateId?: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  footer?: string;

  @IsArray()
  @IsOptional()
  attachments?: { name: string; url: string; type?: string }[];

  @IsString()
  @IsOptional()
  sender?: string;

  @IsString()
  @IsOptional()
  handledBy?: string;

  @IsUUID()
  @IsOptional()
  handledByUserId?: string;

  @IsString()
  @IsOptional()
  relatedRecordId?: string;

  @IsString()
  @IsOptional()
  relatedRecordType?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  failureReason?: string;

  @IsString()
  @IsOptional()
  messageId?: string;

  @IsString()
  @IsOptional()
  scheduledAt?: string;

  @IsString()
  @IsOptional()
  timeZone?: string;

  @IsString()
  @IsOptional()
  actionTaken?: string;

  @IsString()
  @IsOptional()
  nextFollowUpDate?: string;

  @IsUUID()
  @IsOptional()
  assignedStaffId?: string;

  @IsString()
  @IsOptional()
  assignedStaffName?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

/** Staff-entered interaction (e.g. inbound email, walk-in, note) for the timeline. */
export class CreateInteractionDto {
  @IsIn(['Email', 'SMS', 'WhatsApp', 'Call', 'System'])
  channel: string;

  @IsIn(['Inbound', 'Outbound', 'System Generated'])
  direction: string;

  @IsUUID() @IsOptional() applicationId?: string;
  @IsUUID() @IsOptional() leadId?: string;

  @IsString() @IsNotEmpty() subject: string;
  @IsString() @IsOptional() summary?: string;
  @IsString() @IsOptional() content?: string;
  @IsArray() @IsOptional() attachments?: { name: string; url: string }[];
  @IsString() @IsOptional() relatedRecordId?: string;
  @IsIn(['Sent', 'Read', 'Failed']) @IsOptional() deliveryStatus?: string;
  @IsString() @IsOptional() dateTime?: string;
  @IsString() @IsOptional() actionTaken?: string;
  @IsString() @IsOptional() nextFollowUpDate?: string;
  @IsUUID() @IsOptional() assignedStaffId?: string;
  @IsString() @IsOptional() remarks?: string;
}

export class UpdateInteractionDto {
  @IsString() @IsOptional() actionTaken?: string;
  /** ISO date; empty string clears */
  @IsString() @IsOptional() nextFollowUpDate?: string;
  /** empty string clears */
  @IsString() @IsOptional() assignedStaffId?: string;
  @IsString() @IsOptional() remarks?: string;
  @IsString() @IsOptional() summary?: string;
  @IsIn(['Sent', 'Read', 'Failed']) @IsOptional() deliveryStatus?: string;
}
