import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateFormDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsUUID()
  @IsOptional()
  campaignId?: string;
}
