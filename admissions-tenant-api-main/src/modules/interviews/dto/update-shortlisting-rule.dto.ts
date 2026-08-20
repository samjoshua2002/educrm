import { PartialType } from '@nestjs/mapped-types';
import { CreateShortlistingRuleDto } from './create-shortlisting-rule.dto.js';

export class UpdateShortlistingRuleDto extends PartialType(CreateShortlistingRuleDto) {}
