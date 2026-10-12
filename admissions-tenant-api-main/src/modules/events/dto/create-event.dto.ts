import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  targetAudience?: string[];

  @IsOptional()
  @IsString()
  targetCourseId?: string;

  @IsOptional()
  @IsArray()
  targetLeadStages?: string[];

  @IsOptional()
  @IsString()
  eventStartDate?: string;

  @IsOptional()
  @IsString()
  eventEndDate?: string;

  @IsOptional()
  @IsString()
  eventStartTime?: string;

  @IsOptional()
  @IsString()
  eventEndTime?: string;

  @IsOptional()
  @IsString()
  venueType?: string;

  @IsOptional()
  @IsString()
  venueLocation?: string;

  @IsOptional()
  @IsString()
  scheduledPublishDate?: string;

  @IsOptional()
  @IsString()
  scheduledPublishTime?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  posterUrl?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @IsOptional()
  @IsString()
  attachmentName?: string;

  @IsOptional()
  @IsString()
  attachmentType?: string;

  @IsOptional()
  @IsBoolean()
  sendInAppNotification?: boolean;

  @IsOptional()
  @IsBoolean()
  sendEmailBroadcast?: boolean;

  @IsOptional()
  @IsBoolean()
  sendWhatsapp?: boolean;

  @IsOptional()
  @IsString()
  emailTemplateId?: string;
}
