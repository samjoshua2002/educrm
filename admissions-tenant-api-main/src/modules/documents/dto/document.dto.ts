import { IsIn, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { ALLOWED_DOCUMENT_MIME_TYPES, DOCUMENT_TYPES } from '../../applications/application-workflow.constants.js';

export class UploadDocumentDto {
  @IsIn(DOCUMENT_TYPES as unknown as string[], {
    message: `documentType must be one of: ${DOCUMENT_TYPES.join(', ')}`,
  })
  documentType: string;

  @IsString()
  @MaxLength(255)
  documentName: string;

  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['https', 'http'] })
  documentUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  storageKey?: string;

  @IsIn(Object.keys(ALLOWED_DOCUMENT_MIME_TYPES), { message: 'Only PDF, JPG and PNG files are allowed' })
  mimeType: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  fileSize: number;
}

export class VerifyDocumentDto {
  @IsIn(['approve', 'reject', 'request_reupload'])
  action: 'approve' | 'reject' | 'request_reupload';

  @ValidateIf((o) => o.action !== 'approve')
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
