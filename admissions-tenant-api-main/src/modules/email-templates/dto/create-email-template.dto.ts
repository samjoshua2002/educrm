import { IsString, IsNotEmpty, IsOptional, IsArray, IsBoolean, IsUUID, IsIn } from 'class-validator';

export class CreateEmailTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  /** Lifecycle trigger category name (optional for non-email templates) */
  @IsString()
  @IsOptional()
  category?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  /** Reminder / Offer / Rejection / Interview / Fee */
  @IsIn(['Reminder', 'Offer', 'Rejection', 'Interview', 'Fee'])
  @IsOptional()
  templateCategory?: string;

  /** Template type: Email / SMS / WhatsApp / Call Script */
  @IsIn(['Email', 'SMS', 'WhatsApp', 'Call Script'])
  @IsOptional()
  channel?: string;

  /** Required for Email templates */
  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  header?: string;

  @IsString()
  @IsOptional()
  footer?: string;

  @IsString()
  @IsOptional()
  signature?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsArray()
  @IsOptional()
  variables?: string[];

  /** draft / approved / archived (legacy 'active' = approved) */
  @IsIn(['draft', 'approved', 'archived', 'active'])
  @IsOptional()
  status?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  editableByRoles?: string[];

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
