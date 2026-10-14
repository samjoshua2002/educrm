import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';

export class GdSchemeParameterDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  key?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsNumber()
  @Min(0)
  maxMarks: number;
}

export class GdSchemeComponentDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  key?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  label: string;

  @IsOptional()
  @IsIn(['GD', 'PI', null])
  interviewType?: 'GD' | 'PI' | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxMarks?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  compositeWeight?: number;

  @IsOptional()
  @IsBoolean()
  includeInComposite?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GdSchemeParameterDto)
  parameters?: GdSchemeParameterDto[];
}

export class SaveGdSchemeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => GdSchemeComponentDto)
  components: GdSchemeComponentDto[];

  // Select this scheme right after saving it.
  @IsOptional()
  @IsBoolean()
  select?: boolean;
}

export class ComponentScoreItemDto {
  @IsString()
  @IsNotEmpty()
  componentKey: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rawScore?: number | null;

  @IsOptional()
  @IsObject()
  parameterScores?: Record<string, number>;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class SaveComponentScoresDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComponentScoreItemDto)
  components: ComponentScoreItemDto[];
}
