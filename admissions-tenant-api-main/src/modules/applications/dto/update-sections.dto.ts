import { IsString, IsOptional, IsUUID, IsArray, ValidateNested, IsBoolean, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePersonalDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() primaryMobile?: string;
  @IsString() @IsOptional() alternateMobile?: string;
  @IsString() @IsOptional() gender?: string;
  @IsDateString() @IsOptional() dateOfBirth?: string;
  @IsString() @IsOptional() religion?: string;
  @IsString() @IsOptional() nationality?: string;
  @IsString() @IsOptional() aadhaarNumber?: string;
  @IsString() @IsOptional() category?: string;
  @IsString() @IsOptional() maritalStatus?: string;
  @IsString() @IsOptional() spouseName?: string;
  @IsString() @IsOptional() spouseOccupation?: string;
}

export class UpdatePreferencesDto {
  @IsUUID() @IsOptional() preference1?: string;
  @IsUUID() @IsOptional() preference2?: string;
}

export class EducationRecordDto {
  @IsString() level: string;
  @IsString() @IsOptional() institution?: string;
  @IsString() @IsOptional() boardUniversity?: string;
  @IsString() @IsOptional() yearOfPassing?: string;
  @IsString() @IsOptional() percentageCgpa?: string;
  @IsString() @IsOptional() classObtained?: string;
  @IsString() @IsOptional() majorSubjects?: string;
  @IsBoolean() @IsOptional() isCompleted?: boolean;
}

export class UpdateEducationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationRecordDto)
  records: EducationRecordDto[];
}

export class EntranceTestRecordDto {
  @IsString() testName: string;
  @IsString() @IsOptional() monthYear?: string;
  @IsNumber() @IsOptional() compositeScore?: number;
  @IsNumber() @IsOptional() percentile?: number;
}

export class UpdateEntranceTestsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntranceTestRecordDto)
  records: EntranceTestRecordDto[];
}

export class ParentRecordDto {
  @IsString() relationship: string;
  @IsString() name: string;
  @IsNumber() @IsOptional() age?: number;
  @IsString() @IsOptional() education?: string;
  @IsString() @IsOptional() occupation?: string;
  @IsString() @IsOptional() organization?: string;
  @IsString() @IsOptional() designation?: string;
  @IsString() @IsOptional() officeAddress?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() email?: string;
  @IsString() @IsOptional() annualIncome?: string;
}

export class UpdateParentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParentRecordDto)
  records: ParentRecordDto[];
}

export class AddressRecordDto {
  @IsString() type: string;
  @IsString() addressLine1: string;
  @IsString() @IsOptional() addressLine2?: string;
  @IsString() @IsOptional() city?: string;
  @IsString() @IsOptional() district?: string;
  @IsString() @IsOptional() state?: string;
  @IsString() @IsOptional() pincode?: string;
  @IsString() @IsOptional() phone?: string;
}

export class UpdateAddressesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressRecordDto)
  records: AddressRecordDto[];
}

export class WorkExperienceRecordDto {
  @IsString() organization: string;
  @IsString() @IsOptional() designation?: string;
  @IsDateString() @IsOptional() fromDate?: string;
  @IsDateString() @IsOptional() toDate?: string;
  @IsString() @IsOptional() rolesResponsibilities?: string;
  @IsString() @IsOptional() grossSalary?: string;
}

export class UpdateWorkExperienceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkExperienceRecordDto)
  records: WorkExperienceRecordDto[];
}

export class ExtraCurricularRecordDto {
  @IsString() activity: string;
  @IsString() @IsOptional() level?: string;
  @IsString() @IsOptional() achievements?: string;
}

export class UpdateExtraCurricularsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraCurricularRecordDto)
  records: ExtraCurricularRecordDto[];
}

export class OtherQualificationRecordDto {
  @IsString() courseName: string;
  @IsString() @IsOptional() institution?: string;
  @IsString() @IsOptional() yearOfPassing?: string;
  @IsString() @IsOptional() gradeOrPercentage?: string;
}

export class UpdateOtherQualificationsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OtherQualificationRecordDto)
  records: OtherQualificationRecordDto[];
}

export class UpdateAdditionalInfoDto {
  @IsString() @IsOptional() inspirationEssay?: string;
  @IsString() @IsOptional() howDidYouKnow?: string;
  @IsBoolean() @IsOptional() hasMedicalCondition?: boolean;
  @IsString() @IsOptional() medicalConditionDetails?: string;
}

export class UpdateDeclarationDto {
  @IsBoolean() @IsOptional() declarationAccepted?: boolean;
  @IsString() @IsOptional() declarationApplicantName?: string;
  @IsString() @IsOptional() declarationParentName?: string;
  @IsDateString() @IsOptional() declarationDate?: string;
  @IsString() @IsOptional() declarationPlace?: string;
}

export class UpdatePaymentDto {
  @IsString() paymentStatus: string;
  @IsString() @IsOptional() paymentMode?: string;
  @IsNumber() @IsOptional() paymentAmount?: number;
  @IsDateString() @IsOptional() paymentDate?: string;
  @IsString() @IsOptional() paymentReference?: string;
}
