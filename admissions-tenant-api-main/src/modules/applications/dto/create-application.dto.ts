import {
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
  IsObject,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ApplicantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  altPhone?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  religion?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  aadhaarNumber?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  photo?: string;
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

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  academicSession?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ApplicantDto)
  applicant?: ApplicantDto;

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
  @IsArray()
  parentDetails?: any[];

  @IsOptional()
  @IsArray()
  workExperiences?: any[];

  @IsOptional()
  @IsObject()
  otherDetails?: any;
}
