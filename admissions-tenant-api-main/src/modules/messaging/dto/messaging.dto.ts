import {
  IsString,
  IsOptional,
  IsIn,
  IsUUID,
  IsBoolean,
  IsArray,
  ValidateNested,
  MaxLength,
  ArrayMaxSize,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMessagingSettingsDto {
  @IsOptional() @IsIn(['twilio', 'msg91', 'none', null]) smsProvider?: string | null;
  @IsOptional() @IsIn(['twilio', 'gupshup', 'none', null]) whatsappProvider?: string | null;
  @IsOptional() @IsString() @MaxLength(6) defaultCountryCode?: string;
  @IsOptional() @IsString() @MaxLength(64) defaultTimeZone?: string;
  @IsOptional() @IsBoolean() requireOptInForMarketing?: boolean;
  @IsOptional() @IsBoolean() requireOptInForAll?: boolean;

  @IsOptional() @IsString() twilioAccountSid?: string;
  @IsOptional() @IsString() twilioAuthToken?: string;
  @IsOptional() @IsString() twilioSmsFrom?: string;
  @IsOptional() @IsString() twilioMessagingServiceSid?: string;
  @IsOptional() @IsString() twilioWhatsappFrom?: string;

  @IsOptional() @IsString() gupshupApiKey?: string;
  @IsOptional() @IsString() gupshupSourceNumber?: string;
  @IsOptional() @IsString() gupshupAppName?: string;

  @IsOptional() @IsString() msg91AuthKey?: string;
  @IsOptional() @IsString() msg91SenderId?: string;
  @IsOptional() @IsString() msg91FlowId?: string;
  @IsOptional() @IsString() msg91DltEntityId?: string;

  @IsOptional() @IsBoolean() regenerateWebhookToken?: boolean;
}

export class SendMessageDto {
  @IsIn(['SMS', 'WhatsApp', 'sms', 'whatsapp']) channel: string;

  @IsOptional() @IsUUID() applicationId?: string;
  @IsOptional() @IsUUID() leadId?: string;

  /** Mobile number (used when no applicant / lead is selected, or to override) */
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() countryCode?: string;
  @IsOptional() @IsString() recipientName?: string;
  @IsOptional() @IsString() preferredLanguage?: string;

  @IsString() @IsNotEmpty() body: string;
  @IsOptional() @IsIn(['Reminder', 'OTP', 'Status', 'Alert', 'Marketing']) messageType?: string;
  @IsOptional() @IsString() templateId?: string;
  @IsOptional() @IsString() mediaUrl?: string;
  @IsOptional() @IsString() ctaLink?: string;

  @IsOptional() @IsString() triggerEvent?: string;
  /** ISO string or wall-clock "YYYY-MM-DDTHH:mm" interpreted in timeZone */
  @IsOptional() @IsString() scheduledAt?: string;
  @IsOptional() @IsString() timeZone?: string;
  @IsOptional() @IsIn(['High', 'Normal', 'Low']) priority?: string;
}

export class BulkRecipientDto {
  @IsOptional() @IsUUID() applicationId?: string;
  @IsOptional() @IsUUID() leadId?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() countryCode?: string;
  @IsOptional() @IsString() recipientName?: string;
}

export class SendBulkMessageDto {
  @IsIn(['SMS', 'WhatsApp', 'sms', 'whatsapp']) channel: string;

  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => BulkRecipientDto)
  recipients: BulkRecipientDto[];

  @IsString() @IsNotEmpty() body: string;
  @IsOptional() @IsIn(['Reminder', 'OTP', 'Status', 'Alert', 'Marketing']) messageType?: string;
  @IsOptional() @IsString() templateId?: string;
  @IsOptional() @IsString() mediaUrl?: string;
  @IsOptional() @IsString() ctaLink?: string;
  @IsOptional() @IsString() triggerEvent?: string;
  @IsOptional() @IsString() scheduledAt?: string;
  @IsOptional() @IsString() timeZone?: string;
  @IsOptional() @IsIn(['High', 'Normal', 'Low']) priority?: string;
}

export class SetConsentDto {
  @IsString() @IsNotEmpty() mobile: string;
  @IsOptional() @IsString() countryCode?: string;
  @IsIn(['SMS', 'WhatsApp']) channel: string;
  @IsIn(['Opted In', 'Opted Out']) status: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() preferredLanguage?: string;
  @IsOptional() @IsUUID() applicationId?: string;
  @IsOptional() @IsUUID() leadId?: string;
}

export class TestMessageDto {
  @IsIn(['SMS', 'WhatsApp']) channel: string;
  @IsString() @IsNotEmpty() to: string;
  @IsOptional() @IsString() countryCode?: string;
}
