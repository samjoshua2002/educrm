import {
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
  IsObject,
  IsArray,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ApplicantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsString()
  altPhone?: string;
}

export class CreateApplicationDto {
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsUUID()
  formId?: string;

  @IsString()
  @IsOptional()
  program?: string;

  @IsUUID()
  @IsNotEmpty()
  courseId: string;

  @IsString()
  @IsNotEmpty()
  academicSession: string;

  @IsObject()
  @ValidateNested()
  @Type(() => ApplicantDto)
  applicant: ApplicantDto;

  @IsOptional()
  @IsObject()
  preferences?: any;

  @IsOptional()
  @IsObject()
  contactDetails?: any;

  @IsOptional()
  @IsArray()
  educationDetails?: any[];

  @IsOptional()
  @IsArray()
  entranceTests?: any[];

  @IsOptional()
  @IsObject()
  otherDetails?: any;
}
