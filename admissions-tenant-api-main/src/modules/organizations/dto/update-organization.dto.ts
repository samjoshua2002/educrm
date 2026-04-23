import { PartialType } from '@nestjs/mapped-types';
import { CreateOrganizationDto } from './create-organization.dto.js';
import { IsEnum, IsOptional } from 'class-validator';
import { OrgStatus } from '../entities/organization.entity.js';

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {}
