import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { OrgStatus } from '../entities/organization.entity.js';

export class CreateOrganizationDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(255)
  slug: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsEnum(OrgStatus)
  status?: OrgStatus;

  @IsDateString()
  subscriptionStart: string;

  @IsDateString()
  subscriptionEnd: string;
}
