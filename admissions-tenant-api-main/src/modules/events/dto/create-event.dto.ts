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

  /** 'all' | 'staff' | 'student' | 'lead' | 'applicant' | staff role ids */
  @IsOptional()
  @IsArray()
  targetAudience?: string[];

  @IsOptional()
  @IsString()
  targetCourseId?: string;

  /** Lead statuses (leads.status) */
  @IsOptional()
  @IsArray()
  targetLeadStages?: string[];

  /** Lead sources (leads.source) */
  @IsOptional()
  @IsArray()
  targetLeadSources?: string[];

  /** Application statuses (applications.form_status) */
  @IsOptional()
  @IsArray()
  targetApplicationStatuses?: string[];

  @IsOptional()
  @IsString()
  targetAcademicSession?: string;

  /** Branch ids (staff, leads and applicants of these branches) */
  @IsOptional()
  @IsArray()
  targetBranchIds?: string[];

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

  /** ISO timestamp of the scheduled publish moment (preferred over date + time) */
  @IsOptional()
  @IsString()
  scheduledPublishAt?: string;

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

  @IsOptional()
  @IsString()
  targetCourseName?: string;

  @IsOptional()
  @IsString()
  createdByName?: string;

  @IsOptional()
  @IsString()
  publishMode?: string;
}

/** Audience preview (same targeting fields as an announcement). */
export class AudiencePreviewDto {
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
  @IsArray()
  targetLeadSources?: string[];

  @IsOptional()
  @IsArray()
  targetApplicationStatuses?: string[];

  @IsOptional()
  @IsString()
  targetAcademicSession?: string;

  @IsOptional()
  @IsArray()
  targetBranchIds?: string[];
}
