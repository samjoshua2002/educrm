import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { APPLICATION_SOURCES, DOCUMENT_TYPES, TRACKER_STAGES } from '../application-workflow.constants.js';

export class ChangeStageDto {
  @IsIn(TRACKER_STAGES as unknown as string[])
  stage: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  internalRemarks?: string;

  @IsOptional()
  @IsBoolean()
  applicantVisible?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  slaDays?: number;
}

export class BulkStageDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  applicationIds: string[];

  @IsIn(TRACKER_STAGES as unknown as string[])
  stage: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  internalRemarks?: string;

  @IsOptional()
  @IsBoolean()
  applicantVisible?: boolean;
}

export class BulkAssignDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  applicationIds: string[];

  @ValidateIf((o) => o.assignedCounselorId !== null)
  @IsUUID()
  assignedCounselorId: string | null;
}

export class UpdateApplicationMasterDto {
  @IsOptional()
  @ValidateIf((o) => o.assignedCounselorId !== null)
  @IsUUID()
  assignedCounselorId?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.applicationSource !== null)
  @IsIn(APPLICATION_SOURCES as unknown as string[])
  applicationSource?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  academicSession?: string;
}

export class UpdateWorkflowSettingsDto {
  @IsOptional()
  @IsObject()
  stageSlaDays?: Record<string, number>;

  @IsOptional()
  @IsArray()
  @IsIn(DOCUMENT_TYPES as unknown as string[], { each: true })
  requiredDocumentTypes?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25)
  maxDocumentSizeMb?: number;

  @IsOptional()
  @IsBoolean()
  notifyApplicantOnStageChange?: boolean;
}
